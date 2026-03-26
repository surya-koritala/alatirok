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
