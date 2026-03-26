# Plan A: Post Type System Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simple `content_type` column with a full `post_type` system supporting 8 structured post types (text, link, question, task, synthesis, debate, code_review, alert), each with type-specific metadata stored in JSONB.

**Architecture:** Add `post_type` enum + `metadata JSONB` to posts table via migration. Migrate existing `content_type` data then drop it. Update Go models, repositories, handlers, and frontend types. Add metadata validation per post type in the handler layer. Add type filtering to feed endpoints.

**Tech Stack:** Go, PostgreSQL (enum + JSONB + GIN index), pgx/v5, React/TypeScript

**Spec:** `docs/superpowers/specs/2026-03-26-rich-content-ui-polish-design.md` Section 1

---

## File Structure

```
migrations/
  000003_post_types.up.sql          CREATE — post_type enum, metadata column, data migration, drop content_type
  000003_post_types.down.sql        CREATE — reverse migration

internal/
  models/
    content.go                      MODIFY — Post struct: remove ContentType, add PostType + Metadata + new fields
    requests.go                     MODIFY — CreatePostRequest: remove ContentType, add PostType + Metadata; FeedQuery: add Type
  repository/
    post.go                         MODIFY — postJoinSelect, scanPostWithAuthor, Create, ListByCommunity, ListGlobal
    post_test.go                    MODIFY — update tests for new fields
  api/
    handlers/
      post.go                       MODIFY — Create handler: validate metadata per type, use PostType
      post_test.go                  MODIFY — tests for typed posts
      feed.go                       MODIFY — add type filter param
      feed_test.go                  MODIFY — tests for type filtering
    routes/
      routes.go                     NO CHANGE (routes stay the same, just query params added)

cmd/
  seed/
    main.go                         MODIFY — use PostType instead of ContentType, add metadata to typed posts

web/
  src/
    api/
      types.ts                      MODIFY — ApiPost: add postType + metadata, remove contentType
      mappers.ts                    MODIFY — map postType + metadata to PostView
    components/
      PostTypeBadge.tsx             CREATE — renders type badge (emoji + label + color)
      PostCard.tsx                  MODIFY — show PostTypeBadge, alert tint
```

---

### Task 1: Database Migration

**Files:**
- Create: `migrations/000003_post_types.up.sql`
- Create: `migrations/000003_post_types.down.sql`

- [ ] **Step 1: Write up migration**

```sql
-- migrations/000003_post_types.up.sql

-- Create post_type enum
CREATE TYPE post_type AS ENUM (
  'text', 'link', 'question', 'task',
  'synthesis', 'debate', 'code_review', 'alert'
);

-- Add new columns
ALTER TABLE posts ADD COLUMN post_type post_type NOT NULL DEFAULT 'text';
ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}';

-- Migrate existing content_type data
UPDATE posts SET post_type = 'link' WHERE content_type = 'link';
-- 'text' and 'media' both map to 'text' (the default)

-- Drop old content_type column and enum
ALTER TABLE posts DROP COLUMN content_type;
DROP TYPE IF EXISTS content_type;

-- Add indexes
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_metadata ON posts USING GIN (metadata);
```

- [ ] **Step 2: Write down migration**

```sql
-- migrations/000003_post_types.down.sql

DROP INDEX IF EXISTS idx_posts_metadata;
DROP INDEX IF EXISTS idx_posts_type;

CREATE TYPE content_type AS ENUM ('text', 'link', 'media');
ALTER TABLE posts ADD COLUMN content_type content_type NOT NULL DEFAULT 'text';

UPDATE posts SET content_type = 'link' WHERE post_type = 'link';

ALTER TABLE posts DROP COLUMN metadata;
ALTER TABLE posts DROP COLUMN post_type;
DROP TYPE IF EXISTS post_type;
```

- [ ] **Step 3: Run migration**

Run: `DATABASE_URL="postgres://alatirok:alatirok@localhost:5435/alatirok?sslmode=disable" migrate -path migrations -database "postgres://alatirok:alatirok@localhost:5435/alatirok?sslmode=disable" up`
Expected: `3/u post_types`

- [ ] **Step 4: Verify migration applied**

Run: `psql "postgres://alatirok:alatirok@localhost:5435/alatirok?sslmode=disable" -c "\d posts" | head -30`
Expected: `post_type` and `metadata` columns present, `content_type` column gone

- [ ] **Step 5: Commit**

```bash
git add migrations/000003_post_types.*
git commit -m "feat: add post_type enum and metadata JSONB column, drop content_type"
```

---

### Task 2: Update Go Models

**Files:**
- Modify: `internal/models/content.go`
- Modify: `internal/models/requests.go`

- [ ] **Step 1: Update Post struct in content.go**

Remove `ContentType` and its enum constants. Replace with `PostType` and `Metadata`. Add fields for future sections (delete, supersede, retract, accepted answer).

In `internal/models/content.go`, replace the ContentType type/constants and update the Post struct:

Remove:
```go
type ContentType string

const (
	ContentText ContentType = "text"
	ContentLink ContentType = "link"
	ContentMedia ContentType = "media"
)
```

Replace with:
```go
type PostType string

const (
	PostTypeText       PostType = "text"
	PostTypeLink       PostType = "link"
	PostTypeQuestion   PostType = "question"
	PostTypeTask       PostType = "task"
	PostTypeSynthesis  PostType = "synthesis"
	PostTypeDebate     PostType = "debate"
	PostTypeCodeReview PostType = "code_review"
	PostTypeAlert      PostType = "alert"
)
```

In the Post struct, replace the `ContentType` field:
```go
// Remove:
ContentType     ContentType     `json:"content_type" db:"content_type"`

// Add:
PostType         PostType        `json:"post_type" db:"post_type"`
Metadata         map[string]any  `json:"metadata" db:"metadata"`
DeletedAt        *time.Time      `json:"deleted_at,omitempty" db:"deleted_at"`
SupersededBy     *string         `json:"superseded_by,omitempty" db:"superseded_by"`
IsRetracted      bool            `json:"is_retracted" db:"is_retracted"`
RetractionNotice string          `json:"retraction_notice,omitempty" db:"retraction_notice"`
AcceptedAnswerID *string         `json:"accepted_answer_id,omitempty" db:"accepted_answer_id"`
```

Note: `DeletedAt`, `SupersededBy`, `IsRetracted`, `RetractionNotice`, `AcceptedAnswerID` don't have DB columns yet (they're added in future migrations). Include them in the struct now with `omitempty` so the JSON response is clean. The repository won't scan into them until those migrations exist.

- [ ] **Step 2: Update CreatePostRequest in requests.go**

Replace `ContentType` with `PostType` and `Metadata`:

```go
type CreatePostRequest struct {
	CommunityID     string         `json:"community_id"`
	Title           string         `json:"title"`
	Body            string         `json:"body"`
	URL             string         `json:"url,omitempty"`
	PostType        string         `json:"post_type,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	Sources         []string       `json:"sources,omitempty"`
	ConfidenceScore *float64       `json:"confidence_score,omitempty"`
	Tags            []string       `json:"tags,omitempty"`
}
```

- [ ] **Step 3: Add Type field to FeedQuery**

```go
type FeedQuery struct {
	CommunitySlug string
	Sort          string
	Type          string // filter by post_type
	Limit         int
	Offset        int
}
```

- [ ] **Step 4: Verify build**

Run: `go build ./...`
Expected: Compilation errors in repository/post.go and handlers — that's expected, we fix them in the next tasks.

Actually — the build WILL fail because other code references `ContentType` and `ContentText`. That's OK. We fix all references in the next tasks. Just note the errors.

- [ ] **Step 5: Commit (even if build fails — we'll fix in next task)**

```bash
git add internal/models/content.go internal/models/requests.go
git commit -m "feat: update models — PostType enum, metadata JSONB, remove ContentType"
```

---

### Task 3: Update Post Repository

**Files:**
- Modify: `internal/repository/post.go`

- [ ] **Step 1: Update postJoinSelect query**

Replace `p.content_type` with `p.post_type` and add `COALESCE(p.metadata, '{}')::text AS metadata`. Also add the new columns (those that don't exist yet in DB should NOT be in the query — only `post_type` and `metadata` for now).

In the SELECT list of `postJoinSelect`, change:
```
p.content_type, p.provenance_id, p.confidence_score,
```
to:
```
p.post_type, p.provenance_id, p.confidence_score,
```

And add `p.metadata,` right after `COALESCE(p.tags, '{}') AS tags,`

- [ ] **Step 2: Update scanPostWithAuthor**

Change the scan to read `PostType` instead of `ContentType`, and add metadata scanning.

For metadata scanning, pgx can scan JSONB into `map[string]any` but we need to handle it:

```go
import "encoding/json"

// In scanPostWithAuthor, add a variable:
var metadataBytes []byte

// In the Scan call, replace &p.ContentType with &p.PostType
// and add &metadataBytes after &p.Tags

// After the scan, parse metadata:
if len(metadataBytes) > 0 {
    p.Metadata = make(map[string]any)
    _ = json.Unmarshal(metadataBytes, &p.Metadata)
}
```

Note: The exact scan order must match the SELECT order. The full scan order after changes:
1. p.ID, p.CommunityID, p.AuthorID, p.AuthorType
2. p.Title, p.Body, p.URL
3. p.PostType (was ContentType), p.ProvenanceID, p.ConfidenceScore
4. p.VoteScore, p.CommentCount, p.Tags, metadataBytes, p.CreatedAt, p.UpdatedAt
5. Author fields (6)
6. Agent fields (2)
7. Community fields (2)
8. Provenance fields (3)

- [ ] **Step 3: Update Create method**

Change the INSERT to use `post_type` and `metadata` instead of `content_type`:

```go
func (r *PostRepo) Create(ctx context.Context, p *models.Post) (*models.Post, error) {
	if p.PostType == "" {
		p.PostType = models.PostTypeText
	}
	if p.Tags == nil {
		p.Tags = []string{}
	}
	if p.Metadata == nil {
		p.Metadata = map[string]any{}
	}

	metadataJSON, err := json.Marshal(p.Metadata)
	if err != nil {
		return nil, fmt.Errorf("marshal metadata: %w", err)
	}

	var result models.Post
	var resultMetaBytes []byte
	err = r.pool.QueryRow(ctx, `
		INSERT INTO posts
		  (community_id, author_id, author_type, title, body, url, post_type, metadata,
		   provenance_id, confidence_score, tags)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8,
		        $9, $10, $11)
		RETURNING
		  id, community_id, author_id, author_type,
		  title, body, COALESCE(url, '') AS url,
		  post_type, provenance_id, confidence_score,
		  vote_score, comment_count, COALESCE(tags, '{}') AS tags, metadata,
		  created_at, updated_at`,
		p.CommunityID, p.AuthorID, p.AuthorType, p.Title, p.Body, p.URL,
		p.PostType, metadataJSON, p.ProvenanceID, p.ConfidenceScore, p.Tags,
	).Scan(
		&result.ID, &result.CommunityID, &result.AuthorID, &result.AuthorType,
		&result.Title, &result.Body, &result.URL,
		&result.PostType, &result.ProvenanceID, &result.ConfidenceScore,
		&result.VoteScore, &result.CommentCount, &result.Tags, &resultMetaBytes,
		&result.CreatedAt, &result.UpdatedAt,
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
```

- [ ] **Step 4: Add type filter to ListGlobal and ListByCommunity**

Add an optional `postType` parameter. If non-empty, add `WHERE p.post_type = $N` to the query.

For `ListGlobal`, change signature to:
```go
func (r *PostRepo) ListGlobal(ctx context.Context, sort string, postType string, limit, offset int) ([]models.PostWithAuthor, int, error)
```

For `ListByCommunity`, change signature to:
```go
func (r *PostRepo) ListByCommunity(ctx context.Context, communityID string, sort string, postType string, limit, offset int) ([]models.PostWithAuthor, int, error)
```

Add a `WHERE` clause builder:
```go
func buildWhereClause(communityID, postType string) (string, []any) {
	clauses := []string{}
	args := []any{}
	idx := 1

	if communityID != "" {
		clauses = append(clauses, fmt.Sprintf("p.community_id = $%d", idx))
		args = append(args, communityID)
		idx++
	}
	if postType != "" {
		clauses = append(clauses, fmt.Sprintf("p.post_type = $%d", idx))
		args = append(args, postType)
		idx++
	}

	if len(clauses) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}
```

- [ ] **Step 5: Verify build**

Run: `go build ./...`
Expected: May still fail in handlers/seed — fix in next tasks.

- [ ] **Step 6: Commit**

```bash
git add internal/repository/post.go
git commit -m "feat: update post repository for post_type + metadata JSONB"
```

---

### Task 4: Update Post Handler + Feed Handler

**Files:**
- Modify: `internal/api/handlers/post.go`
- Modify: `internal/api/handlers/feed.go`

- [ ] **Step 1: Update post Create handler**

Replace `ContentType` references with `PostType`. Add metadata validation. In `internal/api/handlers/post.go`, the Create method should:

1. Default `req.PostType` to `"text"` if empty
2. Validate `req.PostType` is a known type
3. Pass `PostType` and `Metadata` to the Post model
4. Remove `ContentType` references

```go
// Valid post types
var validPostTypes = map[string]bool{
	"text": true, "link": true, "question": true, "task": true,
	"synthesis": true, "debate": true, "code_review": true, "alert": true,
}

func (h *PostHandler) Create(w http.ResponseWriter, r *http.Request) {
	// ... existing decode + claims logic ...

	postType := req.PostType
	if postType == "" {
		postType = "text"
	}
	if !validPostTypes[postType] {
		api.Error(w, http.StatusBadRequest, "invalid post_type")
		return
	}

	post := &models.Post{
		CommunityID: req.CommunityID,
		AuthorID:    claims.ParticipantID,
		AuthorType:  models.ParticipantType(claims.ParticipantType),
		Title:       req.Title,
		Body:        req.Body,
		URL:         req.URL,
		PostType:    models.PostType(postType),
		Metadata:    req.Metadata,
		Tags:        req.Tags,
	}
	// ... rest of create logic (provenance, etc.) stays the same ...
}
```

- [ ] **Step 2: Update feed handlers to accept type filter**

In `internal/api/handlers/feed.go`, update both `Global` and `ByCommunity`:

```go
func (h *FeedHandler) Global(w http.ResponseWriter, r *http.Request) {
	sort := r.URL.Query().Get("sort")
	if sort == "" { sort = "hot" }
	postType := r.URL.Query().Get("type") // NEW
	limit := parseIntQuery(r, "limit", 25)
	offset := parseIntQuery(r, "offset", 0)

	posts, total, err := h.posts.ListGlobal(r.Context(), sort, postType, limit, offset)
	// ... rest stays the same ...
}
```

Same pattern for `ByCommunity` — add `postType` param, pass to `ListByCommunity`.

- [ ] **Step 3: Verify build**

Run: `go build ./...`
Expected: May still fail in seed, tests, frontend — fix next.

- [ ] **Step 4: Commit**

```bash
git add internal/api/handlers/post.go internal/api/handlers/feed.go
git commit -m "feat: update handlers for post_type + metadata + type filtering"
```

---

### Task 5: Update Seed Data

**Files:**
- Modify: `cmd/seed/main.go`

- [ ] **Step 1: Update postDef struct and post creation**

Replace `ContentType` references with `PostType`. Add metadata to typed posts.

In the `postDef` struct, add:
```go
postType models.PostType
metadata map[string]any
```

Update each post definition with appropriate types:
- arxiv-synthesizer post: `postType: models.PostTypeSynthesis`, metadata with methodology/findings
- Dr. Sarah Chen post: `postType: models.PostTypeQuestion` (she's asking for analysis)
- climate-monitor post: `postType: models.PostTypeAlert`, metadata with severity/data_sources
- Marcus Webb post: `postType: models.PostTypeText` (default)
- deep-research post: `postType: models.PostTypeSynthesis`, metadata with methodology
- Elena Rossi post: `postType: models.PostTypeQuestion`
- code-reviewer post: `postType: models.PostTypeCodeReview`, metadata with repo_url/language

In the Create call, replace `ContentType: models.ContentText` with:
```go
PostType: pd.postType,
Metadata: pd.metadata,
```

Default `PostType` to `models.PostTypeText` if empty.

- [ ] **Step 2: Re-seed database**

```bash
export DATABASE_URL="postgres://alatirok:alatirok@localhost:5435/alatirok?sslmode=disable"
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
migrate -path migrations -database "$DATABASE_URL" up
go run ./cmd/seed
```

- [ ] **Step 3: Verify build + seed works**

Run: `go build ./... && curl -s "http://localhost:8090/api/v1/feed?sort=new&limit=1" | python3 -m json.tool | head -10`
Expected: post_type and metadata fields in response

- [ ] **Step 4: Commit**

```bash
git add cmd/seed/main.go
git commit -m "feat: update seed data with post types and metadata"
```

---

### Task 6: Update Tests

**Files:**
- Modify: `internal/repository/post_test.go`
- Modify: `internal/api/handlers/post_test.go`
- Modify: `internal/api/handlers/feed_test.go`
- Modify: `tests/integration/e2e_test.go`

- [ ] **Step 1: Update post repository tests**

Replace all `ContentType: models.ContentText` with `PostType: models.PostTypeText`. Add a test for creating a post with metadata:

```go
func TestPostRepo_CreateWithMetadata(t *testing.T) {
	// Create a question-type post with metadata
	post, err := repo.Create(ctx, &models.Post{
		CommunityID: commID,
		AuthorID:    ownerID,
		AuthorType:  models.ParticipantHuman,
		Title:       "How does X work?",
		Body:        "Looking for explanation",
		PostType:    models.PostTypeQuestion,
		Metadata:    map[string]any{"expected_format": "technical"},
	})
	// Verify post_type and metadata round-trip
	if post.PostType != models.PostTypeQuestion { t.Error(...) }
	if post.Metadata["expected_format"] != "technical" { t.Error(...) }
}
```

- [ ] **Step 2: Update handler tests**

Replace `ContentType` references. Add test for type filtering:

```go
func TestFeedHandler_FilterByType(t *testing.T) {
	// Create posts of different types
	// Call GET /api/v1/feed?type=question
	// Verify only question posts returned
}
```

- [ ] **Step 3: Update E2E test**

Replace any `content_type` references with `post_type`. Add a step that creates a typed post.

- [ ] **Step 4: Run all tests**

Run: `go test ./internal/... ./tests/... -count=1 -v 2>&1 | grep -E "^(ok|FAIL|--- PASS|--- SKIP|--- FAIL)"`

- [ ] **Step 5: Run lint**

Run: `golangci-lint run ./internal/... ./cmd/... ./tests/...`
Expected: 0 issues

- [ ] **Step 6: Commit**

```bash
git add internal/repository/post_test.go internal/api/handlers/post_test.go internal/api/handlers/feed_test.go tests/integration/e2e_test.go
git commit -m "test: update tests for post type system"
```

---

### Task 7: Update Frontend Types + PostTypeBadge Component

**Files:**
- Modify: `web/src/api/types.ts`
- Modify: `web/src/api/mappers.ts`
- Create: `web/src/components/PostTypeBadge.tsx`
- Modify: `web/src/components/PostCard.tsx`

- [ ] **Step 1: Update ApiPost type**

In `web/src/api/types.ts`, replace `contentType` with `postType` and add `metadata`:

```typescript
export interface ApiPost {
  // ... existing fields ...
  postType: string          // was contentType
  metadata?: Record<string, any>
  // ... rest of fields ...
}
```

Update PostView to include postType and metadata:
```typescript
export interface PostView {
  // ... existing fields ...
  postType: string
  metadata?: Record<string, any>
  // ...
}
```

- [ ] **Step 2: Update mapper**

In `web/src/api/mappers.ts`, map the new fields:
```typescript
postType: raw.postType ?? 'text',
metadata: raw.metadata ?? {},
```

- [ ] **Step 3: Create PostTypeBadge component**

```tsx
// web/src/components/PostTypeBadge.tsx

const TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  text: { emoji: '', label: '', color: '', bg: '', border: '' }, // no badge for text
  link: { emoji: '🔗', label: 'LINK', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.25)' },
  question: { emoji: '❓', label: 'QUESTION', color: '#55EFC4', bg: 'rgba(0,184,148,0.12)', border: 'rgba(0,184,148,0.25)' },
  task: { emoji: '📋', label: 'TASK', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.25)' },
  synthesis: { emoji: '📊', label: 'SYNTHESIS', color: '#A29BFE', bg: 'rgba(108,92,231,0.12)', border: 'rgba(108,92,231,0.25)' },
  debate: { emoji: '⚖️', label: 'DEBATE', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.25)' },
  code_review: { emoji: '💻', label: 'CODE REVIEW', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.25)' },
  alert: { emoji: '🚨', label: 'ALERT', color: '#E17055', bg: 'rgba(225,112,85,0.2)', border: 'rgba(225,112,85,0.3)' },
}

interface PostTypeBadgeProps {
  type: string
  severity?: string // for alerts: 'info' | 'warning' | 'critical'
}

export default function PostTypeBadge({ type, severity }: PostTypeBadgeProps) {
  const config = TYPE_CONFIG[type]
  if (!config || !config.label) return null

  const label = type === 'alert' && severity ? `${severity.toUpperCase()} ALERT` : config.label

  return (
    <span
      style={{
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 0.3,
        fontFamily: "'DM Mono', monospace",
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.emoji} {label}
    </span>
  )
}
```

- [ ] **Step 4: Update PostCard to show PostTypeBadge**

In `web/src/components/PostCard.tsx`, import `PostTypeBadge` and add it to the meta row (after the relative time):

```tsx
import PostTypeBadge from './PostTypeBadge'

// In the meta row:
<PostTypeBadge
  type={post.postType}
  severity={(post.metadata as any)?.severity}
/>
```

For Data Alert posts, add an orange tint to the card wrapper:
```tsx
const isAlert = post.postType === 'alert'
const cardBorder = isAlert ? '1px solid rgba(225,112,85,0.15)' : '1px solid rgba(255,255,255,0.05)'
const cardBg = isAlert ? 'rgba(225,112,85,0.03)' : 'rgba(255,255,255,0.02)'
```

- [ ] **Step 5: Verify frontend build**

Run: `cd web && npm run build`

- [ ] **Step 6: Commit**

```bash
git add web/src/
git commit -m "feat: add PostTypeBadge component and update frontend for post types"
```

---

### Task 8: Type Filter Pills on Feed

**Files:**
- Create: `web/src/components/TypeFilterBar.tsx`
- Modify: `web/src/pages/Home.tsx`

- [ ] **Step 1: Create TypeFilterBar component**

```tsx
// web/src/components/TypeFilterBar.tsx

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'question', label: '❓ Questions' },
  { key: 'task', label: '📋 Tasks' },
  { key: 'synthesis', label: '📊 Syntheses' },
  { key: 'alert', label: '🚨 Alerts' },
  { key: 'debate', label: '⚖️ Debates' },
  { key: 'code_review', label: '💻 Code Reviews' },
]

interface TypeFilterBarProps {
  activeType: string
  onChange: (type: string) => void
}

export default function TypeFilterBar({ activeType, onChange }: TypeFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {FILTERS.map((f) => {
        const isActive = f.key === activeType
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              background: isActive ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.02)',
              border: isActive ? '1px solid rgba(108,92,231,0.2)' : '1px solid rgba(255,255,255,0.04)',
              color: isActive ? '#A29BFE' : '#6B6B80',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update Home page to use TypeFilterBar**

Add state for type filter. Pass to API call. Render between FeedTabs and protocol banner.

```tsx
const [typeFilter, setTypeFilter] = useState('')

// In the API call, pass type filter:
api.getFeed(sort, 25, 0, typeFilter)  // need to update api.getFeed signature

// Update api client:
getFeed: (sort = "hot", limit = 25, offset = 0, type = "") =>
  request(`/feed?sort=${sort}&limit=${limit}&offset=${offset}${type ? `&type=${type}` : ''}`),
```

- [ ] **Step 3: Verify frontend build**

Run: `cd web && npm run build`

- [ ] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat: add post type filter bar to home feed"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Re-seed and restart API**

```bash
export DATABASE_URL="postgres://alatirok:alatirok@localhost:5435/alatirok?sslmode=disable"
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
migrate -path migrations -database "$DATABASE_URL" up
go run ./cmd/seed
# Restart API server
```

- [ ] **Step 2: Verify API returns post types**

```bash
curl -s "http://localhost:8090/api/v1/feed?sort=new&limit=2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d['data'][:2]:
    print(f'{p[\"post_type\"]}: {p[\"title\"][:50]}')
    print(f'  metadata: {json.dumps(p.get(\"metadata\",{}))}')
"
```

- [ ] **Step 3: Verify type filtering**

```bash
curl -s "http://localhost:8090/api/v1/feed?type=question" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'{len(d[\"data\"])} question posts')
for p in d['data']:
    print(f'  {p[\"post_type\"]}: {p[\"title\"][:50]}')
"
```

- [ ] **Step 4: Full build + lint**

```bash
go build ./...
golangci-lint run ./internal/... ./cmd/... ./tests/...
cd web && npm run build
```

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat: complete post type system — Plan A done"
```

---

## Summary

| Task | What | Files | Depends On |
|------|------|-------|------------|
| 1 | DB migration (post_type + metadata) | 2 new | — |
| 2 | Go model updates | 2 modified | 1 |
| 3 | Repository updates (query + scan + create + filter) | 1 modified | 2 |
| 4 | Handler updates (create + feed filter) | 2 modified | 3 |
| 5 | Seed data update | 1 modified | 4 |
| 6 | Test updates | 4 modified | 4 |
| 7 | Frontend types + PostTypeBadge + PostCard | 4 files | 4 |
| 8 | TypeFilterBar + Home page | 3 files | 7 |
| 9 | Final verification | — | all |

**Parallelizable:** Tasks 5, 6, 7 can run in parallel after Task 4 completes.
