package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

// APIKeyRepo handles database operations for API keys.
type APIKeyRepo struct {
	pool *pgxpool.Pool
}

// NewAPIKeyRepo creates a new APIKeyRepo.
func NewAPIKeyRepo(pool *pgxpool.Pool) *APIKeyRepo {
	return &APIKeyRepo{pool: pool}
}

// Create inserts a new API key record with an optional prefix for fast lookup.
func (r *APIKeyRepo) Create(ctx context.Context, k *models.APIKey) (*models.APIKey, error) {
	var result models.APIKey
	err := r.pool.QueryRow(ctx, `
		INSERT INTO api_keys
		  (agent_id, key_hash, key_prefix, scopes, rate_limit, expires_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING
		  id, agent_id, key_hash, scopes, rate_limit, expires_at, is_active, created_at`,
		k.AgentID,
		k.KeyHash,
		k.KeyPrefix,
		k.Scopes,
		k.RateLimit,
		k.ExpiresAt,
		k.IsActive,
	).Scan(
		&result.ID, &result.AgentID, &result.KeyHash, &result.Scopes,
		&result.RateLimit, &result.ExpiresAt, &result.IsActive, &result.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert api_key: %w", err)
	}
	return &result, nil
}

// GetByPrefix finds an active API key by its plaintext prefix (O(1) lookup).
func (r *APIKeyRepo) GetByPrefix(ctx context.Context, prefix string) (*models.APIKey, error) {
	var k models.APIKey
	err := r.pool.QueryRow(ctx, `
		SELECT id, agent_id, key_hash, scopes, rate_limit, expires_at, is_active, created_at
		FROM api_keys
		WHERE key_prefix = $1 AND is_active = TRUE AND expires_at > NOW()
		LIMIT 1`, prefix).Scan(
		&k.ID, &k.AgentID, &k.KeyHash, &k.Scopes,
		&k.RateLimit, &k.ExpiresAt, &k.IsActive, &k.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// SetPrefix updates the key_prefix for a given key (used to backfill old keys).
func (r *APIKeyRepo) SetPrefix(ctx context.Context, keyID, prefix string) error {
	_, err := r.pool.Exec(ctx, `UPDATE api_keys SET key_prefix = $1 WHERE id = $2`, prefix, keyID)
	return err
}

// GetActiveByAgent returns all active, non-expired API keys for the given agent.
func (r *APIKeyRepo) GetActiveByAgent(ctx context.Context, agentID string) ([]models.APIKey, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, agent_id, key_hash, scopes, rate_limit, expires_at, is_active, created_at
		FROM api_keys
		WHERE agent_id = $1 AND is_active = TRUE AND expires_at > NOW()
		ORDER BY created_at DESC`,
		agentID,
	)
	if err != nil {
		return nil, fmt.Errorf("get active api keys by agent: %w", err)
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(
			&k.ID, &k.AgentID, &k.KeyHash, &k.Scopes,
			&k.RateLimit, &k.ExpiresAt, &k.IsActive, &k.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning api_key row: %w", err)
		}
		keys = append(keys, k)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating api_key rows: %w", err)
	}

	return keys, nil
}

// GetAllActive returns all active, non-expired API keys across all agents.
// Used by the API key auth middleware to validate incoming keys.
func (r *APIKeyRepo) GetAllActive(ctx context.Context) ([]models.APIKey, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, agent_id, key_hash, scopes, rate_limit, expires_at, is_active, created_at
		FROM api_keys
		WHERE is_active = TRUE AND expires_at > NOW()`)
	if err != nil {
		return nil, fmt.Errorf("get all active api keys: %w", err)
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(
			&k.ID, &k.AgentID, &k.KeyHash, &k.Scopes,
			&k.RateLimit, &k.ExpiresAt, &k.IsActive, &k.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning api_key row: %w", err)
		}
		keys = append(keys, k)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating api_key rows: %w", err)
	}

	return keys, nil
}

// RevokeAllForAgent deactivates all API keys for the given agent.
// Called when generating a new key to ensure only one key is active at a time.
func (r *APIKeyRepo) RevokeAllForAgent(ctx context.Context, agentID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE api_keys SET is_active = FALSE WHERE agent_id = $1 AND is_active = TRUE`, agentID)
	if err != nil {
		return fmt.Errorf("revoke all agent keys: %w", err)
	}
	return nil
}

// Revoke sets is_active = FALSE for the given API key ID.
func (r *APIKeyRepo) Revoke(ctx context.Context, keyID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE api_keys SET is_active = FALSE WHERE id = $1`,
		keyID,
	)
	if err != nil {
		return fmt.Errorf("revoke api_key: %w", err)
	}
	return nil
}
