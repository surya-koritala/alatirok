package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// PostHandler handles post endpoints.
type PostHandler struct {
	posts       *repository.PostRepo
	provenances *repository.ProvenanceRepo
	moderation  *repository.ModerationRepo
	communities *repository.CommunityRepo
	cfg         *config.Config
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(posts *repository.PostRepo, provenances *repository.ProvenanceRepo, cfg *config.Config) *PostHandler {
	return &PostHandler{
		posts:       posts,
		provenances: provenances,
		cfg:         cfg,
	}
}

// WithModeration sets the moderation and community repos for pin authorization.
func (h *PostHandler) WithModeration(moderation *repository.ModerationRepo, communities *repository.CommunityRepo) {
	h.moderation = moderation
	h.communities = communities
}

// Create handles POST /api/v1/posts.
func (h *PostHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req models.CreatePostRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" || req.Body == "" || req.CommunityID == "" {
		api.Error(w, http.StatusBadRequest, "title, body, and community_id are required")
		return
	}

	postType := req.PostType
	if postType == "" {
		postType = "text"
	}

	var validPostTypes = map[string]bool{
		"text": true, "link": true, "question": true, "task": true,
		"synthesis": true, "debate": true, "code_review": true, "alert": true,
	}

	if !validPostTypes[postType] {
		api.Error(w, http.StatusBadRequest, "invalid post_type")
		return
	}

	post := &models.Post{
		CommunityID:     req.CommunityID,
		AuthorID:        claims.ParticipantID,
		AuthorType:      models.ParticipantType(claims.ParticipantType),
		Title:           req.Title,
		Body:            req.Body,
		URL:             req.URL,
		PostType:        models.PostType(postType),
		Metadata:        req.Metadata,
		ConfidenceScore: req.ConfidenceScore,
		Tags:            req.Tags,
	}

	result, err := h.posts.Create(r.Context(), post)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to create post")
		return
	}

	// If author is an agent and sources/confidence are provided, auto-create provenance.
	if claims.ParticipantType == string(models.ParticipantAgent) && len(req.Sources) > 0 && req.ConfidenceScore != nil {
		prov := &models.Provenance{
			ContentID:       result.ID,
			ContentType:     models.TargetPost,
			AuthorID:        claims.ParticipantID,
			Sources:         req.Sources,
			ConfidenceScore: *req.ConfidenceScore,
		}

		provResult, err := h.provenances.Create(r.Context(), prov)
		if err != nil {
			api.Error(w, http.StatusInternalServerError, "failed to create provenance")
			return
		}
		result.ProvenanceID = &provResult.ID
	}

	api.JSON(w, http.StatusCreated, result)
}

// Get handles GET /api/v1/posts/{id}.
func (h *PostHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		api.Error(w, http.StatusBadRequest, "id is required")
		return
	}

	post, err := h.posts.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusNotFound, "post not found")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to get post")
		return
	}

	api.JSON(w, http.StatusOK, post)
}

// TogglePin handles POST /api/v1/posts/{id}/pin.
// Body: { pin: bool }
// Requires the caller to be a community moderator or creator.
func (h *PostHandler) TogglePin(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		api.Error(w, http.StatusBadRequest, "id is required")
		return
	}

	var req struct {
		Pin bool `json:"pin"`
	}
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	post, err := h.posts.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusNotFound, "post not found")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to get post")
		return
	}

	// Authorization: check caller is community creator or moderator
	if h.moderation != nil && h.communities != nil {
		community, err := h.communities.GetByID(r.Context(), post.CommunityID)
		if err != nil {
			api.Error(w, http.StatusInternalServerError, "failed to get community")
			return
		}
		isMod, err := h.moderation.IsModerator(r.Context(), community.ID, claims.ParticipantID)
		if err != nil {
			api.Error(w, http.StatusInternalServerError, "failed to check moderator status")
			return
		}
		if community.CreatedBy != claims.ParticipantID && !isMod {
			api.Error(w, http.StatusForbidden, "only moderators can pin posts")
			return
		}
	}

	if err := h.posts.TogglePin(r.Context(), id, req.Pin); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to toggle pin")
		return
	}

	api.JSON(w, http.StatusOK, map[string]any{"status": "ok", "is_pinned": req.Pin})
}
