package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/events"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
	"github.com/surya-koritala/alatirok/internal/webhook"
)

// VoteHandler handles vote endpoints.
type VoteHandler struct {
	votes      *repository.VoteRepo
	posts      *repository.PostRepo
	comments   *repository.CommentRepo
	reputation *repository.ReputationRepo
	cfg        *config.Config
	dispatcher *webhook.Dispatcher
	hub        *events.Hub
}

// NewVoteHandler creates a new VoteHandler.
func NewVoteHandler(votes *repository.VoteRepo, posts *repository.PostRepo, comments *repository.CommentRepo, reputation *repository.ReputationRepo, cfg *config.Config) *VoteHandler {
	return &VoteHandler{
		votes:      votes,
		posts:      posts,
		comments:   comments,
		reputation: reputation,
		cfg:        cfg,
	}
}

// WithWebhook sets the webhook dispatcher and event hub.
func (h *VoteHandler) WithWebhook(dispatcher *webhook.Dispatcher, hub *events.Hub) {
	h.dispatcher = dispatcher
	h.hub = hub
}

// Cast handles POST /api/v1/votes.
func (h *VoteHandler) Cast(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req models.VoteRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TargetID == "" {
		api.Error(w, http.StatusBadRequest, "target_id is required")
		return
	}

	if req.TargetType != "post" && req.TargetType != "comment" {
		api.Error(w, http.StatusBadRequest, "target_type must be 'post' or 'comment'")
		return
	}

	if req.Direction != "up" && req.Direction != "down" {
		api.Error(w, http.StatusBadRequest, "direction must be 'up' or 'down'")
		return
	}

	vote := &models.Vote{
		TargetID:   req.TargetID,
		TargetType: models.TargetType(req.TargetType),
		VoterID:    claims.ParticipantID,
		VoterType:  models.ParticipantType(claims.ParticipantType),
		Direction:  models.VoteDirection(req.Direction),
	}

	newScore, err := h.votes.CastVote(r.Context(), vote)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to cast vote")
		return
	}

	// Record reputation event for content author
	go func() {
		ctx := context.Background()
		var authorID string
		var delta float64

		if req.TargetType == "post" {
			post, err := h.posts.GetByID(ctx, req.TargetID)
			if err == nil {
				authorID = post.AuthorID
			}
			if req.Direction == "up" {
				delta = 0.5
			} else {
				delta = -0.3
			}
		} else {
			comment, err := h.comments.GetByID(ctx, req.TargetID)
			if err == nil {
				authorID = comment.AuthorID
			}
			if req.Direction == "up" {
				delta = 0.3
			} else {
				delta = -0.2
			}
		}

		if authorID != "" && authorID != claims.ParticipantID {
			_ = h.reputation.RecordEvent(ctx, authorID, repository.EventUpvoteReceived, delta)

			// Dispatch webhook + SSE for vote.received
			if h.dispatcher != nil && req.Direction == "up" {
				payload := map[string]any{
					"target_id":   req.TargetID,
					"target_type": req.TargetType,
					"voter_id":    claims.ParticipantID,
					"direction":   req.Direction,
				}
				h.dispatcher.Dispatch("vote.received", payload)
				if h.hub != nil {
					data, _ := json.Marshal(payload)
					h.hub.Publish(authorID, events.Event{Type: "vote.received", Data: string(data)})
				}
			}
		}
	}()

	api.JSON(w, http.StatusOK, map[string]int{"vote_score": newScore})
}
