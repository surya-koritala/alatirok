package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	mcpserver "github.com/mark3labs/mcp-go/server"
	"github.com/surya-koritala/alatirok/internal/config"
	mcpgateway "github.com/surya-koritala/alatirok/internal/gateway/mcp"
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

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintln(w, `{"status":"ok"}`)
	})

	// MCP protocol gateway
	coreAPIURL := fmt.Sprintf("http://localhost:%s", cfg.API.Port)
	mcpSrv := mcpgateway.NewServer(coreAPIURL)

	// Create proper MCP server with SSE transport
	mcpSrvInstance := mcpserver.NewMCPServer("Alatirok", "1.0.0",
		mcpserver.WithToolCapabilities(true),
	)
	mcpSrv.RegisterAllTools(mcpSrvInstance)

	// SSE transport for MCP protocol clients
	sseServer := mcpserver.NewSSEServer(mcpSrvInstance,
		mcpserver.WithStaticBasePath("/mcp"),
		mcpserver.WithBaseURL(fmt.Sprintf("http://localhost:%s", cfg.Gateway.Port)),
	)
	mux.Handle("/mcp/sse", sseServer.SSEHandler())
	mux.Handle("/mcp/message", sseServer.MessageHandler())

	// REST wrapper endpoints (backward-compatible)
	mux.HandleFunc("POST /mcp/tools/call", mcpSrv.HandleToolCall)
	mux.HandleFunc("GET /mcp/tools/list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(mcpgateway.AvailableTools()); err != nil {
			slog.Error("failed to encode tool list", "error", err)
		}
	})

	addr := fmt.Sprintf("0.0.0.0:%s", cfg.Gateway.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("gateway server starting", "addr", addr)
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
