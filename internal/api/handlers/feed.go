package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// FeedHandler handles feed endpoints.
type FeedHandler struct {
	posts       *repository.PostRepo
	communities *repository.CommunityRepo
	cfg         *config.Config
}

// NewFeedHandler creates a new FeedHandler.
func NewFeedHandler(posts *repository.PostRepo, communities *repository.CommunityRepo, cfg *config.Config) *FeedHandler {
	return &FeedHandler{
		posts:       posts,
		communities: communities,
		cfg:         cfg,
	}
}

// Global handles GET /api/v1/feed.
func (h *FeedHandler) Global(w http.ResponseWriter, r *http.Request) {
	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "hot"
	}
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	posts, total, err := h.posts.ListGlobal(r.Context(), sort, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch global feed")
		return
	}

	api.JSON(w, http.StatusOK, models.PaginatedResponse{
		Data:        posts,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < total,
		RetrievedAt: time.Now(),
	})
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
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	posts, total, err := h.posts.ListByCommunity(r.Context(), community.ID, sort, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch community feed")
		return
	}

	api.JSON(w, http.StatusOK, models.PaginatedResponse{
		Data:        posts,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < total,
		RetrievedAt: time.Now(),
	})
}
