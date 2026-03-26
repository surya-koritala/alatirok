# Alatirok MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working MVP where humans and AI agents can register, create communities, post content, comment, vote, and interact via both a web UI and MCP protocol — with provenance tracking on all agent-generated content.

**Architecture:** Repository pattern for database access (pgx queries), HTTP handlers using Go 1.22+ stdlib routing, middleware chain (logger → CORS → auth), Redis for rate limiting and feed caching. Protocol Gateway as a separate service that translates MCP/A2A into internal REST calls. React + TypeScript + Tailwind frontend served separately.

**Tech Stack:** Go 1.22+, PostgreSQL 16 (pgvector), Redis 7, pgx/v5, golang-jwt/v5, go-redis/v9, net/http stdlib, React 18, TypeScript, Tailwind CSS

**Testing Policy:** Every task MUST include both unit tests and integration tests before implementation is considered complete. No feature is done until tests pass. The TDD cycle is: write failing test → implement → verify pass → commit. Integration tests hit real Postgres (skipped if DATABASE_URL not set). Handler tests use httptest with real or mocked repositories. All tests run with `go test ./... -race -count=1`.

---

## File Structure

```
internal/
  database/
    database.go              ✅ exists — connection pool
    queries.go               CREATE — sqlc-style query helpers (row scanning)
  repository/
    participant.go           CREATE — human/agent CRUD
    participant_test.go      CREATE
    community.go             CREATE — community CRUD + subscriptions
    community_test.go        CREATE
    post.go                  CREATE — post CRUD + feed queries
    post_test.go             CREATE
    comment.go               CREATE — threaded comment CRUD
    comment_test.go          CREATE
    vote.go                  CREATE — voting + score updates
    vote_test.go             CREATE
    provenance.go            CREATE — provenance recording
    provenance_test.go       CREATE
    apikey.go                CREATE — API key CRUD
    apikey_test.go           CREATE
  api/
    handlers/
      auth.go                CREATE — register, login, me
      auth_test.go           CREATE
      community.go           CREATE — community CRUD handlers
      community_test.go      CREATE
      post.go                CREATE — post CRUD handlers
      post_test.go           CREATE
      comment.go             CREATE — comment CRUD handlers
      comment_test.go        CREATE
      vote.go                CREATE — vote handlers
      vote_test.go           CREATE
      agent.go               CREATE — agent registration, API key management
      agent_test.go          CREATE
      feed.go                CREATE — feed generation (hot/new/top/rising)
      feed_test.go           CREATE
    routes/
      routes.go              CREATE — route registration + middleware wiring
    middleware/
      middleware.go          ✅ exists — logger, CORS, auth
      ratelimit.go           CREATE — Redis-based rate limiting
      ratelimit_test.go      CREATE
  api/
    response.go              CREATE — JSON response helpers
  gateway/
    mcp/
      server.go              CREATE — MCP server implementation
      tools.go               CREATE — MCP tool definitions
      tools_test.go          CREATE
    rest/
      proxy.go               CREATE — REST-to-internal normalization
  auth/
    auth.go                  ✅ exists — JWT, bcrypt, API keys
  config/
    config.go                ✅ exists
  models/
    participant.go           ✅ exists
    content.go               ✅ exists
    provenance.go            ✅ exists
    requests.go              CREATE — API request/response DTOs
cmd/
  api/main.go                MODIFY — wire routes, middleware, Redis
  gateway/main.go            MODIFY — wire MCP server, protocol handlers
web/
  package.json               CREATE — React project
  tsconfig.json              CREATE
  tailwind.config.js         CREATE
  src/
    App.tsx                  CREATE — routing, layout
    main.tsx                 CREATE — entry point
    api/
      client.ts              CREATE — API client
    components/
      Nav.tsx                CREATE
      PostCard.tsx           CREATE
      Sidebar.tsx            CREATE
      AuthorBadge.tsx        CREATE
      ProvenanceBadge.tsx    CREATE
      VoteButton.tsx         CREATE
      FeedTabs.tsx           CREATE
      CommunityList.tsx      CREATE
    pages/
      Home.tsx               CREATE — feed page
      Community.tsx          CREATE — single community
      PostDetail.tsx         CREATE — post + comments
      Login.tsx              CREATE
      Register.tsx           CREATE
      AgentRegister.tsx      CREATE
```

---

## Task 0: Testing Infrastructure

**Files:**
- Create: `internal/testutil/testutil.go`
- Create: `internal/testutil/fixtures.go`

- [ ] **Step 1: Create shared test utilities**

```go
// internal/testutil/testutil.go
package testutil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// JSONRequest creates an HTTP request with a JSON body for handler testing.
func JSONRequest(t *testing.T, method, path string, body interface{}) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encoding request body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

// JSONRequestWithAuth adds a Bearer token to a JSON request.
func JSONRequestWithAuth(t *testing.T, method, path, token string, body interface{}) *http.Request {
	t.Helper()
	req := JSONRequest(t, method, path, body)
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

// DecodeResponse decodes an httptest.ResponseRecorder body into v.
func DecodeResponse(t *testing.T, rec *httptest.ResponseRecorder, v interface{}) {
	t.Helper()
	if err := json.NewDecoder(rec.Body).Decode(v); err != nil {
		t.Fatalf("decoding response: %v (body: %s)", err, rec.Body.String())
	}
}

// AssertStatus checks that the response has the expected HTTP status code.
func AssertStatus(t *testing.T, rec *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if rec.Code != expected {
		t.Errorf("expected status %d, got %d (body: %s)", expected, rec.Code, rec.Body.String())
	}
}
```

- [ ] **Step 2: Create test fixtures**

```go
// internal/testutil/fixtures.go
package testutil

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// SeedHuman creates a human participant for testing.
func SeedHuman(t *testing.T, pool *pgxpool.Pool, email, displayName string) *models.Participant {
	t.Helper()
	repo := repository.NewParticipantRepo(pool)
	p, err := repo.CreateHuman(context.Background(), &models.HumanUser{
		Participant:  models.Participant{Type: models.ParticipantHuman, DisplayName: displayName},
		Email:        email,
		PasswordHash: "$2a$10$placeholder", // pre-hashed for speed in tests
	})
	if err != nil {
		t.Fatalf("seed human: %v", err)
	}
	return p
}

// SeedCommunity creates a community for testing.
func SeedCommunity(t *testing.T, pool *pgxpool.Pool, slug, ownerID string) *models.Community {
	t.Helper()
	repo := repository.NewCommunityRepo(pool)
	c, err := repo.Create(context.Background(), &models.Community{
		Name:        slug,
		Slug:        slug,
		AgentPolicy: models.AgentPolicyOpen,
		CreatedBy:   ownerID,
	})
	if err != nil {
		t.Fatalf("seed community: %v", err)
	}
	return c
}

// SeedPost creates a post for testing.
func SeedPost(t *testing.T, pool *pgxpool.Pool, communityID, authorID string, title string) *models.Post {
	t.Helper()
	repo := repository.NewPostRepo(pool)
	p, err := repo.Create(context.Background(), &models.Post{
		CommunityID: communityID,
		AuthorID:    authorID,
		AuthorType:  models.ParticipantHuman,
		Title:       title,
		Body:        "Test body for " + title,
		ContentType: models.ContentText,
	})
	if err != nil {
		t.Fatalf("seed post: %v", err)
	}
	return p
}
```

Note: `SeedHuman` and `SeedCommunity` will be used by all handler and integration tests to set up state.

- [ ] **Step 3: Verify build**

Run: `go build ./...`

- [ ] **Step 4: Commit**

```bash
git add internal/testutil/
git commit -m "feat: add shared test utilities and fixture helpers"
```

---

## Task 1: Request/Response DTOs and JSON Helpers

**Files:**
- Create: `internal/models/requests.go`
- Create: `internal/api/response.go`

- [ ] **Step 1: Create API request/response types**

```go
// internal/models/requests.go
package models

import "time"

// === Auth ===

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token       string       `json:"token"`
	Participant *Participant `json:"participant"`
}

// === Agent ===

type RegisterAgentRequest struct {
	DisplayName   string       `json:"display_name"`
	ModelProvider string       `json:"model_provider"`
	ModelName     string       `json:"model_name"`
	ModelVersion  string       `json:"model_version,omitempty"`
	Capabilities  []string     `json:"capabilities,omitempty"`
	ProtocolType  ProtocolType `json:"protocol_type"`
	AgentURL      string       `json:"agent_url,omitempty"`
}

type RegisterAgentResponse struct {
	Agent  *AgentIdentity `json:"agent"`
	APIKey string         `json:"api_key"` // only shown once at creation
}

// === Community ===

type CreateCommunityRequest struct {
	Name        string      `json:"name"`
	Slug        string      `json:"slug"`
	Description string      `json:"description,omitempty"`
	Rules       string      `json:"rules,omitempty"`
	AgentPolicy AgentPolicy `json:"agent_policy,omitempty"`
}

// === Post ===

type CreatePostRequest struct {
	CommunityID     string   `json:"community_id"`
	Title           string   `json:"title"`
	Body            string   `json:"body"`
	URL             string   `json:"url,omitempty"`
	ContentType     string   `json:"content_type,omitempty"`
	Sources         []string `json:"sources,omitempty"`
	ConfidenceScore *float64 `json:"confidence_score,omitempty"`
}

// === Comment ===

type CreateCommentRequest struct {
	PostID          string   `json:"post_id"`
	ParentCommentID *string  `json:"parent_comment_id,omitempty"`
	Body            string   `json:"body"`
	Sources         []string `json:"sources,omitempty"`
	ConfidenceScore *float64 `json:"confidence_score,omitempty"`
}

// === Vote ===

type VoteRequest struct {
	TargetID   string `json:"target_id"`
	TargetType string `json:"target_type"` // "post" or "comment"
	Direction  string `json:"direction"`   // "up" or "down"
}

// === Feed ===

type FeedQuery struct {
	CommunitySlug string
	Sort          string // "hot", "new", "top", "rising"
	Limit         int
	Offset        int
}

// === Generic ===

type PostWithAuthor struct {
	Post
	Author     Participant  `json:"author"`
	Community  *Community   `json:"community,omitempty"`
	Provenance *Provenance  `json:"provenance,omitempty"`
}

type CommentWithAuthor struct {
	Comment
	Author     Participant `json:"author"`
	Provenance *Provenance `json:"provenance,omitempty"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Limit      int         `json:"limit"`
	Offset     int         `json:"offset"`
	HasMore    bool        `json:"has_more"`
	RetrievedAt time.Time  `json:"retrieved_at"`
}
```

- [ ] **Step 2: Create JSON response helpers**

```go
// internal/api/response.go
package api

import (
	"encoding/json"
	"net/http"
)

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

func Decode(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}
```

- [ ] **Step 3: Write unit tests for JSON helpers**

```go
// internal/api/response_test.go
package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/surya-koritala/alatirok/internal/api"
)

func TestJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	api.JSON(rec, http.StatusOK, map[string]string{"hello": "world"})

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected application/json, got %q", ct)
	}
	if !strings.Contains(rec.Body.String(), `"hello":"world"`) {
		t.Errorf("unexpected body: %s", rec.Body.String())
	}
}

func TestError(t *testing.T) {
	rec := httptest.NewRecorder()
	api.Error(rec, http.StatusBadRequest, "bad input")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"error":"bad input"`) {
		t.Errorf("unexpected body: %s", rec.Body.String())
	}
}

func TestDecode(t *testing.T) {
	body := strings.NewReader(`{"email":"a@b.com","password":"secret"}`)
	req := httptest.NewRequest(http.MethodPost, "/", body)

	var data struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := api.Decode(req, &data); err != nil {
		t.Fatalf("Decode: %v", err)
	}
	if data.Email != "a@b.com" {
		t.Errorf("expected email 'a@b.com', got %q", data.Email)
	}
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/api/... -v -count=1`
Expected: PASS

- [ ] **Step 5: Verify full build**

Run: `go build ./...`
Expected: clean build, no errors

- [ ] **Step 6: Commit**

```bash
git add internal/models/requests.go internal/api/response.go internal/api/response_test.go
git commit -m "feat: add request/response DTOs and JSON helpers with unit tests"
```

---

## Task 2: Database Query Helpers

**Files:**
- Create: `internal/database/queries.go`
- Create: `internal/database/testhelpers.go`

- [ ] **Step 1: Create generic query scanning helpers**

```go
// internal/database/queries.go
package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DBTX abstracts pgxpool.Pool and pgx.Tx for repository methods.
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// WithTx runs fn inside a database transaction.
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
```

- [ ] **Step 2: Create test helpers for integration tests**

```go
// internal/database/testhelpers.go
package database

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TestPool creates a connection pool for testing. Skips if DATABASE_URL not set.
// IMPORTANT: Migrations must be applied before running integration tests.
// Run: DATABASE_URL="..." make migrate-up
func TestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	pool, err := Connect(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("connecting to test database: %v", err)
	}

	// Verify schema exists by checking for the participants table
	var exists bool
	err = pool.QueryRow(context.Background(),
		`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'participants')`).Scan(&exists)
	if err != nil || !exists {
		t.Fatal("database schema not found — run 'make migrate-up' against your test database first")
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

// CleanupTables truncates tables between tests.
func CleanupTables(t *testing.T, pool *pgxpool.Pool, tables ...string) {
	t.Helper()
	for _, table := range tables {
		_, err := pool.Exec(context.Background(), fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			t.Fatalf("truncating %s: %v", table, err)
		}
	}
}
```

- [ ] **Step 3: Verify build**

Run: `go build ./...`

- [ ] **Step 4: Commit**

```bash
git add internal/database/queries.go internal/database/testhelpers.go
git commit -m "feat: add database transaction helpers and test utilities"
```

---

## Task 3: Participant Repository

**Files:**
- Create: `internal/repository/participant.go`
- Create: `internal/repository/participant_test.go`

- [ ] **Step 1: Write participant repository tests**

```go
// internal/repository/participant_test.go
package repository_test

import (
	"context"
	"testing"

	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func TestParticipantRepo_CreateHumanAndGet(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "human_users", "participants")
	repo := repository.NewParticipantRepo(pool)

	ctx := context.Background()
	user := &models.HumanUser{
		Participant: models.Participant{
			Type:        models.ParticipantHuman,
			DisplayName: "Test User",
		},
		Email:        "test@example.com",
		PasswordHash: "hashed_pw",
	}

	created, err := repo.CreateHuman(ctx, user)
	if err != nil {
		t.Fatalf("CreateHuman: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if created.TrustScore != 0 {
		t.Errorf("expected trust_score 0, got %f", created.TrustScore)
	}

	got, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.DisplayName != "Test User" {
		t.Errorf("expected display_name 'Test User', got %q", got.DisplayName)
	}
}

func TestParticipantRepo_GetHumanByEmail(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "human_users", "participants")
	repo := repository.NewParticipantRepo(pool)

	ctx := context.Background()
	user := &models.HumanUser{
		Participant: models.Participant{
			Type:        models.ParticipantHuman,
			DisplayName: "Email User",
		},
		Email:        "email@example.com",
		PasswordHash: "hashed_pw",
	}

	_, err := repo.CreateHuman(ctx, user)
	if err != nil {
		t.Fatalf("CreateHuman: %v", err)
	}

	got, err := repo.GetHumanByEmail(ctx, "email@example.com")
	if err != nil {
		t.Fatalf("GetHumanByEmail: %v", err)
	}
	if got.DisplayName != "Email User" {
		t.Errorf("expected 'Email User', got %q", got.DisplayName)
	}
}

func TestParticipantRepo_CreateAgent(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "agent_identities", "human_users", "participants")
	repo := repository.NewParticipantRepo(pool)

	ctx := context.Background()

	// Create owner first
	owner, err := repo.CreateHuman(ctx, &models.HumanUser{
		Participant: models.Participant{
			Type:        models.ParticipantHuman,
			DisplayName: "Agent Owner",
		},
		Email:        "owner@example.com",
		PasswordHash: "hashed_pw",
	})
	if err != nil {
		t.Fatalf("CreateHuman (owner): %v", err)
	}

	agent := &models.AgentIdentity{
		Participant: models.Participant{
			Type:        models.ParticipantAgent,
			DisplayName: "test-agent",
		},
		OwnerID:       owner.ID,
		ModelProvider: "Anthropic",
		ModelName:     "Claude Opus 4",
		ProtocolType:  models.ProtocolMCP,
		Capabilities:  []string{"research", "synthesis"},
	}

	created, err := repo.CreateAgent(ctx, agent)
	if err != nil {
		t.Fatalf("CreateAgent: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if created.ModelProvider != "Anthropic" {
		t.Errorf("expected provider 'Anthropic', got %q", created.ModelProvider)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/repository/... -v -count=1`
Expected: compilation error — `repository` package doesn't exist yet

- [ ] **Step 3: Implement participant repository**

```go
// internal/repository/participant.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type ParticipantRepo struct {
	pool *pgxpool.Pool
}

func NewParticipantRepo(pool *pgxpool.Pool) *ParticipantRepo {
	return &ParticipantRepo{pool: pool}
}

func (r *ParticipantRepo) CreateHuman(ctx context.Context, u *models.HumanUser) (*models.Participant, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var p models.Participant
	err = tx.QueryRow(ctx, `
		INSERT INTO participants (type, display_name, avatar_url, bio)
		VALUES ($1, $2, $3, $4)
		RETURNING id, type, display_name, avatar_url, bio, trust_score, reputation_score, is_verified, created_at, updated_at`,
		u.Type, u.DisplayName, u.AvatarURL, u.Bio,
	).Scan(&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert participant: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO human_users (participant_id, email, password_hash, oauth_provider)
		VALUES ($1, $2, $3, $4)`,
		p.ID, u.Email, u.PasswordHash, u.OAuthProvider)
	if err != nil {
		return nil, fmt.Errorf("insert human_user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return &p, nil
}

func (r *ParticipantRepo) CreateAgent(ctx context.Context, a *models.AgentIdentity) (*models.AgentIdentity, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var p models.Participant
	err = tx.QueryRow(ctx, `
		INSERT INTO participants (type, display_name, avatar_url, bio)
		VALUES ($1, $2, $3, $4)
		RETURNING id, type, display_name, avatar_url, bio, trust_score, reputation_score, is_verified, created_at, updated_at`,
		a.Type, a.DisplayName, a.AvatarURL, a.Bio,
	).Scan(&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert participant: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO agent_identities (participant_id, owner_id, model_provider, model_name, model_version, capabilities, max_rpm, protocol_type, agent_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.ID, a.OwnerID, a.ModelProvider, a.ModelName, a.ModelVersion,
		a.Capabilities, a.MaxRPM, a.ProtocolType, a.AgentURL)
	if err != nil {
		return nil, fmt.Errorf("insert agent_identity: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	result := *a
	result.Participant = p
	return &result, nil
}

func (r *ParticipantRepo) GetByID(ctx context.Context, id string) (*models.Participant, error) {
	var p models.Participant
	err := r.pool.QueryRow(ctx, `
		SELECT id, type, display_name, avatar_url, bio, trust_score, reputation_score, is_verified, created_at, updated_at
		FROM participants WHERE id = $1`, id,
	).Scan(&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get participant: %w", err)
	}
	return &p, nil
}

func (r *ParticipantRepo) GetHumanByEmail(ctx context.Context, email string) (*models.HumanUser, error) {
	var u models.HumanUser
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.type, p.display_name, p.avatar_url, p.bio, p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at,
		       h.email, h.password_hash, h.oauth_provider
		FROM participants p
		JOIN human_users h ON h.participant_id = p.id
		WHERE h.email = $1`, email,
	).Scan(&u.ID, &u.Type, &u.DisplayName, &u.AvatarURL, &u.Bio,
		&u.TrustScore, &u.ReputationScore, &u.IsVerified, &u.CreatedAt, &u.UpdatedAt,
		&u.Email, &u.PasswordHash, &u.OAuthProvider)
	if err != nil {
		return nil, fmt.Errorf("get human by email: %w", err)
	}
	return &u, nil
}

func (r *ParticipantRepo) GetAgentByID(ctx context.Context, id string) (*models.AgentIdentity, error) {
	var a models.AgentIdentity
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.type, p.display_name, p.avatar_url, p.bio, p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at,
		       ai.owner_id, ai.model_provider, ai.model_name, ai.model_version, ai.capabilities,
		       ai.max_rpm, ai.protocol_type, ai.agent_url, ai.heartbeat_interval, ai.last_seen_at
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE p.id = $1`, id,
	).Scan(&a.ID, &a.Type, &a.DisplayName, &a.AvatarURL, &a.Bio,
		&a.TrustScore, &a.ReputationScore, &a.IsVerified, &a.CreatedAt, &a.UpdatedAt,
		&a.OwnerID, &a.ModelProvider, &a.ModelName, &a.ModelVersion, &a.Capabilities,
		&a.MaxRPM, &a.ProtocolType, &a.AgentURL, &a.HeartbeatInterval, &a.LastSeenAt)
	if err != nil {
		return nil, fmt.Errorf("get agent: %w", err)
	}
	return &a, nil
}

func (r *ParticipantRepo) ListAgentsByOwner(ctx context.Context, ownerID string) ([]models.AgentIdentity, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.type, p.display_name, p.avatar_url, p.bio, p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at,
		       ai.owner_id, ai.model_provider, ai.model_name, ai.model_version, ai.capabilities,
		       ai.max_rpm, ai.protocol_type, ai.agent_url, ai.heartbeat_interval, ai.last_seen_at
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE ai.owner_id = $1
		ORDER BY p.created_at DESC`, ownerID)
	if err != nil {
		return nil, fmt.Errorf("list agents: %w", err)
	}
	defer rows.Close()

	var agents []models.AgentIdentity
	for rows.Next() {
		var a models.AgentIdentity
		if err := rows.Scan(&a.ID, &a.Type, &a.DisplayName, &a.AvatarURL, &a.Bio,
			&a.TrustScore, &a.ReputationScore, &a.IsVerified, &a.CreatedAt, &a.UpdatedAt,
			&a.OwnerID, &a.ModelProvider, &a.ModelName, &a.ModelVersion, &a.Capabilities,
			&a.MaxRPM, &a.ProtocolType, &a.AgentURL, &a.HeartbeatInterval, &a.LastSeenAt); err != nil {
			return nil, fmt.Errorf("scan agent: %w", err)
		}
		agents = append(agents, a)
	}
	return agents, rows.Err()
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/repository/... -v -count=1`
Expected: PASS (or SKIP if no DATABASE_URL)

- [ ] **Step 5: Commit**

```bash
git add internal/repository/
git commit -m "feat: add participant repository with human and agent CRUD"
```

---

## Task 4: Community Repository

**Files:**
- Create: `internal/repository/community.go`
- Create: `internal/repository/community_test.go`

- [ ] **Step 1: Write community repository tests**

```go
// internal/repository/community_test.go
package repository_test

import (
	"context"
	"testing"

	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func createTestOwner(t *testing.T, repo *repository.ParticipantRepo) *models.Participant {
	t.Helper()
	ctx := context.Background()
	owner, err := repo.CreateHuman(ctx, &models.HumanUser{
		Participant: models.Participant{Type: models.ParticipantHuman, DisplayName: "Owner"},
		Email:        "owner_" + t.Name() + "@test.com",
		PasswordHash: "hash",
	})
	if err != nil {
		t.Fatalf("create owner: %v", err)
	}
	return owner
}

func TestCommunityRepo_CreateAndGet(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "communities", "human_users", "participants")

	pRepo := repository.NewParticipantRepo(pool)
	cRepo := repository.NewCommunityRepo(pool)
	owner := createTestOwner(t, pRepo)

	ctx := context.Background()
	comm, err := cRepo.Create(ctx, &models.Community{
		Name:        "Open Source AI",
		Slug:        "osai",
		Description: "Discuss open source AI",
		AgentPolicy: models.AgentPolicyOpen,
		CreatedBy:   owner.ID,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if comm.Slug != "osai" {
		t.Errorf("expected slug 'osai', got %q", comm.Slug)
	}

	got, err := cRepo.GetBySlug(ctx, "osai")
	if err != nil {
		t.Fatalf("GetBySlug: %v", err)
	}
	if got.Name != "Open Source AI" {
		t.Errorf("expected name 'Open Source AI', got %q", got.Name)
	}
}

func TestCommunityRepo_Subscribe(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "community_subscriptions", "communities", "human_users", "participants")

	pRepo := repository.NewParticipantRepo(pool)
	cRepo := repository.NewCommunityRepo(pool)
	owner := createTestOwner(t, pRepo)

	ctx := context.Background()
	comm, _ := cRepo.Create(ctx, &models.Community{
		Name: "Test", Slug: "test", AgentPolicy: models.AgentPolicyOpen, CreatedBy: owner.ID,
	})

	if err := cRepo.Subscribe(ctx, comm.ID, owner.ID); err != nil {
		t.Fatalf("Subscribe: %v", err)
	}

	updated, _ := cRepo.GetBySlug(ctx, "test")
	if updated.SubscriberCount != 1 {
		t.Errorf("expected subscriber_count 1, got %d", updated.SubscriberCount)
	}
}
```

- [ ] **Step 2: Run tests — expect compilation failure**

Run: `go test ./internal/repository/... -v -count=1`

- [ ] **Step 3: Implement community repository**

```go
// internal/repository/community.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type CommunityRepo struct {
	pool *pgxpool.Pool
}

func NewCommunityRepo(pool *pgxpool.Pool) *CommunityRepo {
	return &CommunityRepo{pool: pool}
}

func (r *CommunityRepo) Create(ctx context.Context, c *models.Community) (*models.Community, error) {
	if c.AgentPolicy == "" {
		c.AgentPolicy = models.AgentPolicyOpen
	}
	var result models.Community
	err := r.pool.QueryRow(ctx, `
		INSERT INTO communities (name, slug, description, rules, agent_policy, quality_threshold, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, slug, description, rules, agent_policy, quality_threshold, created_by, subscriber_count, created_at, updated_at`,
		c.Name, c.Slug, c.Description, c.Rules, c.AgentPolicy, c.QualityThreshold, c.CreatedBy,
	).Scan(&result.ID, &result.Name, &result.Slug, &result.Description, &result.Rules,
		&result.AgentPolicy, &result.QualityThreshold, &result.CreatedBy, &result.SubscriberCount,
		&result.CreatedAt, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert community: %w", err)
	}
	return &result, nil
}

func (r *CommunityRepo) GetBySlug(ctx context.Context, slug string) (*models.Community, error) {
	var c models.Community
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, slug, description, rules, agent_policy, quality_threshold, created_by, subscriber_count, created_at, updated_at
		FROM communities WHERE slug = $1`, slug,
	).Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Rules,
		&c.AgentPolicy, &c.QualityThreshold, &c.CreatedBy, &c.SubscriberCount,
		&c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get community: %w", err)
	}
	return &c, nil
}

func (r *CommunityRepo) GetByID(ctx context.Context, id string) (*models.Community, error) {
	var c models.Community
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, slug, description, rules, agent_policy, quality_threshold, created_by, subscriber_count, created_at, updated_at
		FROM communities WHERE id = $1`, id,
	).Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Rules,
		&c.AgentPolicy, &c.QualityThreshold, &c.CreatedBy, &c.SubscriberCount,
		&c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get community: %w", err)
	}
	return &c, nil
}

func (r *CommunityRepo) List(ctx context.Context, limit, offset int) ([]models.Community, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, slug, description, rules, agent_policy, quality_threshold, created_by, subscriber_count, created_at, updated_at
		FROM communities ORDER BY subscriber_count DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list communities: %w", err)
	}
	defer rows.Close()

	var communities []models.Community
	for rows.Next() {
		var c models.Community
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Rules,
			&c.AgentPolicy, &c.QualityThreshold, &c.CreatedBy, &c.SubscriberCount,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan community: %w", err)
		}
		communities = append(communities, c)
	}
	return communities, rows.Err()
}

func (r *CommunityRepo) Subscribe(ctx context.Context, communityID, participantID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		INSERT INTO community_subscriptions (community_id, participant_id)
		VALUES ($1, $2) ON CONFLICT DO NOTHING`, communityID, participantID)
	if err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE communities SET subscriber_count = (
			SELECT COUNT(*) FROM community_subscriptions WHERE community_id = $1
		) WHERE id = $1`, communityID)
	if err != nil {
		return fmt.Errorf("update subscriber count: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *CommunityRepo) Unsubscribe(ctx context.Context, communityID, participantID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		DELETE FROM community_subscriptions WHERE community_id = $1 AND participant_id = $2`,
		communityID, participantID)
	if err != nil {
		return fmt.Errorf("delete subscription: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE communities SET subscriber_count = (
			SELECT COUNT(*) FROM community_subscriptions WHERE community_id = $1
		) WHERE id = $1`, communityID)
	if err != nil {
		return fmt.Errorf("update subscriber count: %w", err)
	}

	return tx.Commit(ctx)
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/repository/... -v -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/repository/community.go internal/repository/community_test.go
git commit -m "feat: add community repository with CRUD and subscriptions"
```

---

## Task 5: Post Repository

**Files:**
- Create: `internal/repository/post.go`
- Create: `internal/repository/post_test.go`

- [ ] **Step 1: Write post repository tests**

Test cases: CreatePost, GetByID, ListByCommunity (with sorting: new, top), post with provenance.

Key test: create a community + participant, then create posts, verify listing with sort order.

- [ ] **Step 2: Run tests — expect failure**

Run: `go test ./internal/repository/... -v -count=1 -run TestPost`

- [ ] **Step 3: Implement post repository**

```go
// internal/repository/post.go
package repository

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type PostRepo struct {
	pool *pgxpool.Pool
}

func NewPostRepo(pool *pgxpool.Pool) *PostRepo {
	return &PostRepo{pool: pool}
}

func (r *PostRepo) Create(ctx context.Context, p *models.Post) (*models.Post, error) {
	if p.ContentType == "" {
		p.ContentType = models.ContentText
	}
	var result models.Post
	err := r.pool.QueryRow(ctx, `
		INSERT INTO posts (community_id, author_id, author_type, title, body, url, content_type, provenance_id, confidence_score)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, community_id, author_id, author_type, title, body, url, content_type, provenance_id, confidence_score, vote_score, comment_count, created_at, updated_at`,
		p.CommunityID, p.AuthorID, p.AuthorType, p.Title, p.Body, p.URL, p.ContentType, p.ProvenanceID, p.ConfidenceScore,
	).Scan(&result.ID, &result.CommunityID, &result.AuthorID, &result.AuthorType,
		&result.Title, &result.Body, &result.URL, &result.ContentType,
		&result.ProvenanceID, &result.ConfidenceScore,
		&result.VoteScore, &result.CommentCount, &result.CreatedAt, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert post: %w", err)
	}
	return &result, nil
}

func (r *PostRepo) GetByID(ctx context.Context, id string) (*models.PostWithAuthor, error) {
	var p models.PostWithAuthor
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.community_id, p.author_id, p.author_type, p.title, p.body, p.url, p.content_type,
		       p.provenance_id, p.confidence_score, p.vote_score, p.comment_count, p.created_at, p.updated_at,
		       pa.display_name, pa.avatar_url, pa.trust_score, pa.reputation_score, pa.type, pa.is_verified
		FROM posts p
		JOIN participants pa ON pa.id = p.author_id
		WHERE p.id = $1`, id,
	).Scan(&p.ID, &p.CommunityID, &p.AuthorID, &p.AuthorType, &p.Title, &p.Body, &p.URL, &p.ContentType,
		&p.ProvenanceID, &p.ConfidenceScore, &p.VoteScore, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
		&p.Author.DisplayName, &p.Author.AvatarURL, &p.Author.TrustScore, &p.Author.ReputationScore,
		&p.Author.Type, &p.Author.IsVerified)
	if err != nil {
		return nil, fmt.Errorf("get post: %w", err)
	}
	p.Author.ID = p.AuthorID
	return &p, nil
}

// ListByCommunity returns posts for a community feed. sort: "new", "top", "hot", "rising"
func (r *PostRepo) ListByCommunity(ctx context.Context, communityID string, sort string, limit, offset int) ([]models.PostWithAuthor, int, error) {
	orderClause := orderBySort(sort)

	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts WHERE community_id = $1`, communityID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count posts: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT p.id, p.community_id, p.author_id, p.author_type, p.title, p.body, p.url, p.content_type,
		       p.provenance_id, p.confidence_score, p.vote_score, p.comment_count, p.created_at, p.updated_at,
		       pa.display_name, pa.avatar_url, pa.trust_score, pa.reputation_score, pa.type, pa.is_verified
		FROM posts p
		JOIN participants pa ON pa.id = p.author_id
		WHERE p.community_id = $1
		%s
		LIMIT $2 OFFSET $3`, orderClause)

	rows, err := r.pool.Query(ctx, query, communityID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list posts: %w", err)
	}
	defer rows.Close()

	return scanPostsWithAuthor(rows, total)
}

// ListGlobal returns posts across all communities (home feed).
func (r *PostRepo) ListGlobal(ctx context.Context, sort string, limit, offset int) ([]models.PostWithAuthor, int, error) {
	orderClause := orderBySort(sort)

	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count posts: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT p.id, p.community_id, p.author_id, p.author_type, p.title, p.body, p.url, p.content_type,
		       p.provenance_id, p.confidence_score, p.vote_score, p.comment_count, p.created_at, p.updated_at,
		       pa.display_name, pa.avatar_url, pa.trust_score, pa.reputation_score, pa.type, pa.is_verified
		FROM posts p
		JOIN participants pa ON pa.id = p.author_id
		%s
		LIMIT $1 OFFSET $2`, orderClause)

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list posts: %w", err)
	}
	defer rows.Close()

	return scanPostsWithAuthor(rows, total)
}

func scanPostsWithAuthor(rows interface{ Next() bool; Scan(...interface{}) error; Err() error }, total int) ([]models.PostWithAuthor, int, error) {
	var posts []models.PostWithAuthor
	for rows.Next() {
		var p models.PostWithAuthor
		if err := rows.Scan(&p.ID, &p.CommunityID, &p.AuthorID, &p.AuthorType, &p.Title, &p.Body, &p.URL, &p.ContentType,
			&p.ProvenanceID, &p.ConfidenceScore, &p.VoteScore, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
			&p.Author.DisplayName, &p.Author.AvatarURL, &p.Author.TrustScore, &p.Author.ReputationScore,
			&p.Author.Type, &p.Author.IsVerified); err != nil {
			return nil, 0, fmt.Errorf("scan post: %w", err)
		}
		p.Author.ID = p.AuthorID
		posts = append(posts, p)
	}
	return posts, total, rows.Err()
}

// orderBySort returns the ORDER BY clause for feed sorting.
// "hot" uses a simplified Reddit-style hot score: log10(max(|score|,1)) + sign(score) * (created_epoch / 45000)
func orderBySort(sort string) string {
	switch sort {
	case "top":
		return "ORDER BY p.vote_score DESC, p.created_at DESC"
	case "new":
		return "ORDER BY p.created_at DESC"
	case "rising":
		return "ORDER BY (p.vote_score::float / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 1)) DESC"
	default: // "hot"
		return "ORDER BY (LOG(GREATEST(ABS(p.vote_score), 1)) + SIGN(p.vote_score) * EXTRACT(EPOCH FROM p.created_at) / 45000) DESC"
	}
}

// HotScore calculates the Reddit-style hot ranking score (for reference/testing).
func HotScore(votes int, created time.Time) float64 {
	s := float64(votes)
	order := math.Log10(math.Max(math.Abs(s), 1))
	sign := 0.0
	if s > 0 {
		sign = 1
	} else if s < 0 {
		sign = -1
	}
	epoch := float64(created.Unix())
	return order + sign*epoch/45000
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/repository/... -v -count=1`

- [ ] **Step 5: Commit**

```bash
git add internal/repository/post.go internal/repository/post_test.go
git commit -m "feat: add post repository with feed sorting (hot/new/top/rising)"
```

---

## Task 6: Comment and Vote Repositories

**Files:**
- Create: `internal/repository/comment.go`
- Create: `internal/repository/comment_test.go`
- Create: `internal/repository/vote.go`
- Create: `internal/repository/vote_test.go`

- [ ] **Step 1: Write comment repository tests**

Test cases: CreateComment (top-level), CreateComment (nested reply with depth), ListByPost (threaded ordering).

- [ ] **Step 2: Write vote repository tests**

Test cases: CastVote (up), CastVote (change direction), CastVote (remove), verify vote_score on post/comment updates.

- [ ] **Step 3: Implement comment repository**

```go
// internal/repository/comment.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type CommentRepo struct {
	pool *pgxpool.Pool
}

func NewCommentRepo(pool *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{pool: pool}
}

func (r *CommentRepo) Create(ctx context.Context, c *models.Comment) (*models.Comment, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Calculate depth from parent
	depth := 0
	if c.ParentCommentID != nil {
		err := tx.QueryRow(ctx, `SELECT depth FROM comments WHERE id = $1`, *c.ParentCommentID).Scan(&depth)
		if err != nil {
			return nil, fmt.Errorf("get parent depth: %w", err)
		}
		depth++
	}

	var result models.Comment
	err = tx.QueryRow(ctx, `
		INSERT INTO comments (post_id, parent_comment_id, author_id, author_type, body, provenance_id, confidence_score, depth)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, post_id, parent_comment_id, author_id, author_type, body, provenance_id, confidence_score, vote_score, depth, created_at, updated_at`,
		c.PostID, c.ParentCommentID, c.AuthorID, c.AuthorType, c.Body, c.ProvenanceID, c.ConfidenceScore, depth,
	).Scan(&result.ID, &result.PostID, &result.ParentCommentID, &result.AuthorID, &result.AuthorType,
		&result.Body, &result.ProvenanceID, &result.ConfidenceScore, &result.VoteScore, &result.Depth,
		&result.CreatedAt, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert comment: %w", err)
	}

	// Increment comment count on post
	_, err = tx.Exec(ctx, `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`, c.PostID)
	if err != nil {
		return nil, fmt.Errorf("update comment count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return &result, nil
}

func (r *CommentRepo) ListByPost(ctx context.Context, postID string, limit, offset int) ([]models.CommentWithAuthor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.post_id, c.parent_comment_id, c.author_id, c.author_type, c.body,
		       c.provenance_id, c.confidence_score, c.vote_score, c.depth, c.created_at, c.updated_at,
		       pa.display_name, pa.avatar_url, pa.trust_score, pa.reputation_score, pa.type, pa.is_verified
		FROM comments c
		JOIN participants pa ON pa.id = c.author_id
		WHERE c.post_id = $1
		ORDER BY c.depth ASC, c.vote_score DESC, c.created_at ASC
		LIMIT $2 OFFSET $3`, postID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list comments: %w", err)
	}
	defer rows.Close()

	var comments []models.CommentWithAuthor
	for rows.Next() {
		var c models.CommentWithAuthor
		if err := rows.Scan(&c.ID, &c.PostID, &c.ParentCommentID, &c.AuthorID, &c.AuthorType, &c.Body,
			&c.ProvenanceID, &c.ConfidenceScore, &c.VoteScore, &c.Depth, &c.CreatedAt, &c.UpdatedAt,
			&c.Author.DisplayName, &c.Author.AvatarURL, &c.Author.TrustScore, &c.Author.ReputationScore,
			&c.Author.Type, &c.Author.IsVerified); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		c.Author.ID = c.AuthorID
		comments = append(comments, c)
	}
	return comments, rows.Err()
}
```

- [ ] **Step 4: Implement vote repository**

```go
// internal/repository/vote.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type VoteRepo struct {
	pool *pgxpool.Pool
}

func NewVoteRepo(pool *pgxpool.Pool) *VoteRepo {
	return &VoteRepo{pool: pool}
}

// CastVote creates, updates, or removes a vote. Returns the new vote score of the target.
func (r *VoteRepo) CastVote(ctx context.Context, v *models.Vote) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check for existing vote
	var existingID string
	var existingDir models.VoteDirection
	err = tx.QueryRow(ctx, `
		SELECT id, direction FROM votes
		WHERE target_id = $1 AND target_type = $2 AND voter_id = $3`,
		v.TargetID, v.TargetType, v.VoterID).Scan(&existingID, &existingDir)

	if err == nil {
		// Existing vote found
		if existingDir == v.Direction {
			// Same direction = remove vote (toggle off)
			_, err = tx.Exec(ctx, `DELETE FROM votes WHERE id = $1`, existingID)
		} else {
			// Different direction = update
			_, err = tx.Exec(ctx, `UPDATE votes SET direction = $1 WHERE id = $2`, v.Direction, existingID)
		}
		if err != nil {
			return 0, fmt.Errorf("update vote: %w", err)
		}
	} else {
		// No existing vote — insert new
		_, err = tx.Exec(ctx, `
			INSERT INTO votes (target_id, target_type, voter_id, voter_type, direction)
			VALUES ($1, $2, $3, $4, $5)`,
			v.TargetID, v.TargetType, v.VoterID, v.VoterType, v.Direction)
		if err != nil {
			return 0, fmt.Errorf("insert vote: %w", err)
		}
	}

	// Recalculate score
	var newScore int
	table := "posts"
	idCol := "id"
	if v.TargetType == models.TargetComment {
		table = "comments"
	}
	err = tx.QueryRow(ctx, fmt.Sprintf(`
		UPDATE %s SET vote_score = COALESCE((
			SELECT SUM(CASE WHEN direction = 'up' THEN 1 ELSE -1 END)
			FROM votes WHERE target_id = $1 AND target_type = $2
		), 0) WHERE %s = $1 RETURNING vote_score`, table, idCol), v.TargetID, v.TargetType).Scan(&newScore)
	if err != nil {
		return 0, fmt.Errorf("update score: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit: %w", err)
	}
	return newScore, nil
}
```

- [ ] **Step 5: Run tests**

Run: `go test ./internal/repository/... -v -count=1`

- [ ] **Step 6: Commit**

```bash
git add internal/repository/comment.go internal/repository/comment_test.go internal/repository/vote.go internal/repository/vote_test.go
git commit -m "feat: add comment and vote repositories with threading and score updates"
```

---

## Task 7: Provenance and API Key Repositories

**Files:**
- Create: `internal/repository/provenance.go`
- Create: `internal/repository/provenance_test.go`
- Create: `internal/repository/apikey.go`
- Create: `internal/repository/apikey_test.go`

- [ ] **Step 1: Write provenance repository tests**

Test: CreateProvenance for an agent post, GetByContentID.

- [ ] **Step 2: Implement provenance repository**

```go
// internal/repository/provenance.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type ProvenanceRepo struct {
	pool *pgxpool.Pool
}

func NewProvenanceRepo(pool *pgxpool.Pool) *ProvenanceRepo {
	return &ProvenanceRepo{pool: pool}
}

func (r *ProvenanceRepo) Create(ctx context.Context, p *models.Provenance) (*models.Provenance, error) {
	if p.GenerationMethod == "" {
		p.GenerationMethod = models.MethodOriginal
	}
	var result models.Provenance
	err := r.pool.QueryRow(ctx, `
		INSERT INTO provenances (content_id, content_type, author_id, sources, model_used, model_version, prompt_hash, confidence_score, generation_method)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, content_id, content_type, author_id, sources, model_used, model_version, prompt_hash, confidence_score, generation_method, created_at`,
		p.ContentID, p.ContentType, p.AuthorID, p.Sources, p.ModelUsed, p.ModelVersion, p.PromptHash, p.ConfidenceScore, p.GenerationMethod,
	).Scan(&result.ID, &result.ContentID, &result.ContentType, &result.AuthorID, &result.Sources,
		&result.ModelUsed, &result.ModelVersion, &result.PromptHash, &result.ConfidenceScore,
		&result.GenerationMethod, &result.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert provenance: %w", err)
	}
	return &result, nil
}

func (r *ProvenanceRepo) GetByContentID(ctx context.Context, contentID string, contentType models.TargetType) (*models.Provenance, error) {
	var p models.Provenance
	err := r.pool.QueryRow(ctx, `
		SELECT id, content_id, content_type, author_id, sources, model_used, model_version, prompt_hash, confidence_score, generation_method, created_at
		FROM provenances WHERE content_id = $1 AND content_type = $2`, contentID, contentType,
	).Scan(&p.ID, &p.ContentID, &p.ContentType, &p.AuthorID, &p.Sources,
		&p.ModelUsed, &p.ModelVersion, &p.PromptHash, &p.ConfidenceScore,
		&p.GenerationMethod, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get provenance: %w", err)
	}
	return &p, nil
}
```

- [ ] **Step 3: Implement API key repository**

```go
// internal/repository/apikey.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

type APIKeyRepo struct {
	pool *pgxpool.Pool
}

func NewAPIKeyRepo(pool *pgxpool.Pool) *APIKeyRepo {
	return &APIKeyRepo{pool: pool}
}

func (r *APIKeyRepo) Create(ctx context.Context, k *models.APIKey) (*models.APIKey, error) {
	var result models.APIKey
	err := r.pool.QueryRow(ctx, `
		INSERT INTO api_keys (agent_id, key_hash, scopes, rate_limit, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, agent_id, key_hash, scopes, rate_limit, expires_at, is_active, created_at`,
		k.AgentID, k.KeyHash, k.Scopes, k.RateLimit, k.ExpiresAt,
	).Scan(&result.ID, &result.AgentID, &result.KeyHash, &result.Scopes,
		&result.RateLimit, &result.ExpiresAt, &result.IsActive, &result.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert api key: %w", err)
	}
	return &result, nil
}

func (r *APIKeyRepo) GetActiveByAgent(ctx context.Context, agentID string) ([]models.APIKey, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, agent_id, key_hash, scopes, rate_limit, expires_at, is_active, created_at
		FROM api_keys WHERE agent_id = $1 AND is_active = TRUE AND expires_at > NOW()
		ORDER BY created_at DESC`, agentID)
	if err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(&k.ID, &k.AgentID, &k.KeyHash, &k.Scopes,
			&k.RateLimit, &k.ExpiresAt, &k.IsActive, &k.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan api key: %w", err)
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (r *APIKeyRepo) Revoke(ctx context.Context, keyID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE api_keys SET is_active = FALSE WHERE id = $1`, keyID)
	if err != nil {
		return fmt.Errorf("revoke api key: %w", err)
	}
	return nil
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/repository/... -v -count=1`

- [ ] **Step 5: Commit**

```bash
git add internal/repository/provenance.go internal/repository/provenance_test.go internal/repository/apikey.go internal/repository/apikey_test.go
git commit -m "feat: add provenance and API key repositories"
```

---

## Task 8: Auth Handlers (Register + Login)

**Files:**
- Create: `internal/api/handlers/auth.go`
- Create: `internal/api/handlers/auth_test.go`

- [ ] **Step 1: Write auth handler tests**

Use `httptest.NewServer` to test:
- `POST /api/v1/auth/register` — valid registration returns 201 + token
- `POST /api/v1/auth/register` — duplicate email returns 409
- `POST /api/v1/auth/login` — valid login returns 200 + token
- `POST /api/v1/auth/login` — wrong password returns 401
- `GET /api/v1/auth/me` — with valid token returns participant

- [ ] **Step 2: Implement auth handlers**

```go
// internal/api/handlers/auth.go
package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

type AuthHandler struct {
	participants *repository.ParticipantRepo
	cfg          *config.Config
}

func NewAuthHandler(participants *repository.ParticipantRepo, cfg *config.Config) *AuthHandler {
	return &AuthHandler{participants: participants, cfg: cfg}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.DisplayName == "" {
		api.Error(w, http.StatusBadRequest, "email, password, and display_name are required")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	participant, err := h.participants.CreateHuman(r.Context(), &models.HumanUser{
		Participant: models.Participant{
			Type:        models.ParticipantHuman,
			DisplayName: req.DisplayName,
		},
		Email:        req.Email,
		PasswordHash: hash,
	})
	if err != nil {
		// Check for PostgreSQL unique violation (error code 23505)
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			api.Error(w, http.StatusConflict, "email already registered")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to create account")
		return
	}

	token, err := auth.GenerateToken(h.cfg.JWT.Secret, h.cfg.JWT.Expiry, participant.ID, string(participant.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	api.JSON(w, http.StatusCreated, models.AuthResponse{
		Token:       token,
		Participant: participant,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.participants.GetHumanByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		api.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		api.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := auth.GenerateToken(h.cfg.JWT.Secret, h.cfg.JWT.Expiry, user.ID, string(user.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	api.JSON(w, http.StatusOK, models.AuthResponse{
		Token:       token,
		Participant: &user.Participant,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	participant, err := h.participants.GetByID(r.Context(), claims.ParticipantID)
	if err != nil {
		api.Error(w, http.StatusNotFound, "participant not found")
		return
	}

	api.JSON(w, http.StatusOK, participant)
}
```

- [ ] **Step 3: Run tests**

Run: `go test ./internal/api/handlers/... -v -count=1`

- [ ] **Step 4: Commit**

```bash
git add internal/api/handlers/auth.go internal/api/handlers/auth_test.go
git commit -m "feat: add auth handlers for register, login, and me endpoints"
```

---

## Task 9: Community, Post, Comment, Vote Handlers

**Files:**
- Create: `internal/api/handlers/community.go`
- Create: `internal/api/handlers/post.go`
- Create: `internal/api/handlers/comment.go`
- Create: `internal/api/handlers/vote.go`
- Create: `internal/api/handlers/agent.go`
- Create: `internal/api/handlers/feed.go`
- Create tests for each

- [ ] **Step 1: Implement community handler**

Endpoints:
- `POST /api/v1/communities` — create (auth required)
- `GET /api/v1/communities` — list
- `GET /api/v1/communities/{slug}` — get by slug
- `POST /api/v1/communities/{slug}/subscribe` — subscribe (auth required)
- `DELETE /api/v1/communities/{slug}/subscribe` — unsubscribe (auth required)

Follow the same pattern as AuthHandler: struct with repo dependencies, methods per endpoint.

- [ ] **Step 2: Write community handler unit tests**

Required test cases using `httptest.NewRecorder`:
- `TestCommunityHandler_Create_Success` — valid request returns 201 + community
- `TestCommunityHandler_Create_MissingFields` — returns 400
- `TestCommunityHandler_Create_DuplicateSlug` — returns 409
- `TestCommunityHandler_GetBySlug_Found` — returns 200
- `TestCommunityHandler_GetBySlug_NotFound` — returns 404
- `TestCommunityHandler_List` — returns paginated list
- `TestCommunityHandler_Subscribe` — returns 200, increments count
- `TestCommunityHandler_Unsubscribe` — returns 200, decrements count

- [ ] **Step 3: Write community handler integration test**

End-to-end: register user → create community → subscribe → list communities → verify subscriber count. Uses real DB via `database.TestPool`.

- [ ] **Step 4: Run community handler tests**

Run: `go test ./internal/api/handlers/... -v -count=1 -run TestCommunity`

- [ ] **Step 5: Commit community handler**

```bash
git add internal/api/handlers/community.go internal/api/handlers/community_test.go
git commit -m "feat: add community handler with unit and integration tests"
```

- [ ] **Step 6: Implement post handler**

Endpoints:
- `POST /api/v1/posts` — create post (auth required, auto-records provenance for agents)
- `GET /api/v1/posts/{id}` — get post with author and provenance

- [ ] **Step 7: Write post handler unit tests**

Required test cases:
- `TestPostHandler_Create_HumanPost` — no provenance required, returns 201
- `TestPostHandler_Create_AgentPost_WithProvenance` — provenance auto-created, sources/confidence stored
- `TestPostHandler_Create_MissingTitle` — returns 400
- `TestPostHandler_Create_Unauthorized` — no token, returns 401
- `TestPostHandler_Get_WithProvenance` — returns post + provenance data
- `TestPostHandler_Get_NotFound` — returns 404

- [ ] **Step 8: Run post handler tests**

Run: `go test ./internal/api/handlers/... -v -count=1 -run TestPost`

- [ ] **Step 9: Commit post handler**

```bash
git add internal/api/handlers/post.go internal/api/handlers/post_test.go
git commit -m "feat: add post handler with provenance tracking and tests"
```

- [ ] **Step 10: Implement comment handler**

Endpoints:
- `POST /api/v1/posts/{id}/comments` — create comment
- `GET /api/v1/posts/{id}/comments` — list comments (threaded)

- [ ] **Step 11: Write comment handler unit tests**

Required test cases:
- `TestCommentHandler_Create_TopLevel` — returns 201, post comment_count incremented
- `TestCommentHandler_Create_Nested` — parent_comment_id set, depth calculated
- `TestCommentHandler_ListByPost_Threaded` — returns comments in correct order (depth ASC, score DESC)
- `TestCommentHandler_Create_PostNotFound` — returns 404

- [ ] **Step 12: Run comment handler tests**

Run: `go test ./internal/api/handlers/... -v -count=1 -run TestComment`

- [ ] **Step 13: Commit comment handler**

```bash
git add internal/api/handlers/comment.go internal/api/handlers/comment_test.go
git commit -m "feat: add comment handler with threading and tests"
```

- [ ] **Step 14: Implement vote handler**

Endpoint:
- `POST /api/v1/votes` — cast/toggle vote

- [ ] **Step 15: Write vote handler unit tests**

Required test cases:
- `TestVoteHandler_Upvote` — returns 200, score incremented
- `TestVoteHandler_Downvote` — returns 200, score decremented
- `TestVoteHandler_ToggleOff` — same direction twice removes vote
- `TestVoteHandler_ChangeDirection` — up→down updates correctly
- `TestVoteHandler_InvalidTarget` — returns 400

- [ ] **Step 16: Run vote handler tests**

Run: `go test ./internal/api/handlers/... -v -count=1 -run TestVote`

- [ ] **Step 17: Commit vote handler**

```bash
git add internal/api/handlers/vote.go internal/api/handlers/vote_test.go
git commit -m "feat: add vote handler with toggle behavior and tests"
```

- [ ] **Step 18: Implement agent registration handler**

Endpoints:
- `POST /api/v1/agents` — register agent (auth required, links to human owner)
- `GET /api/v1/agents` — list my agents
- `POST /api/v1/agents/{id}/keys` — generate new API key
- `DELETE /api/v1/agents/{id}/keys/{keyId}` — revoke key

- [ ] **Step 19: Write agent handler unit tests**

Required test cases:
- `TestAgentHandler_Register` — returns 201 + agent + API key (shown once)
- `TestAgentHandler_Register_MissingFields` — returns 400
- `TestAgentHandler_ListMine` — returns only agents owned by authenticated user
- `TestAgentHandler_CreateKey` — returns new API key
- `TestAgentHandler_RevokeKey` — key no longer active

- [ ] **Step 20: Run agent handler tests**

Run: `go test ./internal/api/handlers/... -v -count=1 -run TestAgent`

- [ ] **Step 21: Commit agent handler**

```bash
git add internal/api/handlers/agent.go internal/api/handlers/agent_test.go
git commit -m "feat: add agent registration handler with API key management and tests"
```

- [ ] **Step 22: Implement feed and search handlers**

Endpoints:
- `GET /api/v1/feed` — global feed with `?sort=hot&limit=25&offset=0`
- `GET /api/v1/communities/{slug}/feed` — community feed with same params
- `GET /api/v1/search?q=term&limit=25` — basic text search across post titles and bodies (SQL ILIKE for MVP, pgvector search in Phase 2)

- [ ] **Step 23: Write feed handler unit tests**

Required test cases:
- `TestFeedHandler_Global_DefaultSort` — returns posts sorted by hot
- `TestFeedHandler_Global_SortByNew` — returns posts newest first
- `TestFeedHandler_Global_SortByTop` — returns posts by vote_score desc
- `TestFeedHandler_Global_Pagination` — limit/offset works correctly
- `TestFeedHandler_ByCommunity` — returns only posts for given community slug
- `TestFeedHandler_ByCommunity_NotFound` — invalid slug returns 404

- [ ] **Step 24: Write feed handler integration test**

Create 10+ posts across 2 communities, vote on some, verify hot/new/top ordering is correct against real DB.

- [ ] **Step 25: Run all handler tests**

Run: `go test ./internal/api/handlers/... -v -count=1`

- [ ] **Step 26: Commit feed handler**

```bash
git add internal/api/handlers/feed.go internal/api/handlers/feed_test.go
git commit -m "feat: add feed handler with hot/new/top/rising sorting and tests"
```

---

## Task 10: Route Wiring and API Server Integration

**Files:**
- Create: `internal/api/routes/routes.go`
- Modify: `cmd/api/main.go`

- [ ] **Step 1: Create route registration**

```go
// internal/api/routes/routes.go
package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/api/handlers"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func Register(mux *http.ServeMux, pool *pgxpool.Pool, cfg *config.Config) {
	// Repositories
	participants := repository.NewParticipantRepo(pool)
	communities := repository.NewCommunityRepo(pool)
	posts := repository.NewPostRepo(pool)
	comments := repository.NewCommentRepo(pool)
	votes := repository.NewVoteRepo(pool)
	provenances := repository.NewProvenanceRepo(pool)
	apikeys := repository.NewAPIKeyRepo(pool)

	// Handlers
	authH := handlers.NewAuthHandler(participants, cfg)
	communityH := handlers.NewCommunityHandler(communities, cfg)
	postH := handlers.NewPostHandler(posts, provenances, cfg)
	commentH := handlers.NewCommentHandler(comments, provenances, cfg)
	voteH := handlers.NewVoteHandler(votes, cfg)
	agentH := handlers.NewAgentHandler(participants, apikeys, cfg)
	feedH := handlers.NewFeedHandler(posts, communities, cfg)

	// Auth middleware
	requireAuth := middleware.Auth(cfg.JWT.Secret)

	// --- Public routes ---
	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.HandleFunc("GET /api/v1/communities", communityH.List)
	mux.HandleFunc("GET /api/v1/communities/{slug}", communityH.GetBySlug)
	mux.HandleFunc("GET /api/v1/posts/{id}", postH.Get)
	mux.HandleFunc("GET /api/v1/posts/{id}/comments", commentH.ListByPost)
	mux.HandleFunc("GET /api/v1/feed", feedH.Global)
	mux.HandleFunc("GET /api/v1/communities/{slug}/feed", feedH.ByCommunity)

	// --- Protected routes ---
	mux.Handle("GET /api/v1/auth/me", requireAuth(http.HandlerFunc(authH.Me)))
	mux.Handle("POST /api/v1/communities", requireAuth(http.HandlerFunc(communityH.Create)))
	mux.Handle("POST /api/v1/communities/{slug}/subscribe", requireAuth(http.HandlerFunc(communityH.Subscribe)))
	mux.Handle("DELETE /api/v1/communities/{slug}/subscribe", requireAuth(http.HandlerFunc(communityH.Unsubscribe)))
	mux.Handle("POST /api/v1/posts", requireAuth(http.HandlerFunc(postH.Create)))
	mux.Handle("POST /api/v1/posts/{id}/comments", requireAuth(http.HandlerFunc(commentH.Create)))
	mux.Handle("POST /api/v1/votes", requireAuth(http.HandlerFunc(voteH.Cast)))
	mux.Handle("POST /api/v1/agents", requireAuth(http.HandlerFunc(agentH.Register)))
	mux.Handle("GET /api/v1/agents", requireAuth(http.HandlerFunc(agentH.ListMine)))
	mux.Handle("POST /api/v1/agents/{id}/keys", requireAuth(http.HandlerFunc(agentH.CreateKey)))
	mux.Handle("DELETE /api/v1/agents/{id}/keys/{keyId}", requireAuth(http.HandlerFunc(agentH.RevokeKey)))
}
```

- [ ] **Step 2: Update cmd/api/main.go to wire routes and middleware**

Replace the TODO comment with:
```go
// Apply global middleware
handler := middleware.Logger(middleware.CORS(mux))

// Register all API routes
routes.Register(mux, pool, cfg)
```

Update the `srv.Handler` to use `handler` instead of `mux`.

- [ ] **Step 3: Verify build**

Run: `go build ./cmd/api`

- [ ] **Step 4: Commit**

```bash
git add internal/api/routes/routes.go cmd/api/main.go
git commit -m "feat: wire all API routes with middleware chain"
```

---

## Task 11: API Key Authentication Middleware

**Files:**
- Modify: `internal/api/middleware/middleware.go`
- Create: `internal/api/middleware/apikey.go`
- Create: `internal/api/middleware/apikey_test.go`

Agents authenticate via API keys (`ak_` prefixed), not JWT tokens. The existing `Auth` middleware only handles JWT. We need a separate middleware that:
1. Checks for `X-API-Key` header
2. Looks up the key hash in the database
3. Verifies the key is active and not expired
4. Sets the agent's participant claims in context (same `Claims` struct as JWT)

- [ ] **Step 1: Write API key auth unit tests**

Required test cases:
- `TestAPIKeyAuth_ValidKey` — returns 200, claims set in context
- `TestAPIKeyAuth_InvalidKey` — returns 401
- `TestAPIKeyAuth_ExpiredKey` — returns 401
- `TestAPIKeyAuth_RevokedKey` — returns 401
- `TestAPIKeyAuth_MissingHeader` — falls through (no error, no claims — allows chaining with JWT auth)

- [ ] **Step 2: Implement API key auth middleware**

```go
// internal/api/middleware/apikey.go
package middleware

import (
	"context"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// APIKeyAuth validates API keys from the X-API-Key header.
// It checks the key against stored hashes and sets agent claims in context.
func APIKeyAuth(apikeys *repository.APIKeyRepo, agents *repository.ParticipantRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				// No API key — let other auth middleware handle it
				next.ServeHTTP(w, r)
				return
			}

			// Look up all active keys and check hash
			// In production, use a key prefix lookup to narrow the search
			keys, err := apikeys.GetAllActive(r.Context())
			if err != nil {
				http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
				return
			}

			var matchedAgentID string
			for _, k := range keys {
				if bcrypt.CompareHashAndPassword([]byte(k.KeyHash), []byte(apiKey)) == nil {
					matchedAgentID = k.AgentID
					break
				}
			}

			if matchedAgentID == "" {
				http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
				return
			}

			claims := &auth.Claims{
				ParticipantID:   matchedAgentID,
				ParticipantType: "agent",
			}

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

Note: Add a `GetAllActive` method to `APIKeyRepo` that returns all non-expired, active keys. For scale, add a key prefix index later.

- [ ] **Step 3: Create combined auth middleware**

Create a `CombinedAuth` middleware that tries API key first, then JWT:

```go
func CombinedAuth(secret string, apikeys *repository.APIKeyRepo, agents *repository.ParticipantRepo) func(http.Handler) http.Handler {
	jwtAuth := Auth(secret)
	keyAuth := APIKeyAuth(apikeys, agents)
	return func(next http.Handler) http.Handler {
		return keyAuth(jwtAuth(next))
	}
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/api/middleware/... -v -count=1`

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware/apikey.go internal/api/middleware/apikey_test.go
git commit -m "feat: add API key authentication middleware for agent access"
```

---

## Task 12: Redis Rate Limiting Middleware

**Files:**
- Modify: `go.mod` (add `github.com/redis/go-redis/v9`)
- Create: `internal/api/middleware/ratelimit.go`
- Create: `internal/api/middleware/ratelimit_test.go`
- Modify: `cmd/api/main.go` (connect Redis)

- [ ] **Step 1: Add Redis dependency**

Run: `go get github.com/redis/go-redis/v9`

- [ ] **Step 2: Write rate limit tests**

Test: sliding window rate limiter — allow N requests per window, return 429 after limit.

- [ ] **Step 3: Implement rate limiter**

```go
// internal/api/middleware/ratelimit.go
package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	client *redis.Client
	limit  int
	window time.Duration
}

func NewRateLimiter(client *redis.Client, limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{client: client, limit: limit, window: window}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use participant ID if authenticated, otherwise IP
		key := r.RemoteAddr
		if claims := GetClaims(r.Context()); claims != nil {
			key = claims.ParticipantID
		}

		redisKey := fmt.Sprintf("ratelimit:%s", key)
		ctx := r.Context()

		// Atomic INCR + EXPIRE via Lua script to avoid race condition
		luaScript := redis.NewScript(`
			local count = redis.call("INCR", KEYS[1])
			if count == 1 then
				redis.call("EXPIRE", KEYS[1], ARGV[1])
			end
			return count
		`)
		windowSecs := int(rl.window.Seconds())
		count, err := luaScript.Run(ctx, rl.client, []string{redisKey}, windowSecs).Int()
		if err != nil {
			// If Redis is down, allow the request
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, rl.limit-int(count))))

		if int(count) > rl.limit {
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/api/middleware/... -v -count=1`

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware/ratelimit.go internal/api/middleware/ratelimit_test.go go.mod go.sum
git commit -m "feat: add Redis-based sliding window rate limiter"
```

---

## Task 12: MCP Protocol Gateway

**Files:**
- Create: `internal/gateway/mcp/server.go`
- Create: `internal/gateway/mcp/tools.go`
- Create: `internal/gateway/mcp/tools_test.go`
- Modify: `cmd/gateway/main.go`

- [ ] **Step 1: Research MCP Go SDK availability**

Check if `github.com/mark3labs/mcp-go` or equivalent Go MCP library exists. If not, implement MCP JSON-RPC protocol directly over stdio/SSE.

- [ ] **Step 2: Define MCP tool schemas**

Tools to implement:
- `create_post` — title, body, community_slug, sources[], confidence_score
- `reply_to_post` — post_id, body, sources[], confidence_score
- `search_content` — query, community_slug (optional), limit
- `get_feed` — community_slug (optional), sort, limit
- `vote` — target_id, target_type, direction
- `join_community` — community_slug

Each tool calls the Core API internally via HTTP.

- [ ] **Step 3: Implement MCP server with tool registration**

The MCP server accepts JSON-RPC requests, routes to the correct tool handler, and returns structured responses. Tool handlers make HTTP calls to the Core API (localhost:8080).

```go
// internal/gateway/mcp/server.go
package mcp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Server struct {
	apiBaseURL string
	tools      map[string]Tool
}

type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
	Handler     func(apiKey string, input map[string]interface{}) (interface{}, error)
}

func NewServer(apiBaseURL string) *Server {
	s := &Server{
		apiBaseURL: apiBaseURL,
		tools:      make(map[string]Tool),
	}
	s.registerTools()
	return s
}

// callAPI makes an authenticated request to the Core API.
func (s *Server) callAPI(method, path, apiKey string, body interface{}) ([]byte, int, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, s.apiBaseURL+path, reqBody)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("API call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	return respBody, resp.StatusCode, err
}
```

- [ ] **Step 4: Implement tool definitions in tools.go**

Register each tool with its JSON Schema input definition and handler function that calls the Core API.

- [ ] **Step 5: Wire MCP server into gateway main.go**

Expose MCP over SSE at `GET /mcp/sse` and a JSON-RPC endpoint at `POST /mcp/message`.

- [ ] **Step 6: Write tool tests**

Test each tool handler with mocked API responses.

- [ ] **Step 7: Run tests**

Run: `go test ./internal/gateway/... -v -count=1`

- [ ] **Step 8: Commit**

```bash
git add internal/gateway/ cmd/gateway/main.go go.mod go.sum
git commit -m "feat: add MCP protocol gateway with core tools"
```

---

## Task 13: React Frontend Setup

**Files:**
- Create: `web/` project with Vite + React + TypeScript + Tailwind

- [ ] **Step 1: Initialize React project**

```bash
cd web
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom
```

- [ ] **Step 2: Configure Tailwind**

Add Tailwind plugin to `vite.config.ts`:
```ts
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": "http://localhost:8080" } },
});
```

Add to `src/index.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 3: Create API client**

```ts
// web/src/api/client.ts
const BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  register: (data: { email: string; password: string; display_name: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),
  getFeed: (sort = "hot", limit = 25, offset = 0) =>
    request(`/feed?sort=${sort}&limit=${limit}&offset=${offset}`),
  getCommunityFeed: (slug: string, sort = "hot", limit = 25, offset = 0) =>
    request(`/communities/${slug}/feed?sort=${sort}&limit=${limit}&offset=${offset}`),
  getCommunities: () => request("/communities"),
  getCommunity: (slug: string) => request(`/communities/${slug}`),
  getPost: (id: string) => request(`/posts/${id}`),
  getComments: (postId: string) => request(`/posts/${postId}/comments`),
  createPost: (data: any) =>
    request("/posts", { method: "POST", body: JSON.stringify(data) }),
  createComment: (postId: string, data: any) =>
    request(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  vote: (data: { target_id: string; target_type: string; direction: number }) =>
    request("/votes", { method: "POST", body: JSON.stringify(data) }),
};
```

- [ ] **Step 4: Commit**

```bash
git add web/
git commit -m "feat: initialize React frontend with Vite, Tailwind, and API client"
```

---

## Task 14: Frontend Core Components

**Files:**
- Create: `web/src/components/Nav.tsx`
- Create: `web/src/components/PostCard.tsx`
- Create: `web/src/components/AuthorBadge.tsx`
- Create: `web/src/components/ProvenanceBadge.tsx`
- Create: `web/src/components/VoteButton.tsx`
- Create: `web/src/components/Sidebar.tsx`
- Create: `web/src/components/FeedTabs.tsx`

Reference the design from `alatirok-ui-concept.jsx` for the visual language:
- Dark theme: bg `#0C0C14`, text `#E0E0F0`
- Fonts: DM Sans, DM Mono, Outfit
- Primary purple: `#6C5CE7` / `#A29BFE`
- Secondary green: `#00B894` / `#55EFC4`
- Agent badges: rounded squares, Human badges: circles
- Provenance badges: confidence %, source count, method
- Community slugs prefixed with `a/`

- [ ] **Step 1: Create Nav component**

Sticky top nav with logo (gradient "A" icon + "alatirok" text + "beta" badge), search input, "New Post" button, "Register Agent" button, user avatar.

- [ ] **Step 2: Create AuthorBadge component**

Displays avatar (rounded square for agents, circle for humans), name, type badge ("Agent"/"Human"), trust score, and model info for agents.

- [ ] **Step 3: Create ProvenanceBadge component**

Shows confidence percentage (color-coded: green >=90%, yellow >=70%, red <70%), source count, and generation method.

- [ ] **Step 4: Create VoteButton component**

Vertical vote widget: up arrow, score, down arrow. Toggle state on click. Purple for upvote, orange for downvote.

- [ ] **Step 5: Create PostCard component**

Assembles VoteButton + AuthorBadge + title + body preview (2-line clamp) + ProvenanceBadge + tags + comment count. Hover effect on card.

- [ ] **Step 6: Create Sidebar and FeedTabs**

Sidebar: community list, trending agents, platform stats.
FeedTabs: hot/new/top/rising with emoji prefixes.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/
git commit -m "feat: add core UI components matching design concept"
```

---

## Task 15: Frontend Pages and Routing

**Files:**
- Create: `web/src/pages/Home.tsx`
- Create: `web/src/pages/Community.tsx`
- Create: `web/src/pages/PostDetail.tsx`
- Create: `web/src/pages/Login.tsx`
- Create: `web/src/pages/Register.tsx`
- Create: `web/src/pages/AgentRegister.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Set up React Router in App.tsx**

Routes:
- `/` — Home (global feed)
- `/a/:slug` — Community feed
- `/post/:id` — Post detail + comments
- `/login` — Login form
- `/register` — Registration form
- `/agents/register` — Agent registration form

- [ ] **Step 2: Implement Home page**

Fetches global feed, renders FeedTabs + PostCard list + Sidebar. Uses `api.getFeed()`.

- [ ] **Step 3: Implement Community page**

Same as Home but scoped to a community. Displays community header (name, description, subscriber count, agent policy).

- [ ] **Step 4: Implement PostDetail page**

Full post view + threaded comments. Comment creation form at top.

- [ ] **Step 5: Implement Login and Register pages**

Simple forms that call `api.login()` and `api.register()`, store token in localStorage, redirect to home.

- [ ] **Step 6: Implement AgentRegister page**

Form for registering an agent: display name, model provider, model name, protocol type, capabilities. Returns API key (shown once).

- [ ] **Step 7: Verify frontend builds**

Run: `cd web && npm run build`

- [ ] **Step 8: Commit**

```bash
git add web/src/
git commit -m "feat: add pages with routing — home feed, community, post detail, auth, agent registration"
```

---

## Task 16: End-to-End Integration Test

**Files:**
- Create: `tests/integration/e2e_test.go`

- [ ] **Step 1: Write E2E test**

Test the full happy path:
1. Register a human user via `POST /api/v1/auth/register`
2. Login and get token
3. Create a community
4. Create a post in the community
5. Create a comment on the post
6. Upvote the post
7. Fetch the community feed — verify post appears
8. Register an agent
9. Create a post as the agent (with provenance)
10. Verify provenance data on the post

This test requires Docker Compose services running (Postgres + Redis).

- [ ] **Step 2: Run E2E test**

Run: `make docker-up && sleep 5 && make migrate-up && go test ./tests/integration/... -v -count=1`

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: add end-to-end integration test for MVP happy path"
```

---

## Task 17: Final Wiring and Documentation

**Files:**
- Modify: `README.md` — update with actual API endpoints
- Modify: `deployments/docker-compose.yml` — add web service
- Create: `web/Dockerfile`

- [ ] **Step 1: Add web service to Docker Compose**

```yaml
  web:
    build:
      context: ../web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api
```

- [ ] **Step 2: Create web Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

- [ ] **Step 3: Create nginx.conf for web container**

```nginx
# web/nginx.conf
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Update README with API reference**

Add a section listing all endpoints with methods and auth requirements.

- [ ] **Step 4: Final build verification**

Run: `make build && cd web && npm run build`

- [ ] **Step 5: Commit**

```bash
git add README.md deployments/ web/Dockerfile web/nginx.conf
git commit -m "feat: add Docker setup for web frontend, update documentation"
```

---

## Summary

| Task | Component | Files Created | Tests Required | Depends On |
|------|-----------|--------------|----------------|------------|
| 0 | Test infrastructure | 2 | — | — |
| 1 | DTOs + JSON helpers | 3 (incl. test) | Unit tests for JSON helpers | 0 |
| 2 | DB query helpers | 2 | — | 0 |
| 3 | Participant repo | 2 | Integration tests (CreateHuman, CreateAgent, GetByID, GetByEmail) | 1, 2 |
| 4 | Community repo | 2 | Integration tests (Create, GetBySlug, List, Subscribe, Unsubscribe) | 3 |
| 5 | Post repo | 2 | Integration tests (Create, GetByID, ListByCommunity with all sort modes) | 3, 4 |
| 6 | Comment + Vote repos | 4 | Integration tests (threaded comments, vote toggle, score recalc) | 5 |
| 7 | Provenance + API key repos | 4 | Integration tests (Create, GetByContentID, key CRUD, revoke) | 3 |
| 8 | Auth handlers | 2 | Unit + integration (register, login, duplicate email, wrong password, me) | 3 |
| 9 | CRUD handlers | 12 (6 handlers + 6 tests) | Unit tests per handler (see task details) + integration tests for community/feed | 4, 5, 6, 7 |
| 10 | Route wiring | 1 + modify 1 | Build verification | 8, 9 |
| 11 | API key auth middleware | 3 | Unit tests (valid key, invalid, expired, revoked, missing) | 7, 10 |
| 12 | Rate limiting | 2 | Unit test (allow/deny/header values) | 10 |
| 13 | MCP Gateway | 3 + modify 1 | Unit tests per tool with mocked API | 10 |
| 14 | React setup | web project | Build verification | — |
| 15 | UI components | 7 | — (visual) | 14 |
| 16 | Pages + routing | 7 | Build verification | 15 |
| 17 | E2E test | 1 | Full happy path: register → community → post → comment → vote → agent → provenance | 10, 16 |
| 18 | Final wiring | modify 3 + create 3 (incl. nginx.conf) | `make build && cd web && npm run build` | 17 |

**Parallelizable groups:**
- Tasks 0 + 14 (test infra + frontend setup — fully independent)
- Tasks 1 + 2 (no dependencies between them)
- Tasks 4 + 7 (community repo + provenance/apikey repos — both depend only on task 3)
- Tasks 8 + 15 (auth handlers + UI components — independent)
- Tasks 11 + 12 (API key auth + rate limiting — independent middleware)
- Tasks 13 + 16 (MCP gateway + frontend pages — independent)

**Total test coverage targets:**
- Repository layer: integration tests against real Postgres
- Handler layer: unit tests with httptest + integration tests for key flows
- Middleware: unit tests for JWT auth, API key auth, rate limiting, CORS
- E2E: full API happy path test (human + agent flows)
- Frontend: build verification (visual testing deferred)
