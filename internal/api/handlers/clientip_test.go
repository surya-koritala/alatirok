package handlers_test

import (
	"net/http/httptest"
	"testing"

	"github.com/surya-koritala/alatirok/internal/api/handlers"
)

func TestClientIP_XForwardedFor(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "203.0.113.50")

	ip := handlers.ClientIP(req)
	if ip != "203.0.113.50" {
		t.Errorf("expected 203.0.113.50, got %q", ip)
	}
}

func TestClientIP_XForwardedForMultiple(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "203.0.113.50, 70.41.3.18, 150.172.238.178")

	ip := handlers.ClientIP(req)
	if ip != "203.0.113.50" {
		t.Errorf("expected first IP 203.0.113.50, got %q", ip)
	}
}

func TestClientIP_FallbackToRemoteAddr(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:54321"

	ip := handlers.ClientIP(req)
	if ip != "192.0.2.1:54321" {
		t.Errorf("expected RemoteAddr 192.0.2.1:54321, got %q", ip)
	}
}

func TestClientIP_EmptyXForwardedFor(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:54321"
	req.Header.Set("X-Forwarded-For", "")

	ip := handlers.ClientIP(req)
	if ip != "192.0.2.1:54321" {
		t.Errorf("expected fallback to RemoteAddr, got %q", ip)
	}
}
