package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// FollowHandler handles follow/unfollow endpoints.
type FollowHandler struct {
	follows *repository.FollowRepo
}

// NewFollowHandler creates a new FollowHandler.
func NewFollowHandler(follows *repository.FollowRepo) *FollowHandler {
	return &FollowHandler{follows: follows}
}

// Follow handles POST /api/v1/participants/{id}/follow.
func (h *FollowHandler) Follow(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	followedID := r.PathValue("id")
	if followedID == "" {
		api.Error(w, http.StatusBadRequest, "participant id is required")
		return
	}

	if followedID == claims.ParticipantID {
		api.Error(w, http.StatusBadRequest, "you cannot follow yourself")
		return
	}

	if err := h.follows.Follow(r.Context(), claims.ParticipantID, followedID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to follow")
		return
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "followed"})
}

// Unfollow handles DELETE /api/v1/participants/{id}/follow.
func (h *FollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	followedID := r.PathValue("id")
	if followedID == "" {
		api.Error(w, http.StatusBadRequest, "participant id is required")
		return
	}

	if err := h.follows.Unfollow(r.Context(), claims.ParticipantID, followedID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to unfollow")
		return
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "unfollowed"})
}

// IsFollowing handles GET /api/v1/participants/{id}/follow — checks if the
// authenticated user is following the given participant.
func (h *FollowHandler) IsFollowing(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	followedID := r.PathValue("id")
	if followedID == "" {
		api.Error(w, http.StatusBadRequest, "participant id is required")
		return
	}

	following, err := h.follows.IsFollowing(r.Context(), claims.ParticipantID, followedID)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to check follow status")
		return
	}

	api.JSON(w, http.StatusOK, map[string]bool{"following": following})
}

// ListFollowing handles GET /api/v1/participants/{id}/following — returns
// participants that the given participant is following.
func (h *FollowHandler) ListFollowing(w http.ResponseWriter, r *http.Request) {
	participantID := r.PathValue("id")
	if participantID == "" {
		api.Error(w, http.StatusBadRequest, "participant id is required")
		return
	}

	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	follows, total, err := h.follows.ListFollowing(r.Context(), participantID, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list following")
		return
	}

	api.JSON(w, http.StatusOK, map[string]any{
		"data":  follows,
		"total": total,
	})
}

// ListFollowers handles GET /api/v1/participants/{id}/followers — returns
// participants that follow the given participant.
func (h *FollowHandler) ListFollowers(w http.ResponseWriter, r *http.Request) {
	participantID := r.PathValue("id")
	if participantID == "" {
		api.Error(w, http.StatusBadRequest, "participant id is required")
		return
	}

	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	followers, total, err := h.follows.ListFollowers(r.Context(), participantID, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list followers")
		return
	}

	api.JSON(w, http.StatusOK, map[string]any{
		"data":  followers,
		"total": total,
	})
}
