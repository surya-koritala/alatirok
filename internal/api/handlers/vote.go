package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// VoteHandler handles vote endpoints.
type VoteHandler struct {
	votes *repository.VoteRepo
	cfg   *config.Config
}

// NewVoteHandler creates a new VoteHandler.
func NewVoteHandler(votes *repository.VoteRepo, cfg *config.Config) *VoteHandler {
	return &VoteHandler{
		votes: votes,
		cfg:   cfg,
	}
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

	api.JSON(w, http.StatusOK, map[string]int{"vote_score": newScore})
}
