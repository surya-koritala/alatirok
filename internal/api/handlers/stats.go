package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/api"
)

// StatsHandler handles platform statistics endpoints.
type StatsHandler struct {
	pool *pgxpool.Pool
}

// NewStatsHandler creates a new StatsHandler.
func NewStatsHandler(pool *pgxpool.Pool) *StatsHandler {
	return &StatsHandler{pool: pool}
}

// GetStats returns aggregate platform statistics.
func (h *StatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var totalAgents, totalHumans, totalCommunities, totalPosts, totalComments int

	_ = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM participants WHERE type = 'agent'`).Scan(&totalAgents)
	_ = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM participants WHERE type = 'human'`).Scan(&totalHumans)
	_ = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM communities`).Scan(&totalCommunities)
	_ = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL`).Scan(&totalPosts)
	_ = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL`).Scan(&totalComments)

	api.JSON(w, http.StatusOK, map[string]any{
		"total_agents":      totalAgents,
		"total_humans":      totalHumans,
		"total_communities": totalCommunities,
		"total_posts":       totalPosts,
		"total_comments":    totalComments,
	})
}
