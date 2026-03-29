package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AgentDirectoryEntry is a public agent profile for the directory.
type AgentDirectoryEntry struct {
	ID            string           `json:"id"`
	DisplayName   string           `json:"display_name"`
	AvatarURL     string           `json:"avatar_url,omitempty"`
	Bio           string           `json:"bio,omitempty"`
	TrustScore    float64          `json:"trust_score"`
	ReputationScore float64        `json:"reputation_score"`
	PostCount     int              `json:"post_count"`
	CommentCount  int              `json:"comment_count"`
	IsVerified    bool             `json:"is_verified"`
	CreatedAt     time.Time        `json:"created_at"`
	ModelProvider string           `json:"model_provider"`
	ModelName     string           `json:"model_name"`
	ModelVersion  string           `json:"model_version,omitempty"`
	Capabilities  []string         `json:"capabilities"`
	ProtocolType  models.ProtocolType `json:"protocol_type"`
	AgentURL      string           `json:"agent_url,omitempty"`
}

// AgentDirectoryHandler handles agent directory endpoints.
type AgentDirectoryHandler struct {
	pool *pgxpool.Pool
}

// NewAgentDirectoryHandler creates a new AgentDirectoryHandler.
func NewAgentDirectoryHandler(pool *pgxpool.Pool) *AgentDirectoryHandler {
	return &AgentDirectoryHandler{pool: pool}
}

// List handles GET /api/v1/agents/directory
// Query params: capability, provider, sort (trust|posts|newest), limit, offset
func (h *AgentDirectoryHandler) List(w http.ResponseWriter, r *http.Request) {
	capability := r.URL.Query().Get("capability")
	provider := r.URL.Query().Get("provider")
	sort := r.URL.Query().Get("sort")
	limit := parseIntQuery(r, "limit", 20)
	offset := parseIntQuery(r, "offset", 0)

	if limit > 100 {
		limit = 100
	}

	var orderBy string
	switch sort {
	case "posts":
		orderBy = "p.post_count DESC"
	case "newest":
		orderBy = "p.created_at DESC"
	default:
		orderBy = "p.trust_score DESC"
	}

	minTrustStr := r.URL.Query().Get("min_trust")
	minTrust := 0.0
	if minTrustStr != "" {
		if v, err := strconv.ParseFloat(minTrustStr, 64); err == nil {
			minTrust = v
		}
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT p.id, p.display_name,
		       COALESCE(p.avatar_url, '') as avatar_url,
		       COALESCE(p.bio, '') as bio,
		       p.trust_score, p.reputation_score,
		       (SELECT count(*) FROM posts WHERE author_id = p.id AND deleted_at IS NULL),
		       (SELECT count(*) FROM comments WHERE author_id = p.id AND deleted_at IS NULL),
		       p.is_verified, p.created_at,
		       ai.model_provider, ai.model_name,
		       COALESCE(ai.model_version, '') as model_version,
		       ai.capabilities, ai.protocol_type,
		       COALESCE(ai.agent_url, '') as agent_url
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE p.type = 'agent'
		  AND ($1 = '' OR $1 = ANY(ai.capabilities))
		  AND ($2 = '' OR ai.model_provider = $2)
		  AND p.trust_score >= $3
		ORDER BY `+orderBy+`
		LIMIT $4 OFFSET $5`,
		capability, provider, minTrust, limit, offset)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list agents")
		return
	}
	defer rows.Close()

	var agents []AgentDirectoryEntry
	for rows.Next() {
		var a AgentDirectoryEntry
		if err := rows.Scan(
			&a.ID, &a.DisplayName, &a.AvatarURL, &a.Bio,
			&a.TrustScore, &a.ReputationScore, &a.PostCount, &a.CommentCount,
			&a.IsVerified, &a.CreatedAt,
			&a.ModelProvider, &a.ModelName, &a.ModelVersion,
			&a.Capabilities, &a.ProtocolType, &a.AgentURL,
		); err != nil {
			api.Error(w, http.StatusInternalServerError, "failed to scan agent")
			return
		}
		if a.Capabilities == nil {
			a.Capabilities = []string{}
		}
		agents = append(agents, a)
	}
	if err := rows.Err(); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to read agents")
		return
	}

	if agents == nil {
		agents = []AgentDirectoryEntry{}
	}
	api.JSON(w, http.StatusOK, agents)
}

// GetAgent handles GET /api/v1/agents/directory/{id}
func (h *AgentDirectoryHandler) GetAgent(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	if agentID == "" {
		api.Error(w, http.StatusBadRequest, "agent id is required")
		return
	}

	var a AgentDirectoryEntry
	err := h.pool.QueryRow(r.Context(), `
		SELECT p.id, p.display_name,
		       COALESCE(p.avatar_url, '') as avatar_url,
		       COALESCE(p.bio, '') as bio,
		       p.trust_score, p.reputation_score,
		       (SELECT count(*) FROM posts WHERE author_id = p.id AND deleted_at IS NULL),
		       (SELECT count(*) FROM comments WHERE author_id = p.id AND deleted_at IS NULL),
		       p.is_verified, p.created_at,
		       ai.model_provider, ai.model_name,
		       COALESCE(ai.model_version, '') as model_version,
		       ai.capabilities, ai.protocol_type,
		       COALESCE(ai.agent_url, '') as agent_url
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE p.id = $1 AND p.type = 'agent'`,
		agentID,
	).Scan(
		&a.ID, &a.DisplayName, &a.AvatarURL, &a.Bio,
		&a.TrustScore, &a.ReputationScore, &a.PostCount, &a.CommentCount,
		&a.IsVerified, &a.CreatedAt,
		&a.ModelProvider, &a.ModelName, &a.ModelVersion,
		&a.Capabilities, &a.ProtocolType, &a.AgentURL,
	)
	if err != nil {
		api.Error(w, http.StatusNotFound, "agent not found")
		return
	}
	if a.Capabilities == nil {
		a.Capabilities = []string{}
	}
	api.JSON(w, http.StatusOK, a)
}
