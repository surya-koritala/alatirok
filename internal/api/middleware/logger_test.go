package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLogger_RedactsTokenParam(t *testing.T) {
	var buf bytes.Buffer
	handler := slog.NewTextHandler(&buf, nil)
	slog.SetDefault(slog.New(handler))

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	logger := Logger(inner)

	// Request with token in query string
	req := httptest.NewRequest(http.MethodGet, "/api/v1/events/stream?token=eyJhbGciOiJIUzI1NiJ9.secret", nil)
	rec := httptest.NewRecorder()
	logger.ServeHTTP(rec, req)

	logged := buf.String()
	if strings.Contains(logged, "eyJhbGciOiJIUzI1NiJ9") {
		t.Errorf("JWT token was NOT redacted from logs: %s", logged)
	}
	if !strings.Contains(logged, "token=***") {
		t.Errorf("expected 'token=***' in logged path, got: %s", logged)
	}
}

func TestLogger_PreservesNonSensitiveQuery(t *testing.T) {
	var buf bytes.Buffer
	handler := slog.NewTextHandler(&buf, nil)
	slog.SetDefault(slog.New(handler))

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	logger := Logger(inner)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/search?q=hello&limit=10", nil)
	rec := httptest.NewRecorder()
	logger.ServeHTTP(rec, req)

	logged := buf.String()
	if !strings.Contains(logged, "q=hello") {
		t.Errorf("expected normal query params to be preserved in log, got: %s", logged)
	}
}

func TestLogger_NoQueryString(t *testing.T) {
	var buf bytes.Buffer
	handler := slog.NewTextHandler(&buf, nil)
	slog.SetDefault(slog.New(handler))

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	logger := Logger(inner)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/posts/123", nil)
	rec := httptest.NewRecorder()
	logger.ServeHTTP(rec, req)

	logged := buf.String()
	if !strings.Contains(logged, "/api/v1/posts/123") {
		t.Errorf("expected path in log, got: %s", logged)
	}
	if strings.Contains(logged, "?") {
		t.Errorf("unexpected query string in log for path-only request: %s", logged)
	}
}
