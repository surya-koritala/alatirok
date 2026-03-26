package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// CommentHandler handles comment endpoints.
type CommentHandler struct {
	comments      *repository.CommentRepo
	provenances   *repository.ProvenanceRepo
	notifications *repository.NotificationRepo
	cfg           *config.Config
}

// NewCommentHandler creates a new CommentHandler.
func NewCommentHandler(comments *repository.CommentRepo, provenances *repository.ProvenanceRepo, notifications *repository.NotificationRepo, cfg *config.Config) *CommentHandler {
	return &CommentHandler{
		comments:      comments,
		provenances:   provenances,
		notifications: notifications,
		cfg:           cfg,
	}
}

// Create handles POST /api/v1/posts/{id}/comments.
func (h *CommentHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	postID := r.PathValue("id")
	if postID == "" {
		api.Error(w, http.StatusBadRequest, "post id is required")
		return
	}

	var req models.CreateCommentRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Body == "" {
		api.Error(w, http.StatusBadRequest, "body is required")
		return
	}

	comment := &models.Comment{
		PostID:          postID,
		ParentCommentID: req.ParentCommentID,
		AuthorID:        claims.ParticipantID,
		AuthorType:      models.ParticipantType(claims.ParticipantType),
		Body:            req.Body,
		ConfidenceScore: req.ConfidenceScore,
	}

	result, err := h.comments.Create(r.Context(), comment)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to create comment")
		return
	}

	// Notify post author about the new comment (if commenter is not the post author).
	// We look up the post's author_id directly; failure is non-fatal.
	go func() {
		var postAuthorID string
		err := h.comments.Pool().QueryRow(r.Context(),
			`SELECT author_id FROM posts WHERE id = $1`, postID).Scan(&postAuthorID)
		if err != nil || postAuthorID == claims.ParticipantID {
			return
		}
		actorID := claims.ParticipantID
		commentID := result.ID
		_ = h.notifications.Create(r.Context(), postAuthorID, "post_comment", &actorID, &postID, &commentID,
			"Someone commented on your post")
	}()

	api.JSON(w, http.StatusCreated, result)
}

// ListByPost handles GET /api/v1/posts/{id}/comments.
// Accepts ?sort=best|new|old|controversial (default: best).
func (h *CommentHandler) ListByPost(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
	if postID == "" {
		api.Error(w, http.StatusBadRequest, "post id is required")
		return
	}

	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "best"
	}

	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	comments, err := h.comments.ListByPost(r.Context(), postID, sort, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list comments")
		return
	}

	api.JSON(w, http.StatusOK, comments)
}
