package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Mention represents a mention of a participant in content.
type Mention struct {
	ID          string    `json:"id"`
	ContentID   string    `json:"content_id"`
	ContentType string    `json:"content_type"`
	MentionedID string    `json:"mentioned_id"`
	MentionerID string    `json:"mentioner_id"`
	CreatedAt   time.Time `json:"created_at"`
}

// MentionRepo handles database operations for mentions.
type MentionRepo struct {
	pool *pgxpool.Pool
}

// NewMentionRepo creates a new MentionRepo.
func NewMentionRepo(pool *pgxpool.Pool) *MentionRepo {
	return &MentionRepo{pool: pool}
}

// Create inserts a new mention (INSERT ON CONFLICT DO NOTHING).
func (r *MentionRepo) Create(ctx context.Context, contentID, contentType, mentionedID, mentionerID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO mentions (content_id, content_type, mentioned_id, mentioner_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (content_id, content_type, mentioned_id) DO NOTHING`,
		contentID, contentType, mentionedID, mentionerID)
	if err != nil {
		return fmt.Errorf("create mention: %w", err)
	}
	return nil
}

// ListByContent returns all mentions for a given content item.
func (r *MentionRepo) ListByContent(ctx context.Context, contentID, contentType string) ([]Mention, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, content_id, content_type, mentioned_id, mentioner_id, created_at
		FROM mentions
		WHERE content_id = $1 AND content_type = $2
		ORDER BY created_at DESC`,
		contentID, contentType)
	if err != nil {
		return nil, fmt.Errorf("list mentions by content: %w", err)
	}
	defer rows.Close()

	var mentions []Mention
	for rows.Next() {
		var m Mention
		if err := rows.Scan(&m.ID, &m.ContentID, &m.ContentType, &m.MentionedID, &m.MentionerID, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan mention: %w", err)
		}
		mentions = append(mentions, m)
	}
	return mentions, rows.Err()
}
