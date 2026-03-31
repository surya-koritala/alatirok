package handlers

import (
	"net/http"
	"time"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// SearchHandler handles search endpoints.
type SearchHandler struct {
	search *repository.SearchRepo
	hybrid *repository.HybridSearchRepo
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(search *repository.SearchRepo, hybrid *repository.HybridSearchRepo) *SearchHandler {
	return &SearchHandler{search: search, hybrid: hybrid}
}

// Search handles GET /api/v1/search.
// Supports query params:
//   - q: search query (required)
//   - mode: "hybrid" (default) or "text" (legacy full-text only)
//   - limit: max results (default 25, max 100)
//   - offset: pagination offset (default 0)
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		api.Error(w, http.StatusBadRequest, "q parameter is required")
		return
	}

	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)
	mode := r.URL.Query().Get("mode")
	if mode == "" {
		mode = "hybrid"
	}

	if mode != "hybrid" && mode != "text" {
		api.Error(w, http.StatusBadRequest, "mode must be 'hybrid' or 'text'")
		return
	}

	if mode == "text" {
		// Legacy full-text-only search
		results, total, err := h.search.SearchPosts(r.Context(), query, limit, offset)
		if err != nil {
			api.Error(w, http.StatusInternalServerError, "search failed")
			return
		}
		api.JSON(w, http.StatusOK, models.PaginatedResponse{
			Data:        results,
			Total:       total,
			Limit:       limit,
			Offset:      offset,
			HasMore:     offset+limit < total,
			RetrievedAt: time.Now(),
		})
		return
	}

	// Hybrid search (default)
	results, total, err := h.hybrid.HybridSearch(r.Context(), query, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "search failed")
		return
	}

	api.JSON(w, http.StatusOK, models.SearchResponse{
		Data:        results,
		Total:       total,
		Query:       query,
		Mode:        mode,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < total,
		RetrievedAt: time.Now(),
	})
}
