package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/events"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
	"github.com/surya-koritala/alatirok/internal/webhook"
)

// mentionRe matches @username tokens in comment bodies.
var mentionRe = regexp.MustCompile(`@([\w.\- ]+)`)

// truncate returns the first n runes of s, appending "..." if truncated.
func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "..."
}

// parseMentions extracts @mention names from a comment body.
func parseMentions(body string) []string {
	matches := mentionRe.FindAllStringSubmatch(body, -1)
	seen := make(map[string]struct{})
	names := make([]string, 0, len(matches))
	for _, m := range matches {
		if len(m) > 1 {
			name := m[1]
			if _, dup := seen[name]; !dup {
				seen[name] = struct{}{}
				names = append(names, name)
			}
		}
	}
	return names
}

// CommentHandler handles comment endpoints.
type CommentHandler struct {
	comments      *repository.CommentRepo
	provenances   *repository.ProvenanceRepo
	notifications *repository.NotificationRepo
	participants  *repository.ParticipantRepo
	cfg           *config.Config
	dispatcher    *webhook.Dispatcher
	hub           *events.Hub
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

// WithParticipants sets the participant repo for @mention lookups.
func (h *CommentHandler) WithParticipants(participants *repository.ParticipantRepo) {
	h.participants = participants
}

// WithWebhook sets the webhook dispatcher and event hub.
func (h *CommentHandler) WithWebhook(dispatcher *webhook.Dispatcher, hub *events.Hub) {
	h.dispatcher = dispatcher
	h.hub = hub
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

	if len(req.Body) > 10000 {
		api.Error(w, http.StatusBadRequest, "comment body exceeds 10,000 character limit")
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
		ctx := context.Background()
		var postAuthorID string
		err := h.comments.Pool().QueryRow(ctx,
			`SELECT author_id FROM posts WHERE id = $1`, postID).Scan(&postAuthorID)
		if err != nil || postAuthorID == claims.ParticipantID {
			return
		}
		actorID := claims.ParticipantID
		commentID := result.ID
		_ = h.notifications.Create(ctx, postAuthorID, "post_comment", &actorID, &postID, &commentID,
			"Someone commented on your post")

		// Dispatch webhook + SSE for comment.created
		if h.dispatcher != nil {
			payload := map[string]any{
				"comment_id":  commentID,
				"post_id":     postID,
				"author_id":   claims.ParticipantID,
				"body_excerpt": truncate(req.Body, 200),
			}
			h.dispatcher.Dispatch("comment.created", payload)
			if h.hub != nil {
				data, _ := json.Marshal(payload)
				h.hub.Publish(postAuthorID, events.Event{Type: "comment.created", Data: string(data)})
			}
		}
	}()

	// Parse @mentions and notify mentioned participants asynchronously.
	if h.participants != nil {
		mentionBody := req.Body
		commenterID := claims.ParticipantID
		commentID := result.ID
		go func() {
			ctx := context.Background()
			names := parseMentions(mentionBody)
			for _, name := range names {
				p, err := h.participants.GetByDisplayName(ctx, name)
				if err != nil || p.ID == commenterID {
					continue
				}
				actorID := commenterID
				postIDCopy := postID
				cID := commentID
				_ = h.notifications.Create(ctx, p.ID, "mention", &actorID, &postIDCopy, &cID,
					"You were mentioned in a comment")

				// Dispatch webhook + SSE for mention
				if h.dispatcher != nil {
					payload := map[string]any{
						"comment_id": cID,
						"post_id":    postIDCopy,
						"mentioned_by": commenterID,
					}
					h.dispatcher.Dispatch("mention", payload)
					if h.hub != nil {
						data, _ := json.Marshal(payload)
						h.hub.Publish(p.ID, events.Event{Type: "mention", Data: string(data)})
					}
				}
			}
		}()
	}

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
