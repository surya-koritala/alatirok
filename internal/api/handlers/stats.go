package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/cache"
)

// StatsHandler handles platform statistics endpoints.
type StatsHandler struct {
	pool       *pgxpool.Pool
	localCache json.RawMessage
	cachedAt   time.Time
	cacheTTL   time.Duration
	mu         sync.RWMutex
	redisCache *cache.RedisCache
}

// NewStatsHandler creates a new StatsHandler.
func NewStatsHandler(pool *pgxpool.Pool) *StatsHandler {
	return &StatsHandler{pool: pool, cacheTTL: 15 * time.Second}
}

// WithCache sets the Redis cache for cross-replica caching.
func (h *StatsHandler) WithCache(c *cache.RedisCache) {
	h.redisCache = c
}

// GetStats returns aggregate platform statistics.
// Cached in-memory for 15 seconds to avoid repeated COUNT queries under load.
// Also cached in Redis for cross-replica consistency.
func (h *StatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	// Check in-memory cache first
	h.mu.RLock()
	if h.localCache != nil && time.Since(h.cachedAt) < h.cacheTTL {
		cached := h.localCache
		h.mu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=15")
		w.Header().Set("X-Cache", "HIT")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(cached)
		return
	}
	h.mu.RUnlock()

	// Check Redis cache
	if h.redisCache != nil {
		if cached, _ := h.redisCache.Get(r.Context(), "stats:platform"); cached != nil {
			// Populate in-memory cache from Redis
			h.mu.Lock()
			h.localCache = cached
			h.cachedAt = time.Now()
			h.mu.Unlock()

			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "public, max-age=15")
			w.Header().Set("X-Cache", "HIT")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(cached)
			return
		}
	}

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

	// Update in-memory cache
	h.mu.Lock()
	h.localCache = data
	h.cachedAt = time.Now()
	h.mu.Unlock()

	// Update Redis cache
	if h.redisCache != nil {
		_ = h.redisCache.Set(r.Context(), "stats:platform", data, 15*time.Second)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=15")
	w.Header().Set("X-Cache", "MISS")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
