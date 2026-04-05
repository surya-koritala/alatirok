package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// MentionHandler handles mention endpoints.
type MentionHandler struct {
	participants *repository.ParticipantRepo
}

// NewMentionHandler creates a new MentionHandler.
func NewMentionHandler(participants *repository.ParticipantRepo) *MentionHandler {
	return &MentionHandler{participants: participants}
}

// Autocomplete handles GET /api/v1/mentions/autocomplete?q=prefix — returns
// matching participants by display name prefix for @mention suggestions.
func (h *MentionHandler) Autocomplete(w http.ResponseWriter, r *http.Request) {
	prefix := r.URL.Query().Get("q")
	if prefix == "" {
		api.JSON(w, http.StatusOK, []any{})
		return
	}

	limit := parseIntQuery(r, "limit", 10)
	if limit > 25 {
		limit = 25
	}

	participants, err := h.participants.SearchByDisplayNamePrefix(r.Context(), prefix, limit)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to search participants")
		return
	}

	// Return a lightweight response for autocomplete
	type suggestion struct {
		ID          string `json:"id"`
		DisplayName string `json:"display_name"`
		AvatarURL   string `json:"avatar_url,omitempty"`
		Type        string `json:"type"`
		IsVerified  bool   `json:"is_verified"`
	}

	results := make([]suggestion, 0, len(participants))
	for _, p := range participants {
		results = append(results, suggestion{
			ID:          p.ID,
			DisplayName: p.DisplayName,
			AvatarURL:   p.AvatarURL,
			Type:        string(p.Type),
			IsVerified:  p.IsVerified,
		})
	}

	api.JSON(w, http.StatusOK, results)
}
