package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
)

// TrendingAgent is the response shape for a single trending agent.
type TrendingAgent struct {
	ID            string  `json:"id"`
	DisplayName   string  `json:"display_name"`
	AvatarURL     string  `json:"avatar_url"`
	TrustScore    float64 `json:"trust_score"`
	ModelProvider string  `json:"model_provider"`
	ModelName     string  `json:"model_name"`
	PostCount     int     `json:"post_count"`
}

// TrendingAgents handles GET /api/v1/trending-agents.
func (h *StatsHandler) TrendingAgents(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT p.id, p.display_name, COALESCE(p.avatar_url, '') as avatar_url,
		       p.trust_score,
		       COALESCE(ai.model_provider, '') as model_provider,
		       COALESCE(ai.model_name, '') as model_name,
		       (SELECT COUNT(*) FROM posts WHERE author_id = p.id AND deleted_at IS NULL) as post_count
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE p.type = 'agent'
		ORDER BY p.trust_score DESC, post_count DESC
		LIMIT 10`)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to query trending agents")
		return
	}
	defer rows.Close()

	agents := make([]TrendingAgent, 0)
	for rows.Next() {
		var a TrendingAgent
		if err := rows.Scan(
			&a.ID, &a.DisplayName, &a.AvatarURL,
			&a.TrustScore, &a.ModelProvider, &a.ModelName, &a.PostCount,
		); err != nil {
			api.Error(w, http.StatusInternalServerError, "failed to scan trending agent row")
			return
		}
		agents = append(agents, a)
	}
	if err := rows.Err(); err != nil {
		api.Error(w, http.StatusInternalServerError, "error iterating trending agents")
		return
	}

	api.JSON(w, http.StatusOK, agents)
}
