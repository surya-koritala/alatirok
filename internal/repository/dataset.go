package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Dataset represents a curated training dataset listing.
type Dataset struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Slug          string          `json:"slug"`
	Description   string          `json:"description"`
	Category      string          `json:"category"`
	Filters       json.RawMessage `json:"filters"`
	PostCount     int             `json:"post_count"`
	CommentCount  int             `json:"comment_count"`
	AvgTrustScore float64         `json:"avg_trust_score"`
	IsFeatured    bool            `json:"is_featured"`
	CreatedBy     *string         `json:"created_by,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// DatasetRepo handles database operations for the datasets table.
type DatasetRepo struct {
	pool *pgxpool.Pool
}

// NewDatasetRepo creates a new DatasetRepo.
func NewDatasetRepo(pool *pgxpool.Pool) *DatasetRepo {
	return &DatasetRepo{pool: pool}
}

// Create inserts a new dataset listing.
func (r *DatasetRepo) Create(ctx context.Context, d *Dataset) (*Dataset, error) {
	filters := d.Filters
	if len(filters) == 0 {
		filters = json.RawMessage(`{}`)
	}

	var result Dataset
	err := r.pool.QueryRow(ctx, `
		INSERT INTO datasets (name, slug, description, category, filters, is_featured, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, slug, description, category, filters, post_count, comment_count,
		          avg_trust_score, is_featured, created_by, created_at, updated_at`,
		d.Name, d.Slug, d.Description, d.Category, filters, d.IsFeatured, d.CreatedBy,
	).Scan(
		&result.ID, &result.Name, &result.Slug, &result.Description, &result.Category,
		&result.Filters, &result.PostCount, &result.CommentCount,
		&result.AvgTrustScore, &result.IsFeatured, &result.CreatedBy, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create dataset: %w", err)
	}
	return &result, nil
}

// List returns datasets with optional filtering.
func (r *DatasetRepo) List(ctx context.Context, category string, featured bool, limit, offset int) ([]Dataset, int, error) {
	// Build dynamic query
	query := `SELECT id, name, slug, description, category, filters, post_count, comment_count,
	                 avg_trust_score, is_featured, created_by, created_at, updated_at
	          FROM datasets WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM datasets WHERE 1=1`

	args := []any{}
	argIdx := 0
	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	if category != "" {
		clause := " AND category = " + nextArg()
		query += clause
		countQuery += clause
		args = append(args, category)
	}
	if featured {
		clause := " AND is_featured = " + nextArg()
		query += clause
		countQuery += clause
		args = append(args, true)
	}

	// Get total count
	var total int
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count datasets: %w", err)
	}

	query += " ORDER BY is_featured DESC, created_at DESC"
	query += fmt.Sprintf(" LIMIT %s", nextArg())
	args = append(args, limit)
	query += fmt.Sprintf(" OFFSET %s", nextArg())
	args = append(args, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list datasets: %w", err)
	}
	defer rows.Close()

	var datasets []Dataset
	for rows.Next() {
		var d Dataset
		if scanErr := rows.Scan(
			&d.ID, &d.Name, &d.Slug, &d.Description, &d.Category, &d.Filters,
			&d.PostCount, &d.CommentCount, &d.AvgTrustScore, &d.IsFeatured,
			&d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
		); scanErr != nil {
			return nil, 0, fmt.Errorf("scan dataset: %w", scanErr)
		}
		datasets = append(datasets, d)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate datasets: %w", err)
	}

	return datasets, total, nil
}

// GetBySlug returns a single dataset by its slug.
func (r *DatasetRepo) GetBySlug(ctx context.Context, slug string) (*Dataset, error) {
	var d Dataset
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, slug, description, category, filters, post_count, comment_count,
		       avg_trust_score, is_featured, created_by, created_at, updated_at
		FROM datasets WHERE slug = $1`, slug).Scan(
		&d.ID, &d.Name, &d.Slug, &d.Description, &d.Category, &d.Filters,
		&d.PostCount, &d.CommentCount, &d.AvgTrustScore, &d.IsFeatured,
		&d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get dataset by slug: %w", err)
	}
	return &d, nil
}

// UpdateStats recalculates post_count, comment_count, and avg_trust_score for a dataset
// based on its filters.
func (r *DatasetRepo) UpdateStats(ctx context.Context, id string) error {
	// Fetch the dataset's filters
	var filtersRaw json.RawMessage
	err := r.pool.QueryRow(ctx, `SELECT filters FROM datasets WHERE id = $1`, id).Scan(&filtersRaw)
	if err != nil {
		return fmt.Errorf("get dataset filters: %w", err)
	}

	var filters map[string]string
	if err := json.Unmarshal(filtersRaw, &filters); err != nil {
		return fmt.Errorf("parse dataset filters: %w", err)
	}

	// Build a dynamic query based on filters
	query := `SELECT COUNT(*), 0, COALESCE(AVG(par.trust_score), 0)
	          FROM posts p
	          JOIN participants par ON par.id = p.author_id
	          WHERE p.deleted_at IS NULL`

	args := []any{}
	argIdx := 0
	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	if pt, ok := filters["post_type"]; ok && pt != "" {
		query += " AND p.post_type = " + nextArg()
		args = append(args, pt)
	}
	if mt, ok := filters["min_trust"]; ok && mt != "" {
		query += " AND par.trust_score >= " + nextArg()
		args = append(args, mt)
	}
	if es, ok := filters["epistemic_status"]; ok && es != "" {
		query += " AND p.epistemic_status = " + nextArg()
		args = append(args, es)
	}

	var postCount int
	var commentCount int
	var avgTrust float64
	if err := r.pool.QueryRow(ctx, query, args...).Scan(&postCount, &commentCount, &avgTrust); err != nil {
		return fmt.Errorf("update dataset stats query: %w", err)
	}

	_, err = r.pool.Exec(ctx, `
		UPDATE datasets SET post_count = $1, comment_count = $2, avg_trust_score = $3, updated_at = NOW()
		WHERE id = $4`, postCount, commentCount, avgTrust, id)
	if err != nil {
		return fmt.Errorf("update dataset stats: %w", err)
	}

	return nil
}
