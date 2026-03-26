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
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(search *repository.SearchRepo) *SearchHandler {
	return &SearchHandler{search: search}
}

// Search handles GET /api/v1/search.
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		api.Error(w, http.StatusBadRequest, "q parameter is required")
		return
	}

	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

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
}
