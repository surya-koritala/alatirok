package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

// CommentRepo handles database operations for comments.
type CommentRepo struct {
	pool *pgxpool.Pool
}

// NewCommentRepo creates a new CommentRepo.
func NewCommentRepo(pool *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{pool: pool}
}

// Pool returns the underlying database pool (used by handlers for ad-hoc queries).
func (r *CommentRepo) Pool() *pgxpool.Pool {
	return r.pool
}

// Create inserts a new comment in a transaction.
// If parent_comment_id is set, depth = parent_depth + 1; otherwise depth = 0.
// Also increments the post's comment_count.
func (r *CommentRepo) Create(ctx context.Context, c *models.Comment) (*models.Comment, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	depth := 0
	if c.ParentCommentID != nil && *c.ParentCommentID != "" {
		var parentDepth int
		err = tx.QueryRow(ctx, `SELECT depth FROM comments WHERE id = $1 AND deleted_at IS NULL`, *c.ParentCommentID).Scan(&parentDepth)
		if err != nil {
			_ = tx.Rollback(ctx)
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("parent comment not found: %w", pgx.ErrNoRows)
			}
			return nil, fmt.Errorf("query parent depth: %w", err)
		}
		depth = parentDepth + 1
	}

	var result models.Comment
	err = tx.QueryRow(ctx, `
		INSERT INTO comments
		  (post_id, parent_comment_id, author_id, author_type, body,
		   provenance_id, confidence_score, depth)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING
		  id, post_id, parent_comment_id, author_id, author_type,
		  body, provenance_id, confidence_score,
		  vote_score, depth, created_at, updated_at`,
		c.PostID,
		c.ParentCommentID,
		c.AuthorID,
		c.AuthorType,
		c.Body,
		c.ProvenanceID,
		c.ConfidenceScore,
		depth,
	).Scan(
		&result.ID, &result.PostID, &result.ParentCommentID,
		&result.AuthorID, &result.AuthorType,
		&result.Body, &result.ProvenanceID, &result.ConfidenceScore,
		&result.VoteScore, &result.Depth, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert comment: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`,
		c.PostID,
	)
	if err != nil {
		return nil, fmt.Errorf("increment comment_count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &result, nil
}

// GetByID returns a single comment by its ID.
func (r *CommentRepo) GetByID(ctx context.Context, id string) (*models.Comment, error) {
	var c models.Comment
	err := r.pool.QueryRow(ctx, `
		SELECT id, post_id, parent_comment_id, author_id, author_type,
		       body, provenance_id, confidence_score,
		       vote_score, depth, created_at, updated_at
		FROM comments WHERE id = $1`, id).Scan(
		&c.ID, &c.PostID, &c.ParentCommentID, &c.AuthorID, &c.AuthorType,
		&c.Body, &c.ProvenanceID, &c.ConfidenceScore,
		&c.VoteScore, &c.Depth, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get comment by id: %w", err)
	}
	return &c, nil
}

// Update edits an existing comment's body. Only updates non-deleted comments.
func (r *CommentRepo) Update(ctx context.Context, id, body string) error {
	_, err := r.pool.Exec(ctx, `UPDATE comments SET body = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`, body, id)
	return err
}

// SoftDelete marks a comment as deleted by setting deleted_at.
func (r *CommentRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE comments SET deleted_at = NOW() WHERE id = $1`, id)
	return err
}

// commentSortClause returns the ORDER BY expression for the given sort mode.
// The depth column is always the primary sort key so threading is preserved.
func commentSortClause(sort string) string {
	switch sort {
	case "new":
		return "c.depth ASC, c.created_at DESC"
	case "old":
		return "c.depth ASC, c.created_at ASC"
	case "controversial":
		return "c.depth ASC, (c.upvote_count + c.downvote_count) DESC, ABS(c.upvote_count - c.downvote_count) ASC"
	default: // "best" — Wilson score confidence interval
		return `c.depth ASC, (CASE WHEN (c.upvote_count + c.downvote_count) = 0 THEN 0 ELSE ((c.upvote_count + 1.9208) / (c.upvote_count + c.downvote_count) - 1.96 * SQRT((c.upvote_count * c.downvote_count::float) / (c.upvote_count + c.downvote_count) + 0.9604) / (c.upvote_count + c.downvote_count)) / (1 + 3.8416 / (c.upvote_count + c.downvote_count)) END) DESC`
	}
}

// ListByPost returns comments for a post joined with author participant data.
// sort controls ordering: "best" (default), "new", "old", "controversial".
func (r *CommentRepo) ListByPost(ctx context.Context, postID string, sort string, limit, offset int) ([]models.CommentWithAuthor, error) {
	orderBy := commentSortClause(sort)
	rows, err := r.pool.Query(ctx, `
		SELECT
			c.id, c.post_id, c.parent_comment_id, c.author_id, c.author_type,
			c.body, c.provenance_id, c.confidence_score,
			c.vote_score, c.depth, c.created_at, c.updated_at,
			p.id, p.type, p.display_name,
			COALESCE(p.avatar_url, '') AS avatar_url,
			COALESCE(p.bio, '') AS bio,
			p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at
		FROM comments c
		JOIN participants p ON p.id = c.author_id
		WHERE c.post_id = $1
		ORDER BY `+orderBy+`
		LIMIT $2 OFFSET $3`,
		postID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list comments by post: %w", err)
	}
	defer rows.Close()

	var comments []models.CommentWithAuthor
	for rows.Next() {
		var cwa models.CommentWithAuthor
		if err := rows.Scan(
			&cwa.ID, &cwa.PostID, &cwa.ParentCommentID, &cwa.AuthorID, &cwa.AuthorType,
			&cwa.Body, &cwa.ProvenanceID, &cwa.ConfidenceScore,
			&cwa.VoteScore, &cwa.Depth, &cwa.CreatedAt, &cwa.UpdatedAt,
			&cwa.Author.ID, &cwa.Author.Type, &cwa.Author.DisplayName,
			&cwa.Author.AvatarURL, &cwa.Author.Bio,
			&cwa.Author.TrustScore, &cwa.Author.ReputationScore, &cwa.Author.IsVerified,
			&cwa.Author.CreatedAt, &cwa.Author.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning comment row: %w", err)
		}
		comments = append(comments, cwa)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating comment rows: %w", err)
	}

	return comments, nil
}
