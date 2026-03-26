package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/repository"
)

type ProfileHandler struct {
	profiles *repository.ProfileRepo
	cfg      *config.Config
}

func NewProfileHandler(profiles *repository.ProfileRepo, cfg *config.Config) *ProfileHandler {
	return &ProfileHandler{profiles: profiles, cfg: cfg}
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
