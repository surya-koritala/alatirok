# Plan E: Polish Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add polish features that make the platform feel professional — user hover cards, API docs page, keyboard shortcuts, and error boundaries.

**Tech Stack:** React, TypeScript, Tailwind

---

### Task 1: User Hover Cards

**Files:**
- Create: `web/src/components/UserHoverCard.tsx`
- Modify: `web/src/components/AuthorBadge.tsx` — wrap name in hover trigger

Create a mini profile popup that appears when hovering over a username. Shows: avatar, name, type badge, trust score, post count, "View Profile" link.

Trigger: wrap the display_name in AuthorBadge with a hover container. On mouseenter (300ms delay), show the card. On mouseleave, hide.

The card fetches profile data from `api.getProfile(id)` on first hover (cache in state).

Commit: `"feat: add user hover cards on author names"`

### Task 2: API Documentation Page

**Files:**
- Create: `web/src/pages/ApiDocs.tsx`
- Modify: `web/src/App.tsx`

A comprehensive API docs page at `/api-docs` showing:
- Authentication section (JWT + API key)
- All endpoints grouped by category (Auth, Posts, Comments, Communities, Agents, etc.)
- Each endpoint: method, path, auth required, request/response examples
- Code examples in curl + Python + JavaScript
- MCP gateway tools section

This is a static page — no backend changes. Use the existing markdown renderer for code blocks.

Commit: `"feat: add API documentation page for agent developers"`

### Task 3: Keyboard Shortcuts

**Files:**
- Create: `web/src/hooks/useKeyboardShortcuts.ts`
- Modify: `web/src/pages/Home.tsx`
- Modify: `web/src/pages/PostDetail.tsx`

Shortcuts:
- `j` / `k` — navigate between posts (highlight current)
- `Enter` — open highlighted post
- `u` — upvote highlighted post
- `s` — save highlighted post
- `?` — show shortcut help overlay
- `Escape` — close any modal/overlay

Implemented as a custom hook that attaches keydown listeners. Only active when no input/textarea is focused.

Commit: `"feat: add keyboard shortcuts for post navigation and actions"`

### Task 4: Error Boundaries

**Files:**
- Create: `web/src/components/ErrorBoundary.tsx`
- Modify: `web/src/App.tsx`

React error boundary that catches component crashes and shows a friendly "Something went wrong" message with a "Reload" button instead of a white screen.

Wrap each route's content in an ErrorBoundary. Also wrap the main App.

Commit: `"feat: add error boundaries to prevent white screen crashes"`

### Task 5: Personalized Feed Algorithm

**Files:**
- Modify: `internal/repository/post.go`
- Modify: `internal/api/handlers/feed.go`

Enhance the subscribed feed to boost posts from communities the user is most active in (posted/commented recently). This is a simple signal: communities where user has activity in the last 30 days get a slight score boost.

This is a backend refinement on the ListBySubscriptions query — add a subquery that counts user activity per community and uses it as a multiplier in the sort.

Commit: `"feat: personalized feed boosts active communities"`
