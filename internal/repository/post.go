package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

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
// reputation_score, type, is_verified), then agent identity fields, then
// community fields, then provenance fields.
func scanPostWithAuthor(row interface {
	Scan(dest ...any) error
}) (models.PostWithAuthor, error) {
	var p models.PostWithAuthor
	var communitySlug, communityName string
	// Agent identity fields (nullable via LEFT JOIN)
	var modelProvider, modelName string
	// Provenance fields (nullable via LEFT JOIN)
	var provSources []string
	var provConfidence *float64
	var provMethod *string
	// Metadata JSONB bytes
	var metadataBytes []byte
	err := row.Scan(
		&p.ID, &p.CommunityID, &p.AuthorID, &p.AuthorType,
		&p.Title, &p.Body, &p.URL,
		&p.PostType, &p.ProvenanceID, &p.ConfidenceScore,
		&p.VoteScore, &p.CommentCount, &p.Tags, &metadataBytes, &p.CreatedAt, &p.UpdatedAt,
		&p.DeletedAt, &p.SupersededBy, &p.IsRetracted, &p.RetractionNotice,
		&p.IsPinned, &p.PinnedAt,
		&p.Author.DisplayName, &p.Author.AvatarURL,
		&p.Author.TrustScore, &p.Author.ReputationScore,
		&p.Author.Type, &p.Author.IsVerified,
		&modelProvider, &modelName,
		&communitySlug, &communityName,
		&provSources, &provConfidence, &provMethod,
	)
	if err != nil {
		return p, err
	}
	if len(metadataBytes) > 0 {
		p.Metadata = make(map[string]any)
		_ = json.Unmarshal(metadataBytes, &p.Metadata)
	}
	p.Author.ID = p.AuthorID
	p.Author.ModelProvider = modelProvider
	p.Author.ModelName = modelName
	p.Community = &models.Community{
		ID:   p.CommunityID,
		Slug: communitySlug,
		Name: communityName,
	}
	// Populate Provenance if provenance_id is set
	if p.ProvenanceID != nil {
		confidence := 0.0
		if provConfidence != nil {
			confidence = *provConfidence
		}
		method := models.GenerationMethod("")
		if provMethod != nil {
			method = models.GenerationMethod(*provMethod)
		}
		sources := provSources
		if sources == nil {
			sources = []string{}
		}
		p.Provenance = &models.Provenance{
			ID:               *p.ProvenanceID,
			Sources:          sources,
			ConfidenceScore:  confidence,
			GenerationMethod: method,
		}
	}
	return p, nil
}

// scanPostWithAuthorAndTotal scans a row into a PostWithAuthor plus an
// additional trailing total_count column (from COUNT(*) OVER() window function).
func scanPostWithAuthorAndTotal(row interface {
	Scan(dest ...any) error
}) (models.PostWithAuthor, int, error) {
	var p models.PostWithAuthor
	var communitySlug, communityName string
	var modelProvider, modelName string
	var provSources []string
	var provConfidence *float64
	var provMethod *string
	var metadataBytes []byte
	var totalCount int
	err := row.Scan(
		&p.ID, &p.CommunityID, &p.AuthorID, &p.AuthorType,
		&p.Title, &p.Body, &p.URL,
		&p.PostType, &p.ProvenanceID, &p.ConfidenceScore,
		&p.VoteScore, &p.CommentCount, &p.Tags, &metadataBytes, &p.CreatedAt, &p.UpdatedAt,
		&p.DeletedAt, &p.SupersededBy, &p.IsRetracted, &p.RetractionNotice,
		&p.IsPinned, &p.PinnedAt,
		&p.Author.DisplayName, &p.Author.AvatarURL,
		&p.Author.TrustScore, &p.Author.ReputationScore,
		&p.Author.Type, &p.Author.IsVerified,
		&modelProvider, &modelName,
		&communitySlug, &communityName,
		&provSources, &provConfidence, &provMethod,
		&totalCount,
	)
	if err != nil {
		return p, 0, err
	}
	if len(metadataBytes) > 0 {
		p.Metadata = make(map[string]any)
		_ = json.Unmarshal(metadataBytes, &p.Metadata)
	}
	p.Author.ID = p.AuthorID
	p.Author.ModelProvider = modelProvider
	p.Author.ModelName = modelName
	p.Community = &models.Community{
		ID:   p.CommunityID,
		Slug: communitySlug,
		Name: communityName,
	}
	if p.ProvenanceID != nil {
		confidence := 0.0
		if provConfidence != nil {
			confidence = *provConfidence
		}
		method := models.GenerationMethod("")
		if provMethod != nil {
			method = models.GenerationMethod(*provMethod)
		}
		sources := provSources
		if sources == nil {
			sources = []string{}
		}
		p.Provenance = &models.Provenance{
			ID:               *p.ProvenanceID,
			Sources:          sources,
			ConfidenceScore:  confidence,
			GenerationMethod: method,
		}
	}
	return p, totalCount, nil
}

const postJoinSelect = `
	SELECT
		p.id, p.community_id, p.author_id, p.author_type,
		p.title, p.body, COALESCE(p.url, '') AS url,
		p.post_type, p.provenance_id, p.confidence_score,
		p.vote_score, p.comment_count, COALESCE(p.tags, '{}') AS tags, p.metadata, p.created_at, p.updated_at,
		p.deleted_at, p.superseded_by, p.is_retracted, p.retraction_notice,
		p.is_pinned, p.pinned_at,
		part.display_name, COALESCE(part.avatar_url, '') AS avatar_url,
		part.trust_score, part.reputation_score,
		part.type, part.is_verified,
		COALESCE(ai.model_provider, '') AS model_provider,
		COALESCE(ai.model_name, '') AS model_name,
		c.slug, c.name,
		prov.sources, prov.confidence_score AS prov_confidence, prov.generation_method
	FROM posts p
	JOIN participants part ON part.id = p.author_id
	LEFT JOIN agent_identities ai ON ai.participant_id = p.author_id
	JOIN communities c ON c.id = p.community_id
	LEFT JOIN provenances prov ON prov.id = p.provenance_id`

// postJoinSelectWithTotal is the same as postJoinSelect but appends a
// COUNT(*) OVER() window function so the total count is returned with each
// row, eliminating the need for a separate COUNT query.
const postJoinSelectWithTotal = `
	SELECT
		p.id, p.community_id, p.author_id, p.author_type,
		p.title, p.body, COALESCE(p.url, '') AS url,
		p.post_type, p.provenance_id, p.confidence_score,
		p.vote_score, p.comment_count, COALESCE(p.tags, '{}') AS tags, p.metadata, p.created_at, p.updated_at,
		p.deleted_at, p.superseded_by, p.is_retracted, p.retraction_notice,
		p.is_pinned, p.pinned_at,
		part.display_name, COALESCE(part.avatar_url, '') AS avatar_url,
		part.trust_score, part.reputation_score,
		part.type, part.is_verified,
		COALESCE(ai.model_provider, '') AS model_provider,
		COALESCE(ai.model_name, '') AS model_name,
		c.slug, c.name,
		prov.sources, prov.confidence_score AS prov_confidence, prov.generation_method,
		COUNT(*) OVER() AS total_count
	FROM posts p
	JOIN participants part ON part.id = p.author_id
	LEFT JOIN agent_identities ai ON ai.participant_id = p.author_id
	JOIN communities c ON c.id = p.community_id
	LEFT JOIN provenances prov ON prov.id = p.provenance_id`

// Create inserts a new post. Defaults post_type to "text" if empty.
// Also atomically increments the author's post_count on the participants table.
func (r *PostRepo) Create(ctx context.Context, p *models.Post) (*models.Post, error) {
	if p.PostType == "" {
		p.PostType = models.PostTypeText
	}
	if p.Metadata == nil {
		p.Metadata = map[string]any{}
	}

	if p.Tags == nil {
		p.Tags = []string{}
	}

	metadataJSON, err := json.Marshal(p.Metadata)
	if err != nil {
		return nil, fmt.Errorf("marshal metadata: %w", err)
	}

	var result models.Post
	var resultMetaBytes []byte
	err = r.pool.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO posts
			  (community_id, author_id, author_type, title, body, url, post_type,
			   metadata, provenance_id, confidence_score, tags)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9, $10, $11)
			RETURNING
			  id, community_id, author_id, author_type,
			  title, body, COALESCE(url, '') AS url,
			  post_type, provenance_id, confidence_score,
			  vote_score, comment_count, COALESCE(tags, '{}') AS tags, metadata, created_at, updated_at
		), bump AS (
			UPDATE participants SET post_count = post_count + 1
			WHERE id = $2
		)
		SELECT * FROM inserted`,
		p.CommunityID,
		p.AuthorID,
		p.AuthorType,
		p.Title,
		p.Body,
		p.URL,
		p.PostType,
		metadataJSON,
		p.ProvenanceID,
		p.ConfidenceScore,
		p.Tags,
	).Scan(
		&result.ID, &result.CommunityID, &result.AuthorID, &result.AuthorType,
		&result.Title, &result.Body, &result.URL,
		&result.PostType, &result.ProvenanceID, &result.ConfidenceScore,
		&result.VoteScore, &result.CommentCount, &result.Tags, &resultMetaBytes, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert post: %w", err)
	}
	if len(resultMetaBytes) > 0 {
		result.Metadata = make(map[string]any)
		_ = json.Unmarshal(resultMetaBytes, &result.Metadata)
	}
	return &result, nil
}

// CreateWithCrosspost inserts a new post with a crossposted_from reference.
func (r *PostRepo) CreateWithCrosspost(ctx context.Context, p *models.Post) (*models.Post, error) {
	if p.PostType == "" {
		p.PostType = models.PostTypeText
	}
	if p.Metadata == nil {
		p.Metadata = map[string]any{}
	}
	if p.Tags == nil {
		p.Tags = []string{}
	}

	metadataJSON, err := json.Marshal(p.Metadata)
	if err != nil {
		return nil, fmt.Errorf("marshal metadata: %w", err)
	}

	var result models.Post
	var resultMetaBytes []byte
	err = r.pool.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO posts
			  (community_id, author_id, author_type, title, body, url, post_type,
			   metadata, provenance_id, confidence_score, tags, crossposted_from)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9, $10, $11, $12)
			RETURNING
			  id, community_id, author_id, author_type,
			  title, body, COALESCE(url, '') AS url,
			  post_type, provenance_id, confidence_score,
			  vote_score, comment_count, COALESCE(tags, '{}') AS tags, metadata, created_at, updated_at,
			  crossposted_from
		), bump AS (
			UPDATE participants SET post_count = post_count + 1
			WHERE id = $2
		)
		SELECT * FROM inserted`,
		p.CommunityID,
		p.AuthorID,
		p.AuthorType,
		p.Title,
		p.Body,
		p.URL,
		p.PostType,
		metadataJSON,
		p.ProvenanceID,
		p.ConfidenceScore,
		p.Tags,
		p.CrosspostedFrom,
	).Scan(
		&result.ID, &result.CommunityID, &result.AuthorID, &result.AuthorType,
		&result.Title, &result.Body, &result.URL,
		&result.PostType, &result.ProvenanceID, &result.ConfidenceScore,
		&result.VoteScore, &result.CommentCount, &result.Tags, &resultMetaBytes, &result.CreatedAt, &result.UpdatedAt,
		&result.CrosspostedFrom,
	)
	if err != nil {
		return nil, fmt.Errorf("insert crosspost: %w", err)
	}
	if len(resultMetaBytes) > 0 {
		result.Metadata = make(map[string]any)
		_ = json.Unmarshal(resultMetaBytes, &result.Metadata)
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

// ListByCommunity returns paginated posts for a community with the given sort and optional post type filter.
// Returns the posts slice, total count, and any error.
// Uses a window function COUNT(*) OVER() to get the total in a single query.
// If cursor is non-empty, uses cursor-based pagination (WHERE created_at < cursor's created_at) instead of OFFSET.
func (r *PostRepo) ListByCommunity(ctx context.Context, communityID string, sort string, postType string, limit, offset int, cursor ...string) ([]models.PostWithAuthor, int, error) {
	orderBy := orderByClause(sort)

	var whereClauses []string
	queryArgs := []any{communityID}
	whereClauses = append(whereClauses, `p.community_id = $1`)
	if postType != "" {
		queryArgs = append(queryArgs, postType)
		whereClauses = append(whereClauses, fmt.Sprintf(`p.post_type = $%d`, len(queryArgs)))
	}

	useCursor := len(cursor) > 0 && cursor[0] != ""
	if useCursor {
		queryArgs = append(queryArgs, cursor[0])
		whereClauses = append(whereClauses, fmt.Sprintf(`p.created_at < (SELECT created_at FROM posts WHERE id = $%d)`, len(queryArgs)))
	}

	queryArgs = append(queryArgs, limit)
	limitParam := fmt.Sprintf(`$%d`, len(queryArgs))

	var offsetClause string
	if !useCursor {
		queryArgs = append(queryArgs, offset)
		offsetClause = fmt.Sprintf(` OFFSET $%d`, len(queryArgs))
	}

	rows, err := r.pool.Query(ctx, postJoinSelectWithTotal+`
	WHERE `+strings.Join(whereClauses, " AND ")+`
	ORDER BY p.is_pinned DESC, `+orderBy+`
	LIMIT `+limitParam+offsetClause,
		queryArgs...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list posts by community: %w", err)
	}
	defer rows.Close()

	var posts []models.PostWithAuthor
	var total int
	for rows.Next() {
		p, rowTotal, err := scanPostWithAuthorAndTotal(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning post row: %w", err)
		}
		total = rowTotal
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating post rows: %w", err)
	}

	return posts, total, nil
}

// Update edits an existing post's content. Only updates non-deleted posts.
func (r *PostRepo) Update(ctx context.Context, id, title, body string, postType string, metadata map[string]any, tags []string) error {
	metaJSON, _ := json.Marshal(metadata)
	_, err := r.pool.Exec(ctx,
		`UPDATE posts SET title = $1, body = $2, post_type = $3, metadata = $4, tags = $5, updated_at = NOW()
         WHERE id = $6 AND deleted_at IS NULL`,
		title, body, postType, metaJSON, tags, id)
	return err
}

// SoftDelete marks a post as deleted by setting deleted_at.
func (r *PostRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE posts SET deleted_at = NOW() WHERE id = $1`, id)
	return err
}

// Supersede links oldID to newID, marking it as superseded.
func (r *PostRepo) Supersede(ctx context.Context, oldID, newID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE posts SET superseded_by = $1 WHERE id = $2`, newID, oldID)
	return err
}

// Retract marks a post as retracted with a notice.
func (r *PostRepo) Retract(ctx context.Context, id, notice string) error {
	_, err := r.pool.Exec(ctx, `UPDATE posts SET is_retracted = TRUE, retraction_notice = $1 WHERE id = $2`, notice, id)
	return err
}

// TogglePin pins or unpins a post.
func (r *PostRepo) TogglePin(ctx context.Context, postID string, pin bool) error {
	if pin {
		_, err := r.pool.Exec(ctx, `UPDATE posts SET is_pinned = TRUE, pinned_at = NOW() WHERE id = $1`, postID)
		return err
	}
	_, err := r.pool.Exec(ctx, `UPDATE posts SET is_pinned = FALSE, pinned_at = NULL WHERE id = $1`, postID)
	return err
}

// AcceptAnswer sets the accepted_answer_id on a post.
func (r *PostRepo) AcceptAnswer(ctx context.Context, postID, commentID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE posts SET accepted_answer_id = $1 WHERE id = $2`,
		commentID, postID)
	return err
}

// ListBySubscriptions returns paginated posts from communities the participant is subscribed to.
// Returns the posts slice, total count, and any error.
// Uses a window function COUNT(*) OVER() to get the total in a single query.
// If cursor is non-empty, uses cursor-based pagination instead of OFFSET.
func (r *PostRepo) ListBySubscriptions(ctx context.Context, participantID string, sort string, postType string, limit, offset int, cursor ...string) ([]models.PostWithAuthor, int, error) {
	orderBy := orderByClause(sort)

	var whereClauses []string
	queryArgs := []any{participantID}
	whereClauses = append(whereClauses, `p.community_id IN (SELECT community_id FROM community_subscriptions WHERE participant_id = $1)`)
	whereClauses = append(whereClauses, `p.deleted_at IS NULL`)
	if postType != "" {
		queryArgs = append(queryArgs, postType)
		whereClauses = append(whereClauses, fmt.Sprintf(`p.post_type = $%d`, len(queryArgs)))
	}

	useCursor := len(cursor) > 0 && cursor[0] != ""
	if useCursor {
		queryArgs = append(queryArgs, cursor[0])
		whereClauses = append(whereClauses, fmt.Sprintf(`p.created_at < (SELECT created_at FROM posts WHERE id = $%d)`, len(queryArgs)))
	}

	queryArgs = append(queryArgs, limit)
	limitParam := fmt.Sprintf(`$%d`, len(queryArgs))

	var offsetClause string
	if !useCursor {
		queryArgs = append(queryArgs, offset)
		offsetClause = fmt.Sprintf(` OFFSET $%d`, len(queryArgs))
	}

	rows, err := r.pool.Query(ctx, postJoinSelectWithTotal+`
	WHERE `+strings.Join(whereClauses, " AND ")+`
	ORDER BY p.is_pinned DESC, `+orderBy+`
	LIMIT `+limitParam+offsetClause,
		queryArgs...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list subscription posts: %w", err)
	}
	defer rows.Close()

	var posts []models.PostWithAuthor
	var total int
	for rows.Next() {
		p, rowTotal, err := scanPostWithAuthorAndTotal(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning subscription post row: %w", err)
		}
		total = rowTotal
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating subscription post rows: %w", err)
	}

	return posts, total, nil
}

// ListGlobal returns paginated posts across all communities with the given sort and optional post type filter.
// Returns the posts slice, total count, and any error.
// Uses a window function COUNT(*) OVER() to get the total in a single query.
// If cursor is non-empty, uses cursor-based pagination instead of OFFSET.
func (r *PostRepo) ListGlobal(ctx context.Context, sort string, postType string, limit, offset int, cursor ...string) ([]models.PostWithAuthor, int, error) {
	orderBy := orderByClause(sort)

	var queryArgs []any
	var whereClauses []string

	if postType != "" {
		queryArgs = append(queryArgs, postType)
		whereClauses = append(whereClauses, `p.post_type = $1`)
	}

	useCursor := len(cursor) > 0 && cursor[0] != ""
	if useCursor {
		queryArgs = append(queryArgs, cursor[0])
		whereClauses = append(whereClauses, fmt.Sprintf(`p.created_at < (SELECT created_at FROM posts WHERE id = $%d)`, len(queryArgs)))
	}

	var whereClause string
	if len(whereClauses) > 0 {
		whereClause = `
	WHERE ` + strings.Join(whereClauses, " AND ")
	}

	queryArgs = append(queryArgs, limit)
	limitParam := fmt.Sprintf(`$%d`, len(queryArgs))

	var offsetClause string
	if !useCursor {
		queryArgs = append(queryArgs, offset)
		offsetClause = fmt.Sprintf(` OFFSET $%d`, len(queryArgs))
	}

	rows, err := r.pool.Query(ctx, postJoinSelectWithTotal+whereClause+`
	ORDER BY `+orderBy+`
	LIMIT `+limitParam+offsetClause,
		queryArgs...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list global posts: %w", err)
	}
	defer rows.Close()

	var posts []models.PostWithAuthor
	var total int
	for rows.Next() {
		p, rowTotal, err := scanPostWithAuthorAndTotal(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning global post row: %w", err)
		}
		total = rowTotal
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating global post rows: %w", err)
	}

	return posts, total, nil
}
