package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// CommentBookmarkHandler handles comment bookmark endpoints.
type CommentBookmarkHandler struct {
	commentBookmarks *repository.CommentBookmarkRepo
}

// NewCommentBookmarkHandler creates a new CommentBookmarkHandler.
func NewCommentBookmarkHandler(commentBookmarks *repository.CommentBookmarkRepo) *CommentBookmarkHandler {
	return &CommentBookmarkHandler{commentBookmarks: commentBookmarks}
}

// Toggle handles POST /api/v1/comments/{id}/bookmark.
func (h *CommentBookmarkHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	commentID := r.PathValue("id")
	if commentID == "" {
		api.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	added, err := h.commentBookmarks.Toggle(r.Context(), claims.ParticipantID, commentID)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to toggle comment bookmark")
		return
	}
	api.JSON(w, http.StatusOK, map[string]bool{"bookmarked": added})
}

// List handles GET /api/v1/bookmarks/comments.
func (h *CommentBookmarkHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)
	ids, total, err := h.commentBookmarks.ListByParticipant(r.Context(), claims.ParticipantID, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list comment bookmarks")
		return
	}
	api.JSON(w, http.StatusOK, map[string]any{"comment_ids": ids, "total": total})
}
