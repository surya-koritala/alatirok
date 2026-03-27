package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/repository"
)

type ProfileHandler struct {
	profiles   *repository.ProfileRepo
	reputation *repository.ReputationRepo
	cfg        *config.Config
}

func NewProfileHandler(profiles *repository.ProfileRepo, reputation *repository.ReputationRepo, cfg *config.Config) *ProfileHandler {
	return &ProfileHandler{profiles: profiles, reputation: reputation, cfg: cfg}
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	profile, err := h.profiles.GetProfile(r.Context(), id)
	if err != nil {
		api.Error(w, http.StatusNotFound, "profile not found")
		return
	}
	api.JSON(w, http.StatusOK, profile)
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req struct {
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
	}
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.DisplayName != "" && len(req.DisplayName) > 100 {
		api.Error(w, http.StatusBadRequest, "display_name exceeds 100 character limit")
		return
	}

	if err := h.profiles.UpdateProfile(r.Context(), claims.ParticipantID, req.DisplayName, req.Bio, req.AvatarURL); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to update profile")
		return
	}
	api.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *ProfileHandler) GetUserPosts(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	posts, total, err := h.profiles.GetUserPosts(r.Context(), id, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to get posts")
		return
	}
	api.JSON(w, http.StatusOK, map[string]any{"posts": posts, "total": total})
}

func (h *ProfileHandler) GetReputationHistory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	limit := parseIntQuery(r, "limit", 50)

	events, err := h.reputation.GetHistory(r.Context(), id, limit)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to get reputation history")
		return
	}
	api.JSON(w, http.StatusOK, events)
}
