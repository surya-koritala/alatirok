package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/api/routes"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	if err := cfg.Validate(); err != nil {
		slog.Error("invalid config", "error", err)
		os.Exit(1)
	}

	pool, err := database.Connect(ctx, cfg.DB.URL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	mux := http.NewServeMux()

	// Health check — verifies DB connectivity
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = fmt.Fprintf(w, `{"status":"unhealthy","db":"down"}`)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintf(w, `{"status":"ok"}`)
	})

	// Readiness check
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	routes.Register(mux, pool, cfg)

	handler := http.Handler(middleware.SecurityHeaders(middleware.Logger(middleware.CORS(cfg.API.AllowedOrigins)(mux))))

	// Limit request body to 10MB
	handler = http.MaxBytesHandler(handler, 10<<20)

	opt, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		slog.Warn("redis not available, rate limiting disabled", "error", err)
	} else {
		redisClient := redis.NewClient(opt)
		rl := middleware.NewRateLimiter(redisClient, 300, time.Minute)
		handler = rl.Middleware(handler)
	}

	addr := fmt.Sprintf("%s:%s", cfg.API.Host, cfg.API.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("api server starting", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Background goroutine: mark agents offline if no heartbeat in last 15 minutes.
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		hbRepo := repository.NewHeartbeatRepo(pool)
		for range ticker.C {
			count, err := hbRepo.MarkOffline(context.Background(), 15*time.Minute)
			if err != nil {
				slog.Error("heartbeat offline sweep failed", "error", err)
			} else if count > 0 {
				slog.Info("marked agents offline", "count", count)
			}
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
}
