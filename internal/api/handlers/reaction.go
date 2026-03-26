package handlers

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// validReactionTypes is the set of allowed reaction type strings.
var validReactionTypes = map[string]bool{
	"insightful":     true,
	"needs_citation": true,
	"disagree":       true,
	"thanks":         true,
}

// ReactionHandler handles reaction and accept-answer endpoints.
type ReactionHandler struct {
	reactions  *repository.ReactionRepo
	posts      *repository.PostRepo
	comments   *repository.CommentRepo
	reputation *repository.ReputationRepo
	cfg        *config.Config
}

// NewReactionHandler creates a new ReactionHandler.
func NewReactionHandler(reactions *repository.ReactionRepo, posts *repository.PostRepo, comments *repository.CommentRepo, reputation *repository.ReputationRepo, cfg *config.Config) *ReactionHandler {
	return &ReactionHandler{
		reactions:  reactions,
		posts:      posts,
		comments:   comments,
		reputation: reputation,
		cfg:        cfg,
	}
}

// toggleReactionRequest is the request body for POST /api/v1/comments/{id}/reactions.
type toggleReactionRequest struct {
	Type string `json:"type"`
}

// ToggleReaction handles POST /api/v1/comments/{id}/reactions.
// Toggles the authenticated user's reaction on a comment.
// Returns the updated reaction counts.
func (h *ReactionHandler) ToggleReaction(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	commentID := r.PathValue("id")
	if commentID == "" {
		api.Error(w, http.StatusBadRequest, "comment id is required")
		return
	}

	var req toggleReactionRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if !validReactionTypes[req.Type] {
		api.Error(w, http.StatusBadRequest, "type must be one of: insightful, needs_citation, disagree, thanks")
		return
	}

	added, err := h.reactions.Toggle(r.Context(), commentID, claims.ParticipantID, req.Type)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to toggle reaction")
		return
	}

	counts, err := h.reactions.CountsByComment(r.Context(), commentID)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch reaction counts")
		return
	}

	api.JSON(w, http.StatusOK, map[string]any{
		"added":  added,
		"counts": counts,
	})
}

// GetReactions handles GET /api/v1/comments/{id}/reactions.
// Returns the reaction counts for a comment.
func (h *ReactionHandler) GetReactions(w http.ResponseWriter, r *http.Request) {
	commentID := r.PathValue("id")
	if commentID == "" {
		api.Error(w, http.StatusBadRequest, "comment id is required")
		return
	}

	counts, err := h.reactions.CountsByComment(r.Context(), commentID)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to fetch reaction counts")
		return
	}

	api.JSON(w, http.StatusOK, counts)
}

// acceptAnswerRequest is the request body for PUT /api/v1/posts/{id}/accept-answer.
type acceptAnswerRequest struct {
	CommentID string `json:"comment_id"`
}

// AcceptAnswer handles PUT /api/v1/posts/{id}/accept-answer.
// Marks a comment as the accepted answer for a Question post.
// Only the post author can accept an answer, and the post must be of type question.
func (h *ReactionHandler) AcceptAnswer(w http.ResponseWriter, r *http.Request) {
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

	post, err := h.posts.GetByID(r.Context(), postID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusNotFound, "post not found")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to fetch post")
		return
	}

	if post.AuthorID != claims.ParticipantID {
		api.Error(w, http.StatusForbidden, "only the post author can accept an answer")
		return
	}

	if post.PostType != models.PostTypeQuestion {
		api.Error(w, http.StatusBadRequest, "accept-answer is only available for question posts")
		return
	}

	var req acceptAnswerRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CommentID == "" {
		api.Error(w, http.StatusBadRequest, "comment_id is required")
		return
	}

	if err := h.posts.AcceptAnswer(r.Context(), postID, req.CommentID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to accept answer")
		return
	}

	// Record reputation event for the answer author
	commentID := req.CommentID
	go func() {
		comment, err := h.comments.GetByID(context.Background(), commentID)
		if err == nil {
			_ = h.reputation.RecordEvent(context.Background(), comment.AuthorID, repository.EventAcceptedAnswer, 2.0)
		}
	}()

	api.JSON(w, http.StatusOK, map[string]string{
		"accepted_answer_id": req.CommentID,
	})
}
