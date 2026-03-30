package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/cache"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// FeedHandler handles feed endpoints.
type FeedHandler struct {
	posts       *repository.PostRepo
	communities *repository.CommunityRepo
	cfg         *config.Config
	cache       *cache.RedisCache
}

// NewFeedHandler creates a new FeedHandler.
func NewFeedHandler(posts *repository.PostRepo, communities *repository.CommunityRepo, cfg *config.Config) *FeedHandler {
	return &FeedHandler{
		posts:       posts,
		communities: communities,
		cfg:         cfg,
	}
}

// WithCache sets the Redis cache for feed responses.
func (h *FeedHandler) WithCache(c *cache.RedisCache) {
	h.cache = c
}

// Global handles GET /api/v1/feed.
func (h *FeedHandler) Global(w http.ResponseWriter, r *http.Request) {
	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "hot"
	}
	postType := r.URL.Query().Get("type")
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)
	cursor := r.URL.Query().Get("cursor")

	// Build cache key from query params (only for non-cursor requests without auth)
	cacheKey := fmt.Sprintf("feed:global:%s:%s:%d:%d", sort, postType, limit, offset)
	if cursor != "" {
		cacheKey = fmt.Sprintf("feed:global:%s:%s:%d:c:%s", sort, postType, limit, cursor)
	}

	// Try cache first
	if h.cache != nil {
		if cached, _ := h.cache.Get(r.Context(), cacheKey); cached != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cached)
			return
		}
	}

	posts, total, err := h.posts.ListGlobal(r.Context(), sort, postType, limit, offset, cursor)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch global feed")
		return
	}

	resp := models.PaginatedResponse{
		Data:        posts,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < total,
		RetrievedAt: time.Now(),
	}

	// Set next_cursor to the last post's ID if there are results
	if len(posts) > 0 {
		resp.NextCursor = posts[len(posts)-1].ID
	}

	// Store in cache
	if h.cache != nil {
		if data, err := json.Marshal(resp); err == nil {
			_ = h.cache.Set(r.Context(), cacheKey, data, 30*time.Second)
		}
	}

	w.Header().Set("X-Cache", "MISS")
	api.JSON(w, http.StatusOK, resp)
}

// Subscribed handles GET /api/v1/feed/subscribed — returns posts from communities the user subscribes to.
func (h *FeedHandler) Subscribed(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "login required")
		return
	}
	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "hot"
	}
	postType := r.URL.Query().Get("type")
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)
	cursor := r.URL.Query().Get("cursor")

	// Cache key includes participant ID for subscribed feeds
	cacheKey := fmt.Sprintf("feed:sub:%s:%s:%s:%d:%d", claims.ParticipantID, sort, postType, limit, offset)
	if cursor != "" {
		cacheKey = fmt.Sprintf("feed:sub:%s:%s:%s:%d:c:%s", claims.ParticipantID, sort, postType, limit, cursor)
	}

	if h.cache != nil {
		if cached, _ := h.cache.Get(r.Context(), cacheKey); cached != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cached)
			return
		}
	}

	posts, total, err := h.posts.ListBySubscriptions(r.Context(), claims.ParticipantID, sort, postType, limit, offset, cursor)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch feed")
		return
	}

	resp := models.PaginatedResponse{
		Data:        posts,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < total,
		RetrievedAt: time.Now(),
	}

	if len(posts) > 0 {
		resp.NextCursor = posts[len(posts)-1].ID
	}

	if h.cache != nil {
		if data, err := json.Marshal(resp); err == nil {
			_ = h.cache.Set(r.Context(), cacheKey, data, 30*time.Second)
		}
	}

	w.Header().Set("X-Cache", "MISS")
	api.JSON(w, http.StatusOK, resp)
}

// ByCommunity handles GET /api/v1/communities/{slug}/feed.
func (h *FeedHandler) ByCommunity(w http.ResponseWriter, r *http.Request) {
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

	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "hot"
	}
	postType := r.URL.Query().Get("type")
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)
	cursor := r.URL.Query().Get("cursor")

	cacheKey := fmt.Sprintf("feed:comm:%s:%s:%s:%d:%d", slug, sort, postType, limit, offset)
	if cursor != "" {
		cacheKey = fmt.Sprintf("feed:comm:%s:%s:%s:%d:c:%s", slug, sort, postType, limit, cursor)
	}

	if h.cache != nil {
		if cached, _ := h.cache.Get(r.Context(), cacheKey); cached != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cached)
			return
		}
	}

	posts, total, err := h.posts.ListByCommunity(r.Context(), community.ID, sort, postType, limit, offset, cursor)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch community feed")
		return
	}

	resp := models.PaginatedResponse{
		Data:        posts,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < total,
		RetrievedAt: time.Now(),
	}

	if len(posts) > 0 {
		resp.NextCursor = posts[len(posts)-1].ID
	}

	if h.cache != nil {
		if data, err := json.Marshal(resp); err == nil {
			_ = h.cache.Set(r.Context(), cacheKey, data, 30*time.Second)
		}
	}

	w.Header().Set("X-Cache", "MISS")
	api.JSON(w, http.StatusOK, resp)
}
