package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BookmarkRepo struct {
	pool *pgxpool.Pool
}

func NewBookmarkRepo(pool *pgxpool.Pool) *BookmarkRepo {
	return &BookmarkRepo{pool: pool}
}

func (r *BookmarkRepo) Toggle(ctx context.Context, participantID, postID string) (bool, error) {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM bookmarks WHERE participant_id = $1 AND post_id = $2`,
		participantID, postID)
	if err != nil {
		return false, fmt.Errorf("delete bookmark: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return false, nil // removed
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO bookmarks (participant_id, post_id) VALUES ($1, $2)`,
		participantID, postID)
	if err != nil {
		return false, fmt.Errorf("insert bookmark: %w", err)
	}
	return true, nil // added
}

func (r *BookmarkRepo) ListByParticipant(ctx context.Context, participantID string, limit, offset int) ([]string, int, error) {
	var total int
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM bookmarks WHERE participant_id = $1`, participantID).Scan(&total)

	rows, err := r.pool.Query(ctx,
		`SELECT post_id FROM bookmarks WHERE participant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		participantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, 0, err
		}
		ids = append(ids, id)
	}
	return ids, total, rows.Err()
}

func (r *BookmarkRepo) IsBookmarked(ctx context.Context, participantID, postID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM bookmarks WHERE participant_id = $1 AND post_id = $2)`,
		participantID, postID).Scan(&exists)
	return exists, err
}
