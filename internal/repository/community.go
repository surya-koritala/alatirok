package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

// CommunityRepo handles database operations for communities.
type CommunityRepo struct {
	pool *pgxpool.Pool
}

// NewCommunityRepo creates a new CommunityRepo.
func NewCommunityRepo(pool *pgxpool.Pool) *CommunityRepo {
	return &CommunityRepo{pool: pool}
}

const communityScanFields = `
	id, name, slug,
	COALESCE(description, '') as description,
	COALESCE(rules, '') as rules,
	agent_policy, quality_threshold, created_by,
	subscriber_count, created_at, updated_at`

// Create inserts a new community. Defaults agent_policy to "open" if empty.
func (r *CommunityRepo) Create(ctx context.Context, c *models.Community) (*models.Community, error) {
	if c.AgentPolicy == "" {
		c.AgentPolicy = models.AgentPolicyOpen
	}

	var result models.Community
	err := r.pool.QueryRow(ctx, `
		INSERT INTO communities
		  (name, slug, description, rules, agent_policy, quality_threshold, created_by)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7)
		RETURNING`+communityScanFields,
		c.Name,
		c.Slug,
		c.Description,
		c.Rules,
		c.AgentPolicy,
		c.QualityThreshold,
		c.CreatedBy,
	).Scan(
		&result.ID, &result.Name, &result.Slug,
		&result.Description, &result.Rules,
		&result.AgentPolicy, &result.QualityThreshold, &result.CreatedBy,
		&result.SubscriberCount, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert community: %w", err)
	}
	return &result, nil
}

// GetBySlug returns the community with the given slug.
func (r *CommunityRepo) GetBySlug(ctx context.Context, slug string) (*models.Community, error) {
	var c models.Community
	err := r.pool.QueryRow(ctx, `
		SELECT`+communityScanFields+`
		FROM communities
		WHERE slug = $1`,
		slug,
	).Scan(
		&c.ID, &c.Name, &c.Slug,
		&c.Description, &c.Rules,
		&c.AgentPolicy, &c.QualityThreshold, &c.CreatedBy,
		&c.SubscriberCount, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get community by slug: %w", err)
	}
	return &c, nil
}

// GetByID returns the community with the given UUID.
func (r *CommunityRepo) GetByID(ctx context.Context, id string) (*models.Community, error) {
	var c models.Community
	err := r.pool.QueryRow(ctx, `
		SELECT`+communityScanFields+`
		FROM communities
		WHERE id = $1`,
		id,
	).Scan(
		&c.ID, &c.Name, &c.Slug,
		&c.Description, &c.Rules,
		&c.AgentPolicy, &c.QualityThreshold, &c.CreatedBy,
		&c.SubscriberCount, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get community by id: %w", err)
	}
	return &c, nil
}

// List returns all communities ordered by subscriber_count DESC with pagination.
func (r *CommunityRepo) List(ctx context.Context, limit, offset int) ([]models.Community, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT`+communityScanFields+`
		FROM communities
		ORDER BY subscriber_count DESC
		LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list communities: %w", err)
	}
	defer rows.Close()

	var communities []models.Community
	for rows.Next() {
		var c models.Community
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Slug,
			&c.Description, &c.Rules,
			&c.AgentPolicy, &c.QualityThreshold, &c.CreatedBy,
			&c.SubscriberCount, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning community row: %w", err)
		}
		communities = append(communities, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating community rows: %w", err)
	}

	return communities, nil
}

// UpdateSettings updates mutable community settings identified by id.
// Only keys present in the updates map are changed.
func (r *CommunityRepo) UpdateSettings(ctx context.Context, id string, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}

	// Allowlist of updatable columns
	allowed := map[string]bool{
		"description":    true,
		"rules":          true,
		"agent_policy":   true,
		"require_tags":   true,
		"min_body_length": true,
	}

	setClauses := make([]string, 0, len(updates)+1)
	args := make([]any, 0, len(updates)+2)
	i := 1

	for col, val := range updates {
		if !allowed[col] {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}

	if len(setClauses) == 0 {
		return nil
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)

	query := fmt.Sprintf(
		"UPDATE communities SET %s WHERE id = $%d",
		strings.Join(setClauses, ", "),
		i,
	)

	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update community settings: %w", err)
	}
	return nil
}

// Delete permanently removes a community by ID.
// CASCADE constraints on the database handle posts, subscriptions, etc.
func (r *CommunityRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM communities WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete community: %w", err)
	}
	return nil
}

// Subscribe adds a participant subscription and updates subscriber_count.
func (r *CommunityRepo) Subscribe(ctx context.Context, communityID, participantID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO community_subscriptions (community_id, participant_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING`,
		communityID, participantID,
	)
	if err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE communities
		SET subscriber_count = (
			SELECT COUNT(*) FROM community_subscriptions WHERE community_id = $1
		),
		updated_at = NOW()
		WHERE id = $1`,
		communityID,
	)
	if err != nil {
		return fmt.Errorf("update subscriber_count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// Unsubscribe removes a participant subscription and updates subscriber_count.
func (r *CommunityRepo) Unsubscribe(ctx context.Context, communityID, participantID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		DELETE FROM community_subscriptions
		WHERE community_id = $1 AND participant_id = $2`,
		communityID, participantID,
	)
	if err != nil {
		return fmt.Errorf("delete subscription: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE communities
		SET subscriber_count = (
			SELECT COUNT(*) FROM community_subscriptions WHERE community_id = $1
		),
		updated_at = NOW()
		WHERE id = $1`,
		communityID,
	)
	if err != nil {
		return fmt.Errorf("update subscriber_count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
