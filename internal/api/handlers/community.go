package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// CommunityHandler handles community endpoints.
type CommunityHandler struct {
	communities *repository.CommunityRepo
	cfg         *config.Config
}

// NewCommunityHandler creates a new CommunityHandler.
func NewCommunityHandler(communities *repository.CommunityRepo, cfg *config.Config) *CommunityHandler {
	return &CommunityHandler{
		communities: communities,
		cfg:         cfg,
	}
}

// Create handles POST /api/v1/communities.
func (h *CommunityHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req models.CreateCommunityRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Slug == "" {
		api.Error(w, http.StatusBadRequest, "name and slug are required")
		return
	}

	if err := api.ValidateSlug(req.Slug); err != nil {
		api.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Description != "" && len(req.Description) > 5000 {
		api.Error(w, http.StatusBadRequest, "description exceeds 5,000 character limit")
		return
	}

	community := &models.Community{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Rules:       req.Rules,
		AgentPolicy: req.AgentPolicy,
		CreatedBy:   claims.ParticipantID,
	}

	result, err := h.communities.Create(r.Context(), community)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			api.Error(w, http.StatusConflict, "community slug already exists")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to create community")
		return
	}

	api.JSON(w, http.StatusCreated, result)
}

// List handles GET /api/v1/communities.
func (h *CommunityHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	communities, err := h.communities.List(r.Context(), limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list communities")
		return
	}

	api.JSON(w, http.StatusOK, communities)
}

// GetBySlug handles GET /api/v1/communities/{slug}.
func (h *CommunityHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		api.Error(w, http.StatusBadRequest, "slug is required")
		return
	}

	community, err := h.communities.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusNotFound, "community not found")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to get community")
		return
	}

	api.JSON(w, http.StatusOK, community)
}

// Subscribe handles POST /api/v1/communities/{slug}/subscribe.
func (h *CommunityHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	slug := r.PathValue("slug")
	if slug == "" {
		api.Error(w, http.StatusBadRequest, "slug is required")
		return
	}

	community, err := h.communities.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusNotFound, "community not found")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to get community")
		return
	}

	if err := h.communities.Subscribe(r.Context(), community.ID, claims.ParticipantID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to subscribe")
		return
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "subscribed"})
}

// Unsubscribe handles DELETE /api/v1/communities/{slug}/subscribe.
func (h *CommunityHandler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	slug := r.PathValue("slug")
	if slug == "" {
		api.Error(w, http.StatusBadRequest, "slug is required")
		return
	}

	community, err := h.communities.GetBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusNotFound, "community not found")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to get community")
		return
	}

	if err := h.communities.Unsubscribe(r.Context(), community.ID, claims.ParticipantID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to unsubscribe")
		return
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "unsubscribed"})
}

// parseIntQuery parses an integer query parameter with a default value.
func parseIntQuery(r *http.Request, key string, defaultVal int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return n
}
