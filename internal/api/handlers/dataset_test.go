package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/surya-koritala/alatirok/internal/api/handlers"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/repository"
	"github.com/surya-koritala/alatirok/internal/testutil"
)

func setupDatasetTest(t *testing.T) (*handlers.DatasetHandler, *repository.DatasetRepo, *repository.ParticipantRepo, *config.Config) {
	t.Helper()
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "datasets", "epistemic_votes", "provenances", "reputation_events", "votes", "comments", "posts", "community_subscriptions", "communities", "api_keys", "agent_identities", "human_users", "participants")

	// Ensure datasets table exists (migration might not have run in test DB)
	_, _ = pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS datasets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name VARCHAR(200) NOT NULL,
			slug VARCHAR(100) NOT NULL UNIQUE,
			description TEXT NOT NULL,
			category VARCHAR(50) NOT NULL,
			filters JSONB NOT NULL DEFAULT '{}',
			post_count INTEGER DEFAULT 0,
			comment_count INTEGER DEFAULT 0,
			avg_trust_score DOUBLE PRECISION DEFAULT 0,
			is_featured BOOLEAN DEFAULT false,
			created_by UUID REFERENCES participants(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)

	datasetRepo := repository.NewDatasetRepo(pool)
	participants := repository.NewParticipantRepo(pool)
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret: "test-secret-key-for-testing",
			Expiry: time.Hour,
		},
	}
	return handlers.NewDatasetHandler(datasetRepo, pool), datasetRepo, participants, cfg
}

func TestDatasetHandler_List_Empty(t *testing.T) {
	handler, _, _, _ := setupDatasetTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets", nil)
	rec := httptest.NewRecorder()

	handler.List(rec, req)
	testutil.AssertStatus(t, rec, http.StatusOK)

	var result map[string]any
	testutil.DecodeResponse(t, rec, &result)

	datasets, ok := result["datasets"].([]any)
	if !ok {
		t.Fatal("expected datasets to be an array")
	}
	if len(datasets) != 0 {
		t.Errorf("expected 0 datasets, got %d", len(datasets))
	}

	total := result["total"].(float64)
	if total != 0 {
		t.Errorf("expected total 0, got %v", total)
	}
}

func TestDatasetHandler_Create_Success(t *testing.T) {
	handler, _, participants, cfg := setupDatasetTest(t)
	_, token := registerTestUser(t, participants, cfg, "dataset-creator@example.com", "DatasetCreator")

	req := testutil.JSONRequestWithAuth(t, http.MethodPost, "/api/v1/datasets", token, map[string]any{
		"name":        "Test Dataset",
		"slug":        "test-dataset",
		"description": "A test dataset for unit testing",
		"category":    "debates",
		"filters":     map[string]string{"post_type": "debate"},
		"is_featured": true,
	})
	rec := httptest.NewRecorder()

	protected := middleware.Auth(cfg.JWT.Secret)(http.HandlerFunc(handler.Create))
	protected.ServeHTTP(rec, req)

	testutil.AssertStatus(t, rec, http.StatusCreated)

	var result map[string]any
	testutil.DecodeResponse(t, rec, &result)

	if result["name"] != "Test Dataset" {
		t.Errorf("expected name 'Test Dataset', got %q", result["name"])
	}
	if result["slug"] != "test-dataset" {
		t.Errorf("expected slug 'test-dataset', got %q", result["slug"])
	}
	if result["category"] != "debates" {
		t.Errorf("expected category 'debates', got %q", result["category"])
	}
	if result["is_featured"] != true {
		t.Errorf("expected is_featured true, got %v", result["is_featured"])
	}
}

func TestDatasetHandler_Create_InvalidCategory(t *testing.T) {
	handler, _, participants, cfg := setupDatasetTest(t)
	_, token := registerTestUser(t, participants, cfg, "dataset-bad-cat@example.com", "DatasetBadCat")

	req := testutil.JSONRequestWithAuth(t, http.MethodPost, "/api/v1/datasets", token, map[string]any{
		"name":        "Bad Dataset",
		"slug":        "bad-dataset",
		"description": "Invalid category",
		"category":    "invalid",
	})
	rec := httptest.NewRecorder()

	protected := middleware.Auth(cfg.JWT.Secret)(http.HandlerFunc(handler.Create))
	protected.ServeHTTP(rec, req)

	testutil.AssertStatus(t, rec, http.StatusBadRequest)
}

func TestDatasetHandler_Create_MissingFields(t *testing.T) {
	handler, _, participants, cfg := setupDatasetTest(t)
	_, token := registerTestUser(t, participants, cfg, "dataset-missing@example.com", "DatasetMissing")

	req := testutil.JSONRequestWithAuth(t, http.MethodPost, "/api/v1/datasets", token, map[string]any{
		"name": "Incomplete",
	})
	rec := httptest.NewRecorder()

	protected := middleware.Auth(cfg.JWT.Secret)(http.HandlerFunc(handler.Create))
	protected.ServeHTTP(rec, req)

	testutil.AssertStatus(t, rec, http.StatusBadRequest)
}

func TestDatasetHandler_Get_Success(t *testing.T) {
	handler, datasetRepo, participants, cfg := setupDatasetTest(t)
	participant, _ := registerTestUser(t, participants, cfg, "dataset-get@example.com", "DatasetGet")

	// Create a dataset directly via repo
	_, err := datasetRepo.Create(context.Background(), &repository.Dataset{
		Name:        "Fetch Dataset",
		Slug:        "fetch-dataset",
		Description: "A dataset to fetch",
		Category:    "research",
		Filters:     json.RawMessage(`{"post_type": "synthesis"}`),
		CreatedBy:   &participant.ID,
	})
	if err != nil {
		t.Fatalf("creating dataset: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets/fetch-dataset", nil)
	req.SetPathValue("slug", "fetch-dataset")
	rec := httptest.NewRecorder()

	handler.Get(rec, req)
	testutil.AssertStatus(t, rec, http.StatusOK)

	var result map[string]any
	testutil.DecodeResponse(t, rec, &result)

	dataset, ok := result["dataset"].(map[string]any)
	if !ok {
		t.Fatal("expected dataset to be a map")
	}
	if dataset["name"] != "Fetch Dataset" {
		t.Errorf("expected name 'Fetch Dataset', got %q", dataset["name"])
	}

	if result["export_format"] != "jsonl" {
		t.Errorf("expected export_format 'jsonl', got %q", result["export_format"])
	}
	if result["export_example"] == nil || result["export_example"] == "" {
		t.Error("expected non-empty export_example")
	}
}

func TestDatasetHandler_Get_NotFound(t *testing.T) {
	handler, _, _, _ := setupDatasetTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets/nonexistent", nil)
	req.SetPathValue("slug", "nonexistent")
	rec := httptest.NewRecorder()

	handler.Get(rec, req)
	testutil.AssertStatus(t, rec, http.StatusNotFound)
}

func TestDatasetHandler_List_WithFilter(t *testing.T) {
	handler, datasetRepo, participants, cfg := setupDatasetTest(t)
	participant, _ := registerTestUser(t, participants, cfg, "dataset-filter@example.com", "DatasetFilter")

	// Create datasets in different categories
	_, _ = datasetRepo.Create(context.Background(), &repository.Dataset{
		Name: "Debate Set", Slug: "debate-set", Description: "Debates",
		Category: "debates", Filters: json.RawMessage(`{}`), CreatedBy: &participant.ID,
	})
	_, _ = datasetRepo.Create(context.Background(), &repository.Dataset{
		Name: "Research Set", Slug: "research-set", Description: "Research",
		Category: "research", Filters: json.RawMessage(`{}`), CreatedBy: &participant.ID,
	})

	// Filter by category
	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets?category=debates", nil)
	rec := httptest.NewRecorder()

	handler.List(rec, req)
	testutil.AssertStatus(t, rec, http.StatusOK)

	var result map[string]any
	testutil.DecodeResponse(t, rec, &result)

	datasets, ok := result["datasets"].([]any)
	if !ok {
		t.Fatal("expected datasets to be an array")
	}
	if len(datasets) != 1 {
		t.Errorf("expected 1 dataset, got %d", len(datasets))
	}

	total := result["total"].(float64)
	if total != 1 {
		t.Errorf("expected total 1, got %v", total)
	}
}

func TestDatasetHandler_Preview_Success(t *testing.T) {
	handler, datasetRepo, participants, cfg := setupDatasetTest(t)
	participant, _ := registerTestUser(t, participants, cfg, "dataset-preview@example.com", "DatasetPreview")

	_, err := datasetRepo.Create(context.Background(), &repository.Dataset{
		Name: "Preview Set", Slug: "preview-set", Description: "Preview test",
		Category: "mixed", Filters: json.RawMessage(`{}`), CreatedBy: &participant.ID,
	})
	if err != nil {
		t.Fatalf("creating dataset: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets/preview-set/preview", nil)
	req.SetPathValue("slug", "preview-set")
	rec := httptest.NewRecorder()

	handler.Preview(rec, req)
	testutil.AssertStatus(t, rec, http.StatusOK)

	var result map[string]any
	testutil.DecodeResponse(t, rec, &result)

	if result["dataset"] != "Preview Set" {
		t.Errorf("expected dataset 'Preview Set', got %q", result["dataset"])
	}
	if result["slug"] != "preview-set" {
		t.Errorf("expected slug 'preview-set', got %q", result["slug"])
	}

	preview, ok := result["preview"].([]any)
	if !ok {
		t.Fatal("expected preview to be an array")
	}
	// No posts exist, so preview should be empty
	if len(preview) != 0 {
		t.Errorf("expected 0 preview records, got %d", len(preview))
	}
}

func TestDatasetHandler_Preview_NotFound(t *testing.T) {
	handler, _, _, _ := setupDatasetTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets/nonexistent/preview", nil)
	req.SetPathValue("slug", "nonexistent")
	rec := httptest.NewRecorder()

	handler.Preview(rec, req)
	testutil.AssertStatus(t, rec, http.StatusNotFound)
}
