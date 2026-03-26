package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

// PostRepo handles database operations for posts.
type PostRepo struct {
	pool *pgxpool.Pool
}

// NewPostRepo creates a new PostRepo.
func NewPostRepo(pool *pgxpool.Pool) *PostRepo {
	return &PostRepo{pool: pool}
}

// orderByClause returns the ORDER BY expression for the given sort mode.
func orderByClause(sort string) string {
	switch sort {
	case "new":
		return "p.created_at DESC"
	case "top":
		return "p.vote_score DESC, p.created_at DESC"
	case "rising":
		return "(p.vote_score::float / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 1)) DESC"
	default: // "hot"
		return "(LOG(GREATEST(ABS(p.vote_score), 1)) + SIGN(p.vote_score) * EXTRACT(EPOCH FROM p.created_at) / 45000) DESC"
	}
}

// scanPostWithAuthor scans a row into a PostWithAuthor. The row must contain
// post fields followed by author fields (display_name, avatar_url, trust_score,
// reputation_score, type, is_verified).
func scanPostWithAuthor(row interface {
	Scan(dest ...any) error
}) (models.PostWithAuthor, error) {
	var p models.PostWithAuthor
	var communitySlug, communityName string
	err := row.Scan(
		&p.ID, &p.CommunityID, &p.AuthorID, &p.AuthorType,
		&p.Title, &p.Body, &p.URL,
		&p.ContentType, &p.ProvenanceID, &p.ConfidenceScore,
		&p.VoteScore, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
		&p.Author.DisplayName, &p.Author.AvatarURL,
		&p.Author.TrustScore, &p.Author.ReputationScore,
		&p.Author.Type, &p.Author.IsVerified,
		&communitySlug, &communityName,
	)
	if err != nil {
		return p, err
	}
	p.Author.ID = p.AuthorID
	p.Community = &models.Community{
		ID:   p.CommunityID,
		Slug: communitySlug,
		Name: communityName,
	}
	return p, nil
}

const postJoinSelect = `
	SELECT
		p.id, p.community_id, p.author_id, p.author_type,
		p.title, p.body, COALESCE(p.url, '') AS url,
		p.content_type, p.provenance_id, p.confidence_score,
		p.vote_score, p.comment_count, p.created_at, p.updated_at,
		part.display_name, COALESCE(part.avatar_url, '') AS avatar_url,
		part.trust_score, part.reputation_score,
		part.type, part.is_verified,
		c.slug, c.name
	FROM posts p
	JOIN participants part ON part.id = p.author_id
	JOIN communities c ON c.id = p.community_id`

// Create inserts a new post. Defaults content_type to "text" if empty.
func (r *PostRepo) Create(ctx context.Context, p *models.Post) (*models.Post, error) {
	if p.ContentType == "" {
		p.ContentType = models.ContentText
	}

	var result models.Post
	err := r.pool.QueryRow(ctx, `
		INSERT INTO posts
		  (community_id, author_id, author_type, title, body, url, content_type,
		   provenance_id, confidence_score)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9)
		RETURNING
		  id, community_id, author_id, author_type,
		  title, body, COALESCE(url, '') AS url,
		  content_type, provenance_id, confidence_score,
		  vote_score, comment_count, created_at, updated_at`,
		p.CommunityID,
		p.AuthorID,
		p.AuthorType,
		p.Title,
		p.Body,
		p.URL,
		p.ContentType,
		p.ProvenanceID,
		p.ConfidenceScore,
	).Scan(
		&result.ID, &result.CommunityID, &result.AuthorID, &result.AuthorType,
		&result.Title, &result.Body, &result.URL,
		&result.ContentType, &result.ProvenanceID, &result.ConfidenceScore,
		&result.VoteScore, &result.CommentCount, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert post: %w", err)
	}
	return &result, nil
}

// GetByID returns a post joined with its author's participant data.
func (r *PostRepo) GetByID(ctx context.Context, id string) (*models.PostWithAuthor, error) {
	row := r.pool.QueryRow(ctx, postJoinSelect+`
	WHERE p.id = $1`, id)

	p, err := scanPostWithAuthor(row)
	if err != nil {
		return nil, fmt.Errorf("get post by id: %w", err)
	}
	return &p, nil
}

// ListByCommunity returns paginated posts for a community with the given sort.
// Returns the posts slice, total count, and any error.
func (r *PostRepo) ListByCommunity(ctx context.Context, communityID string, sort string, limit, offset int) ([]models.PostWithAuthor, int, error) {
	var total int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM posts p WHERE p.community_id = $1`,
		communityID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count posts by community: %w", err)
	}

	orderBy := orderByClause(sort)
	rows, err := r.pool.Query(ctx, postJoinSelect+`
	WHERE p.community_id = $1
	ORDER BY `+orderBy+`
	LIMIT $2 OFFSET $3`,
		communityID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list posts by community: %w", err)
	}
	defer rows.Close()

	var posts []models.PostWithAuthor
	for rows.Next() {
		p, err := scanPostWithAuthor(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning post row: %w", err)
		}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating post rows: %w", err)
	}

	return posts, total, nil
}

// ListGlobal returns paginated posts across all communities with the given sort.
// Returns the posts slice, total count, and any error.
func (r *PostRepo) ListGlobal(ctx context.Context, sort string, limit, offset int) ([]models.PostWithAuthor, int, error) {
	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count global posts: %w", err)
	}

	orderBy := orderByClause(sort)
	rows, err := r.pool.Query(ctx, postJoinSelect+`
	ORDER BY `+orderBy+`
	LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list global posts: %w", err)
	}
	defer rows.Close()

	var posts []models.PostWithAuthor
	for rows.Next() {
		p, err := scanPostWithAuthor(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning global post row: %w", err)
		}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating global post rows: %w", err)
	}

	return posts, total, nil
}
