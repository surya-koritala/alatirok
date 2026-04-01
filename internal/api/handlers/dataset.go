package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// DatasetHandler handles training data marketplace endpoints.
type DatasetHandler struct {
	datasets *repository.DatasetRepo
	pool     *pgxpool.Pool
}

// NewDatasetHandler creates a new DatasetHandler.
func NewDatasetHandler(datasets *repository.DatasetRepo, pool *pgxpool.Pool) *DatasetHandler {
	return &DatasetHandler{datasets: datasets, pool: pool}
}

// List handles GET /api/v1/datasets.
func (h *DatasetHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	category := q.Get("category")
	featured := q.Get("featured") == "true"
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	datasets, total, err := h.datasets.List(r.Context(), category, featured, limit, offset)
	if err != nil {
		slog.Error("list datasets failed", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to list datasets")
		return
	}

	if datasets == nil {
		datasets = []repository.Dataset{}
	}

	// Enrich each dataset with export info
	type datasetResponse struct {
		repository.Dataset
		ExportFormat  string `json:"export_format"`
		ExportExample string `json:"export_example"`
	}

	var results []datasetResponse
	for _, d := range datasets {
		exportCmd := buildExportCommand(d.Filters)
		results = append(results, datasetResponse{
			Dataset:       d,
			ExportFormat:  "jsonl",
			ExportExample: exportCmd,
		})
	}

	api.JSON(w, http.StatusOK, map[string]any{
		"datasets": results,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// Get handles GET /api/v1/datasets/{slug}.
func (h *DatasetHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		api.Error(w, http.StatusBadRequest, "slug is required")
		return
	}

	dataset, err := h.datasets.GetBySlug(r.Context(), slug)
	if err != nil {
		api.Error(w, http.StatusNotFound, "dataset not found")
		return
	}

	exportCmd := buildExportCommand(dataset.Filters)

	api.JSON(w, http.StatusOK, map[string]any{
		"dataset":        dataset,
		"export_format":  "jsonl",
		"export_example": exportCmd,
		"export_docs":    "Use the export API with the filters shown to download this dataset. Results are returned in JSONL format (one JSON object per line).",
	})
}

// Preview handles GET /api/v1/datasets/{slug}/preview.
// Returns the first 10 records of a dataset.
func (h *DatasetHandler) Preview(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		api.Error(w, http.StatusBadRequest, "slug is required")
		return
	}

	dataset, err := h.datasets.GetBySlug(r.Context(), slug)
	if err != nil {
		api.Error(w, http.StatusNotFound, "dataset not found")
		return
	}

	// Parse filters and query for preview records
	var filters map[string]string
	if err := json.Unmarshal(dataset.Filters, &filters); err != nil {
		filters = map[string]string{}
	}

	ctx := r.Context()

	query := `
		SELECT p.id, p.title, SUBSTRING(p.body FROM 1 FOR 200) as body_preview,
		       p.post_type, par.display_name, par.type, par.trust_score,
		       COALESCE(p.epistemic_status, 'hypothesis'), p.vote_score, p.created_at
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
		// Support comma-separated values
		statuses := strings.Split(es, ",")
		if len(statuses) == 1 {
			query += " AND p.epistemic_status = " + nextArg()
			args = append(args, statuses[0])
		} else {
			placeholders := make([]string, len(statuses))
			for i, s := range statuses {
				placeholders[i] = nextArg()
				args = append(args, strings.TrimSpace(s))
			}
			query += " AND p.epistemic_status IN (" + strings.Join(placeholders, ", ") + ")"
		}
	}

	query += " ORDER BY p.created_at DESC LIMIT 10"

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		slog.Error("dataset preview query failed", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to preview dataset")
		return
	}
	defer rows.Close()

	type previewRecord struct {
		ID              string    `json:"id"`
		Title           string    `json:"title"`
		BodyPreview     string    `json:"body_preview"`
		PostType        string    `json:"post_type"`
		AuthorName      string    `json:"author_name"`
		AuthorType      string    `json:"author_type"`
		TrustScore      float64   `json:"trust_score"`
		EpistemicStatus string    `json:"epistemic_status"`
		VoteScore       int       `json:"vote_score"`
		CreatedAt       time.Time `json:"created_at"`
	}

	var records []previewRecord
	for rows.Next() {
		var pr previewRecord
		if scanErr := rows.Scan(
			&pr.ID, &pr.Title, &pr.BodyPreview, &pr.PostType,
			&pr.AuthorName, &pr.AuthorType, &pr.TrustScore,
			&pr.EpistemicStatus, &pr.VoteScore, &pr.CreatedAt,
		); scanErr != nil {
			continue
		}
		records = append(records, pr)
	}

	if records == nil {
		records = []previewRecord{}
	}

	api.JSON(w, http.StatusOK, map[string]any{
		"dataset":  dataset.Name,
		"slug":     dataset.Slug,
		"preview":  records,
		"count":    len(records),
		"note":     "This is a preview showing up to 10 records. Use the export API for the full dataset.",
	})
}

// Create handles POST /api/v1/datasets.
func (h *DatasetHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req struct {
		Name        string          `json:"name"`
		Slug        string          `json:"slug"`
		Description string          `json:"description"`
		Category    string          `json:"category"`
		Filters     json.RawMessage `json:"filters"`
		IsFeatured  bool            `json:"is_featured"`
	}
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Slug == "" || req.Description == "" || req.Category == "" {
		api.Error(w, http.StatusBadRequest, "name, slug, description, and category are required")
		return
	}

	validCategories := map[string]bool{
		"debates": true, "research": true, "synthesis": true, "mixed": true,
	}
	if !validCategories[req.Category] {
		api.Error(w, http.StatusBadRequest, "category must be one of: debates, research, synthesis, mixed")
		return
	}

	creatorID := claims.ParticipantID
	dataset := &repository.Dataset{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Category:    req.Category,
		Filters:     req.Filters,
		IsFeatured:  req.IsFeatured,
		CreatedBy:   &creatorID,
	}

	result, err := h.datasets.Create(r.Context(), dataset)
	if err != nil {
		slog.Error("create dataset failed", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to create dataset")
		return
	}

	api.JSON(w, http.StatusCreated, result)
}

// buildExportCommand generates an example curl command based on dataset filters.
func buildExportCommand(filtersRaw json.RawMessage) string {
	var filters map[string]string
	if err := json.Unmarshal(filtersRaw, &filters); err != nil {
		return `curl "https://www.alatirok.com/api/v1/export/posts?format=jsonl"`
	}

	params := []string{"format=jsonl"}
	if pt, ok := filters["post_type"]; ok && pt != "" {
		params = append(params, "post_type="+pt)
	}
	if mt, ok := filters["min_trust"]; ok && mt != "" {
		params = append(params, "min_trust="+mt)
	}
	if es, ok := filters["epistemic_status"]; ok && es != "" {
		params = append(params, "epistemic_status="+es)
	}

	return fmt.Sprintf(`curl "https://www.alatirok.com/api/v1/export/posts?%s"`, strings.Join(params, "&"))
}
