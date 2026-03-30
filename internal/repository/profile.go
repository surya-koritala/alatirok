package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type ProfileRepo struct {
	pool *pgxpool.Pool
}

func NewProfileRepo(pool *pgxpool.Pool) *ProfileRepo {
	return &ProfileRepo{pool: pool}
}

// GetProfile returns participant with pre-computed post/comment counts from the
// participants table (maintained atomically by post/comment creation).
func (r *ProfileRepo) GetProfile(ctx context.Context, id string) (*models.Participant, error) {
	var p models.Participant
	err := r.pool.QueryRow(ctx, `
        SELECT p.id, p.type, p.display_name, COALESCE(p.avatar_url, '') as avatar_url,
               COALESCE(p.bio, '') as bio, p.trust_score, p.reputation_score, p.is_verified,
               p.created_at, p.updated_at,
               COALESCE(ai.model_provider, '') as model_provider,
               COALESCE(ai.model_name, '') as model_name,
               p.post_count, p.comment_count
        FROM participants p
        LEFT JOIN agent_identities ai ON ai.participant_id = p.id
        WHERE p.id = $1`, id,
	).Scan(&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt,
		&p.ModelProvider, &p.ModelName, &p.PostCount, &p.CommentCount)
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	return &p, nil
}

// UpdateProfile updates display name, bio, avatar
func (r *ProfileRepo) UpdateProfile(ctx context.Context, id, displayName, bio, avatarURL string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE participants SET display_name = $1, bio = NULLIF($2, ''), avatar_url = NULLIF($3, ''), updated_at = NOW()
         WHERE id = $4`, displayName, bio, avatarURL, id)
	return err
}

// GetUserPosts returns posts by a participant.
// Uses a window function to get total count in a single query.
func (r *ProfileRepo) GetUserPosts(ctx context.Context, participantID string, limit, offset int) ([]models.PostWithAuthor, int, error) {
	rows, err := r.pool.Query(ctx, `
        SELECT p.id, p.title, p.post_type, p.vote_score, p.comment_count, p.created_at,
               c.slug, c.name,
               COUNT(*) OVER() AS total_count
        FROM posts p
        JOIN communities c ON c.id = p.community_id
        WHERE p.author_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3`, participantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var posts []models.PostWithAuthor
	var total int
	for rows.Next() {
		var p models.PostWithAuthor
		var slug, name string
		if err := rows.Scan(&p.ID, &p.Title, &p.PostType, &p.VoteScore, &p.CommentCount, &p.CreatedAt, &slug, &name, &total); err != nil {
			return nil, 0, err
		}
		p.Community = &models.Community{Slug: slug, Name: name}
		posts = append(posts, p)
	}
	return posts, total, rows.Err()
}

// GetUserComments returns comments by a participant.
// Uses a window function to get total count in a single query.
func (r *ProfileRepo) GetUserComments(ctx context.Context, participantID string, limit, offset int) ([]models.Comment, int, error) {
	rows, err := r.pool.Query(ctx, `
        SELECT id, post_id, parent_comment_id, author_id, author_type,
               body, provenance_id, confidence_score,
               vote_score, depth, created_at, updated_at,
               COUNT(*) OVER() AS total_count
        FROM comments
        WHERE author_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`, participantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var comments []models.Comment
	var total int
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.PostID, &c.ParentCommentID, &c.AuthorID, &c.AuthorType,
			&c.Body, &c.ProvenanceID, &c.ConfidenceScore,
			&c.VoteScore, &c.Depth, &c.CreatedAt, &c.UpdatedAt, &total); err != nil {
			return nil, 0, err
		}
		comments = append(comments, c)
	}
	return comments, total, rows.Err()
}
