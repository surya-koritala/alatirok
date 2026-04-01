package repository_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func setupDatasetRepo(t *testing.T) *repository.DatasetRepo {
	t.Helper()
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "datasets", "api_keys", "agent_identities", "human_users", "participants")

	// Ensure datasets table exists
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

	return repository.NewDatasetRepo(pool)
}

func TestDatasetRepo_Create(t *testing.T) {
	repo := setupDatasetRepo(t)

	d, err := repo.Create(context.Background(), &repository.Dataset{
		Name:        "Test Dataset",
		Slug:        "test-dataset",
		Description: "A test dataset",
		Category:    "debates",
		Filters:     json.RawMessage(`{"post_type": "debate"}`),
		IsFeatured:  true,
	})
	if err != nil {
		t.Fatalf("creating dataset: %v", err)
	}

	if d.ID == "" {
		t.Error("expected non-empty ID")
	}
	if d.Name != "Test Dataset" {
		t.Errorf("expected name 'Test Dataset', got %q", d.Name)
	}
	if d.Slug != "test-dataset" {
		t.Errorf("expected slug 'test-dataset', got %q", d.Slug)
	}
	if d.Category != "debates" {
		t.Errorf("expected category 'debates', got %q", d.Category)
	}
	if !d.IsFeatured {
		t.Error("expected is_featured to be true")
	}
}

func TestDatasetRepo_Create_DuplicateSlug(t *testing.T) {
	repo := setupDatasetRepo(t)

	_, err := repo.Create(context.Background(), &repository.Dataset{
		Name: "First", Slug: "dup-slug", Description: "First one",
		Category: "debates", Filters: json.RawMessage(`{}`),
	})
	if err != nil {
		t.Fatalf("creating first dataset: %v", err)
	}

	_, err = repo.Create(context.Background(), &repository.Dataset{
		Name: "Second", Slug: "dup-slug", Description: "Duplicate slug",
		Category: "research", Filters: json.RawMessage(`{}`),
	})
	if err == nil {
		t.Error("expected error for duplicate slug, got nil")
	}
}

func TestDatasetRepo_GetBySlug(t *testing.T) {
	repo := setupDatasetRepo(t)

	_, err := repo.Create(context.Background(), &repository.Dataset{
		Name: "Lookup Dataset", Slug: "lookup-dataset", Description: "Look me up",
		Category: "research", Filters: json.RawMessage(`{"post_type": "synthesis"}`),
	})
	if err != nil {
		t.Fatalf("creating dataset: %v", err)
	}

	d, err := repo.GetBySlug(context.Background(), "lookup-dataset")
	if err != nil {
		t.Fatalf("getting dataset by slug: %v", err)
	}

	if d.Name != "Lookup Dataset" {
		t.Errorf("expected name 'Lookup Dataset', got %q", d.Name)
	}
	if d.Category != "research" {
		t.Errorf("expected category 'research', got %q", d.Category)
	}
}

func TestDatasetRepo_GetBySlug_NotFound(t *testing.T) {
	repo := setupDatasetRepo(t)

	_, err := repo.GetBySlug(context.Background(), "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent slug, got nil")
	}
}

func TestDatasetRepo_List(t *testing.T) {
	repo := setupDatasetRepo(t)

	_, _ = repo.Create(context.Background(), &repository.Dataset{
		Name: "Debates", Slug: "list-debates", Description: "debates",
		Category: "debates", Filters: json.RawMessage(`{}`),
	})
	_, _ = repo.Create(context.Background(), &repository.Dataset{
		Name: "Research", Slug: "list-research", Description: "research",
		Category: "research", Filters: json.RawMessage(`{}`), IsFeatured: true,
	})
	_, _ = repo.Create(context.Background(), &repository.Dataset{
		Name: "Mixed", Slug: "list-mixed", Description: "mixed",
		Category: "mixed", Filters: json.RawMessage(`{}`),
	})

	// List all
	datasets, total, err := repo.List(context.Background(), "", false, 25, 0)
	if err != nil {
		t.Fatalf("listing datasets: %v", err)
	}
	if total != 3 {
		t.Errorf("expected total 3, got %d", total)
	}
	if len(datasets) != 3 {
		t.Errorf("expected 3 datasets, got %d", len(datasets))
	}

	// Featured items should come first
	if !datasets[0].IsFeatured {
		t.Error("expected first item to be featured")
	}

	// Filter by category
	datasets, total, err = repo.List(context.Background(), "debates", false, 25, 0)
	if err != nil {
		t.Fatalf("listing datasets by category: %v", err)
	}
	if total != 1 {
		t.Errorf("expected total 1, got %d", total)
	}
	if len(datasets) != 1 {
		t.Errorf("expected 1 dataset, got %d", len(datasets))
	}
	if datasets[0].Name != "Debates" {
		t.Errorf("expected name 'Debates', got %q", datasets[0].Name)
	}

	// Limit
	datasets, total, err = repo.List(context.Background(), "", false, 1, 0)
	if err != nil {
		t.Fatalf("listing datasets with limit: %v", err)
	}
	if total != 3 {
		t.Errorf("expected total 3, got %d", total)
	}
	if len(datasets) != 1 {
		t.Errorf("expected 1 dataset, got %d", len(datasets))
	}
}
