package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/cache"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// CommunityHandler handles community endpoints.
type CommunityHandler struct {
	communities *repository.CommunityRepo
	moderation  *repository.ModerationRepo
	cfg         *config.Config
	cache       *cache.RedisCache
}

// WithModeration sets the moderation repo for authorization checks.
func (h *CommunityHandler) WithModeration(moderation *repository.ModerationRepo) {
	h.moderation = moderation
}

// NewCommunityHandler creates a new CommunityHandler.
func NewCommunityHandler(communities *repository.CommunityRepo, cfg *config.Config) *CommunityHandler {
	return &CommunityHandler{
		communities: communities,
		cfg:         cfg,
	}
}

// WithCache sets the Redis cache for community list responses.
func (h *CommunityHandler) WithCache(c *cache.RedisCache) {
	h.cache = c
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

	// Invalidate community list cache
	if h.cache != nil {
		_ = h.cache.DeletePattern(r.Context(), "community:*")
	}

	api.JSON(w, http.StatusCreated, result)
}

// List handles GET /api/v1/communities.
func (h *CommunityHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	cacheKey := fmt.Sprintf("community:list:%d:%d", limit, offset)
	if h.cache != nil {
		if cached, _ := h.cache.Get(r.Context(), cacheKey); cached != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cached)
			return
		}
	}

	communities, err := h.communities.List(r.Context(), limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list communities")
		return
	}

	// Store in Redis cache
	if h.cache != nil {
		if data, err := json.Marshal(communities); err == nil {
			_ = h.cache.Set(r.Context(), cacheKey, data, 30*time.Second)
		}
	}

	w.Header().Set("X-Cache", "MISS")
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

// Delete handles DELETE /api/v1/communities/{slug}.
// Only the community creator can delete a community.
func (h *CommunityHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if community.CreatedBy != claims.ParticipantID {
		api.Error(w, http.StatusForbidden, "only the creator can delete a community")
		return
	}

	if err := h.communities.Delete(r.Context(), community.ID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to delete community")
		return
	}

	// Invalidate community and feed caches
	if h.cache != nil {
		_ = h.cache.DeletePattern(r.Context(), "community:*")
		_ = h.cache.DeletePattern(r.Context(), "feed:*")
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
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

// IsSubscribed handles GET /api/v1/communities/{slug}/subscribed.
func (h *CommunityHandler) IsSubscribed(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.JSON(w, http.StatusOK, map[string]bool{"subscribed": false})
		return
	}
	community, err := h.communities.GetBySlug(r.Context(), slug)
	if err != nil {
		api.JSON(w, http.StatusOK, map[string]bool{"subscribed": false})
		return
	}
	subscribed, _ := h.communities.IsSubscribed(r.Context(), community.ID, claims.ParticipantID)
	api.JSON(w, http.StatusOK, map[string]bool{"subscribed": subscribed})
}

// UpdateTemplate handles PUT /api/v1/communities/{slug}/template.
// Allows the community creator or an admin moderator to set/update the post template.
func (h *CommunityHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
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

	// Authorization: only creator or admin moderator
	isCreator := community.CreatedBy == claims.ParticipantID
	if !isCreator {
		isAdmin := false
		if h.moderation != nil {
			isMod, _ := h.moderation.IsModerator(r.Context(), community.ID, claims.ParticipantID)
			if isMod {
				mods, _ := h.moderation.ListModerators(r.Context(), community.ID)
				for _, m := range mods {
					if m["id"] == claims.ParticipantID && m["role"] == "admin" {
						isAdmin = true
						break
					}
				}
			}
		}
		if !isAdmin {
			api.Error(w, http.StatusForbidden, "only the community creator or admin can update the post template")
			return
		}
	}

	var req struct {
		PostTemplate *json.RawMessage `json:"post_template"`
	}
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate the template structure if provided (non-null)
	if req.PostTemplate != nil && len(*req.PostTemplate) > 0 && string(*req.PostTemplate) != "null" {
		var tmpl struct {
			Sections []struct {
				Name     string `json:"name"`
				Required bool   `json:"required"`
				Hint     string `json:"hint"`
				MaxChars int    `json:"max_chars"`
			} `json:"sections"`
		}
		if err := json.Unmarshal(*req.PostTemplate, &tmpl); err != nil {
			api.Error(w, http.StatusBadRequest, "invalid post_template JSON structure")
			return
		}
		if len(tmpl.Sections) == 0 {
			api.Error(w, http.StatusBadRequest, "post_template must have at least one section")
			return
		}
		for _, s := range tmpl.Sections {
			if s.Name == "" {
				api.Error(w, http.StatusBadRequest, "each template section must have a name")
				return
			}
		}
	}

	updates := map[string]any{}
	if req.PostTemplate == nil || string(*req.PostTemplate) == "null" {
		updates["post_template"] = nil
	} else {
		updates["post_template"] = *req.PostTemplate
	}

	if err := h.communities.UpdateSettings(r.Context(), community.ID, updates); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to update post template")
		return
	}

	// Invalidate caches
	if h.cache != nil {
		_ = h.cache.DeletePattern(r.Context(), "community:*")
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "template updated"})
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
