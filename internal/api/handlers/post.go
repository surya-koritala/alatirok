package handlers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/cache"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/modfilter"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/quality"
	"github.com/surya-koritala/alatirok/internal/ratelimit"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// PostHandler handles post endpoints.
type PostHandler struct {
	posts        *repository.PostRepo
	provenances  *repository.ProvenanceRepo
	moderation   *repository.ModerationRepo
	communities  *repository.CommunityRepo
	participants *repository.ParticipantRepo
	reports      *repository.ReportRepo
	agentSubs    *repository.AgentSubscriptionRepo
	rateLimiter    *ratelimit.RateLimiter
	cfg            *config.Config
	cache          *cache.RedisCache
	qualityChecker *quality.Checker
}

// WithQualityChecker sets the quality checker for agent post validation.
func (h *PostHandler) WithQualityChecker(qc *quality.Checker) {
	h.qualityChecker = qc
}

// WithCache sets the Redis cache for cache invalidation on writes.
func (h *PostHandler) WithCache(c *cache.RedisCache) {
	h.cache = c
}

// WithParticipants sets the participant repo for agent policy enforcement.
func (h *PostHandler) WithParticipants(participants *repository.ParticipantRepo) {
	h.participants = participants
}

// WithReports sets the report repo for auto-flagging moderated content.
func (h *PostHandler) WithReports(reports *repository.ReportRepo) {
	h.reports = reports
}

// WithRateLimiter sets the rate limiter for post creation.
func (h *PostHandler) WithRateLimiter(rl *ratelimit.RateLimiter) {
	h.rateLimiter = rl
}

// WithAgentSubscriptions sets the agent subscription repo for post-creation notifications.
func (h *PostHandler) WithAgentSubscriptions(agentSubs *repository.AgentSubscriptionRepo) {
	h.agentSubs = agentSubs
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

	// Rate limiting per participant
	if h.rateLimiter != nil {
		if !h.rateLimiter.Allow(claims.ParticipantID) {
			remaining := h.rateLimiter.Remaining(claims.ParticipantID)
			w.Header().Set("Retry-After", "60")
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			api.Error(w, http.StatusTooManyRequests, "rate limit exceeded: max 5 posts per minute")
			return
		}
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

	if len(req.Body) > 50000 {
		api.Error(w, http.StatusBadRequest, fmt.Sprintf("post body exceeds 50,000 character limit (yours: %d)", len(req.Body)))
		return
	}

	if len(req.Title) > 300 {
		api.Error(w, http.StatusBadRequest, fmt.Sprintf("post title exceeds 300 character limit (yours: %d)", len(req.Title)))
		return
	}

	postType := req.PostType
	if postType == "" {
		postType = "text"
	}

	// Resolve common aliases to canonical post types.
	var postTypeAliases = map[string]string{
		"research":     "synthesis",
		"meta":         "synthesis",
		"data":         "alert",
		"analysis":     "synthesis",
		"discussion":   "text",
		"article":      "text",
		"bug":          "text",
		"announcement": "text",
	}
	if canonical, ok := postTypeAliases[postType]; ok {
		postType = canonical
	}

	var validPostTypes = map[string]bool{
		"text": true, "link": true, "question": true, "task": true,
		"synthesis": true, "debate": true, "code_review": true, "alert": true,
	}

	if !validPostTypes[postType] {
		api.Error(w, http.StatusBadRequest, "invalid post_type")
		return
	}

	// Content moderation: check title + body for prohibited content.
	// Both blocked AND flagged content is rejected on this platform.
	modResult := modfilter.Check(req.Title + " " + req.Body)
	if modResult.Severity >= modfilter.SeverityFlag {
		slog.Warn("post blocked by content filter",
			"author_id", claims.ParticipantID,
			"category", modResult.Category,
			"severity", modResult.Severity,
		)
		api.Error(w, http.StatusForbidden, "your post was blocked because it contains prohibited content")
		return
	}

	// Enforce community agent_policy for agent authors
	if claims.ParticipantType == string(models.ParticipantAgent) && h.communities != nil {
		community, err := h.communities.GetByID(r.Context(), req.CommunityID)
		if err != nil {
			api.ErrorWithDetail(w, http.StatusInternalServerError, "failed to look up community", err)
			return
		}
		switch community.AgentPolicy {
		case models.AgentPolicyRestricted:
			api.Error(w, http.StatusForbidden, "this community does not allow agent posts")
			return
		case models.AgentPolicyVerified:
			if h.participants != nil {
				participant, err := h.participants.GetByID(r.Context(), claims.ParticipantID)
				if err != nil {
					api.ErrorWithDetail(w, http.StatusInternalServerError, "failed to look up participant", err)
					return
				}
				if !participant.IsVerified {
					api.Error(w, http.StatusForbidden, "this community requires verified agents — your agent is not verified")
					return
				}
			}
		}
	}

	// Quality gate: check if community requires minimum trust score
	if h.communities != nil && h.participants != nil {
		community, err := h.communities.GetByID(r.Context(), req.CommunityID)
		if err == nil && community.QualityThreshold > 0 {
			author, err := h.participants.GetByID(r.Context(), claims.ParticipantID)
			if err == nil && author.TrustScore < community.QualityThreshold {
				api.Error(w, http.StatusForbidden, fmt.Sprintf(
					"this community requires a minimum trust score of %.1f (yours: %.1f)",
					community.QualityThreshold, author.TrustScore))
				return
			}
		}
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
		api.ErrorWithDetail(w, http.StatusInternalServerError, "failed to create post", err)
		return
	}

	// Auto-report flagged content for moderator review.
	if modResult.Severity == modfilter.SeverityFlag && h.reports != nil {
		_, reportErr := h.reports.Create(r.Context(), "system", result.ID, "post", "auto_flagged", modResult.Reason)
		if reportErr != nil {
			slog.Error("failed to auto-create report for flagged post",
				"post_id", result.ID,
				"error", reportErr,
			)
		}
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

	// Invalidate feed caches
	if h.cache != nil {
		_ = h.cache.DeletePattern(r.Context(), "feed:*")
		_ = h.cache.DeletePattern(r.Context(), "activity:*")
	}

	// Notify agent subscriptions (async, non-blocking).
	if h.agentSubs != nil && h.communities != nil {
		community, err := h.communities.GetByID(r.Context(), result.CommunityID)
		if err == nil {
			authorName := claims.ParticipantID
			if h.participants != nil {
				if p, err := h.participants.GetByID(r.Context(), claims.ParticipantID); err == nil {
					authorName = p.DisplayName
				}
			}
			NotifySubscribers(h.agentSubs, result, community.Slug, authorName)
		}
	}

	// Run quality check for agent posts (async, non-blocking)
	if claims.ParticipantType == "agent" && h.qualityChecker != nil {
		postBody := result.Body
		confidence := 0.0
		method := ""
		if h.provenances != nil {
			if prov, err := h.provenances.GetByContentID(r.Context(), result.ID, models.TargetPost); err == nil {
				confidence = prov.ConfidenceScore
				method = string(prov.GenerationMethod)
			}
		}
		go h.qualityChecker.RunCheck(context.Background(), result.ID, postBody, confidence, method)
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
