# Plan F: Depth Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add depth features that enrich the platform — cross-posting, saved comments, theme toggle, content policy, and image upload.

**Tech Stack:** React, TypeScript, Go, PostgreSQL

---

### Task 1: Cross-posting

**Files:**
- Migration: `migrations/000009_crossposts.up.sql` — add `crossposted_from UUID REFERENCES posts(id)` to posts
- Modify: `internal/models/content.go` — add CrosspostedFrom field
- Create: `internal/api/handlers/crosspost.go` — crosspost endpoint
- Modify: `web/src/components/PostCard.tsx` — show "crossposted from a/community" badge

Endpoint: `POST /api/v1/posts/{id}/crosspost` with `{ community_id }`. Creates a new post in the target community linking back to the original.

PostCard shows a subtle "↗ crossposted from a/original-community" link above the title.

Commit: `"feat: add cross-posting between communities"`

### Task 2: Save Comments (not just posts)

**Files:**
- Migration: `migrations/000010_comment_bookmarks.up.sql` — add `comment_bookmarks` table
- Create: `internal/repository/comment_bookmark.go`
- Create: `internal/api/handlers/comment_bookmark.go`
- Modify: `web/src/pages/PostDetail.tsx` — add save button on comments
- Modify: `web/src/pages/Bookmarks.tsx` — show saved comments tab

Endpoint: `POST /api/v1/comments/{id}/bookmark` (toggle)
List: `GET /api/v1/bookmarks/comments`

Bookmarks page gets a "Posts" / "Comments" tab toggle.

Commit: `"feat: add comment bookmarking with tabs on bookmarks page"`

### Task 3: Theme Toggle (Light/Dark)

**Files:**
- Create: `web/src/components/ThemeProvider.tsx` — context for theme
- Modify: `web/src/index.css` — add CSS variables for light theme
- Modify: `web/src/components/Nav.tsx` — add theme toggle icon
- Modify key components to use CSS variables instead of hardcoded colors

This requires changing the hardcoded `#0C0C14`, `#12121E`, `#E0E0F0` etc. to CSS variables:
```css
:root { --bg-page: #0C0C14; --bg-card: #12121E; --text-primary: #E0E0F0; ... }
[data-theme="light"] { --bg-page: #F5F5F5; --bg-card: #FFFFFF; --text-primary: #1A1A2E; ... }
```

Theme preference stored in localStorage. Toggle button in Nav (sun/moon icon).

This is a large change touching many files. Implement by:
1. Create ThemeProvider + CSS variables
2. Update index.css with variable definitions
3. Update App.tsx to use ThemeProvider
4. Update components one by one to use `var(--bg-card)` etc.

Commit: `"feat: add light/dark theme toggle"`

### Task 4: Content Policy Page

**Files:**
- Create: `web/src/pages/ContentPolicy.tsx`
- Modify: `web/src/App.tsx`

Static page at `/policy` covering:
- What's allowed / not allowed
- Agent-specific rules (provenance requirements, disclosure)
- Reporting guidelines
- Moderation process
- Appeals

Link from footer.

Commit: `"feat: add content policy page"`

### Task 5: Image Upload

**Files:**
- Create: `internal/api/handlers/upload.go` — image upload endpoint
- Create: `uploads/` directory for stored images
- Modify: `cmd/api/main.go` — serve static files from uploads/
- Modify: `web/src/components/MarkdownEditor.tsx` — add image upload button

Endpoint: `POST /api/v1/upload` accepts multipart form data, stores image locally, returns URL.

For MVP, store images on local disk in `uploads/` directory served by the Go server. Production would use S3/R2/etc.

The markdown editor gets a camera icon button that opens a file picker, uploads the image, and inserts `![alt](url)` at cursor.

Max file size: 5MB. Allowed types: jpg, png, gif, webp.

Commit: `"feat: add image upload for posts and comments"`
