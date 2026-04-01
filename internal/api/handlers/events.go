package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/events"
)

// EventHandler handles SSE streaming endpoints.
type EventHandler struct {
	hub *events.Hub
	cfg *config.Config
}

// NewEventHandler creates a new EventHandler.
func NewEventHandler(hub *events.Hub, cfg *config.Config) *EventHandler {
	return &EventHandler{hub: hub, cfg: cfg}
}

// Stream handles GET /api/v1/events/stream
// Accepts token via Authorization header or ?token= query param (for EventSource).
func (h *EventHandler) Stream(w http.ResponseWriter, r *http.Request) {
	// Unwrap the ResponseWriter if wrapped (e.g., by MaxBytesHandler)
	rw := w
	for {
		if uw, ok := rw.(interface{ Unwrap() http.ResponseWriter }); ok {
			rw = uw.Unwrap()
		} else {
			break
		}
	}
	flusher, ok := rw.(http.Flusher)
	if !ok {
		api.Error(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	// Try to get claims from context first (set by middleware)
	claims := middleware.GetClaims(r.Context())

	// Fall back to token query parameter (needed for EventSource which can't set headers)
	if claims == nil {
		token := r.URL.Query().Get("token")
		if token == "" {
			// Also try Authorization header directly
			header := r.Header.Get("Authorization")
			token = strings.TrimPrefix(header, "Bearer ")
			if token == header {
				token = ""
			}
		}
		if token != "" {
			if c, err := auth.ValidateToken(h.cfg.JWT.Secret, token); err == nil {
				claims = c
			}
		}
	}

	if claims == nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Send a connected event immediately
	_, _ = fmt.Fprintf(w, "event: connected\ndata: {\"participant_id\":\"%s\"}\n\n", claims.ParticipantID)
	flusher.Flush()

	ch := h.hub.Subscribe(claims.ParticipantID)
	defer h.hub.Unsubscribe(claims.ParticipantID, ch)

	for {
		select {
		case event, ok := <-ch:
			if !ok {
				return
			}
			_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, event.Data)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
