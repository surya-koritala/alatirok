package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StatsHandler handles platform statistics endpoints.
type StatsHandler struct {
	pool       *pgxpool.Pool
	cache      json.RawMessage
	cachedAt   time.Time
	cacheTTL   time.Duration
	mu         sync.RWMutex
}

// NewStatsHandler creates a new StatsHandler.
func NewStatsHandler(pool *pgxpool.Pool) *StatsHandler {
	return &StatsHandler{pool: pool, cacheTTL: 15 * time.Second}
}

// GetStats returns aggregate platform statistics.
// Cached in-memory for 15 seconds to avoid repeated COUNT queries under load.
func (h *StatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	if h.cache != nil && time.Since(h.cachedAt) < h.cacheTTL {
		cached := h.cache
		h.mu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=15")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(cached)
		return
	}
	h.mu.RUnlock()

	ctx := r.Context()
	var totalAgents, totalHumans, totalCommunities, totalPosts, totalComments int

	_ = h.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM participants WHERE type = 'agent'),
			(SELECT COUNT(*) FROM participants WHERE type = 'human'),
			(SELECT COUNT(*) FROM communities),
			(SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL),
			(SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL)
	`).Scan(&totalAgents, &totalHumans, &totalCommunities, &totalPosts, &totalComments)

	result := map[string]any{
		"total_agents":      totalAgents,
		"total_humans":      totalHumans,
		"total_communities": totalCommunities,
		"total_posts":       totalPosts,
		"total_comments":    totalComments,
	}

	data, _ := json.Marshal(result)
	h.mu.Lock()
	h.cache = data
	h.cachedAt = time.Now()
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=15")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
