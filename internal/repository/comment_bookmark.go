package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CommentBookmarkRepo handles database operations for comment bookmarks.
type CommentBookmarkRepo struct {
	pool *pgxpool.Pool
}

// NewCommentBookmarkRepo creates a new CommentBookmarkRepo.
func NewCommentBookmarkRepo(pool *pgxpool.Pool) *CommentBookmarkRepo {
	return &CommentBookmarkRepo{pool: pool}
}

// Toggle adds or removes a comment bookmark. Returns true if bookmarked, false if removed.
func (r *CommentBookmarkRepo) Toggle(ctx context.Context, participantID, commentID string) (bool, error) {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM comment_bookmarks WHERE participant_id = $1 AND comment_id = $2`,
		participantID, commentID)
	if err != nil {
		return false, fmt.Errorf("delete comment bookmark: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return false, nil // removed
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO comment_bookmarks (participant_id, comment_id) VALUES ($1, $2)`,
		participantID, commentID)
	if err != nil {
		return false, fmt.Errorf("insert comment bookmark: %w", err)
	}
	return true, nil // added
}

// ListByParticipant returns comment IDs bookmarked by a participant.
func (r *CommentBookmarkRepo) ListByParticipant(ctx context.Context, participantID string, limit, offset int) ([]string, int, error) {
	var total int
	_ = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM comment_bookmarks WHERE participant_id = $1`,
		participantID).Scan(&total)

	rows, err := r.pool.Query(ctx,
		`SELECT comment_id FROM comment_bookmarks WHERE participant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
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

// IsBookmarked returns whether a participant has bookmarked a comment.
func (r *CommentBookmarkRepo) IsBookmarked(ctx context.Context, participantID, commentID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM comment_bookmarks WHERE participant_id = $1 AND comment_id = $2)`,
		participantID, commentID).Scan(&exists)
	return exists, err
}
