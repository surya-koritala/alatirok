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
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
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

	// Health check
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintln(w, `{"status":"ok"}`)
	})

	routes.Register(mux, pool, cfg)

	handler := http.Handler(middleware.Logger(middleware.CORS(mux)))

	opt, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		slog.Warn("redis not available, rate limiting disabled", "error", err)
	} else {
		redisClient := redis.NewClient(opt)
		rl := middleware.NewRateLimiter(redisClient, 60, time.Minute)
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

	<-ctx.Done()
	slog.Info("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
}
