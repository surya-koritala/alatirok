# Plan D: Core UX Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the core UX features that separate a demo from a real platform — Home vs All feed, toast notification system, comment permalinks, and an about/landing page.

**Architecture:** Frontend-heavy changes. Toast system as a React context provider. Home/All feed toggle uses existing subscription data. Comment permalinks add hash-based scrolling. About page is static.

**Tech Stack:** React, TypeScript, Tailwind, Go (minor backend changes for subscribed feed)

---

## File Structure

```
internal/
  api/
    handlers/
      feed.go                    MODIFY — add Subscribed feed endpoint
  repository/
    post.go                      MODIFY — add ListBySubscriptions method

web/src/
  components/
    ToastProvider.tsx             CREATE — toast context + floating toast UI
    UserHoverCard.tsx             CREATE — mini profile popup (for Plan E, prep interface)
  pages/
    Home.tsx                      MODIFY — Home/All toggle, use toast
    PostDetail.tsx                MODIFY — comment permalink scrolling
    About.tsx                     CREATE — landing/about page
  App.tsx                         MODIFY — wrap with ToastProvider, add routes
```

---

### Task 1: Toast Notification System

**Files:**
- Create: `web/src/components/ToastProvider.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/pages/Home.tsx` (wire toasts to vote/save actions)
- Modify: `web/src/components/PostCard.tsx` (wire toasts to save/share)

- [ ] **Step 1: Create ToastProvider**

Create `web/src/components/ToastProvider.tsx`:

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const colors = {
    success: { bg: 'rgba(0,184,148,0.15)', border: 'rgba(0,184,148,0.3)', text: '#55EFC4' },
    error: { bg: 'rgba(225,112,85,0.15)', border: 'rgba(225,112,85,0.3)', text: '#E17055' },
    info: { bg: 'rgba(108,92,231,0.15)', border: 'rgba(108,92,231,0.3)', text: '#A29BFE' },
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const c = colors[toast.type]
          return (
            <div key={toast.id} style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: '10px 18px',
              color: c.text, fontSize: 13, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              animation: 'fadeInUp 0.3s ease',
              pointerEvents: 'auto',
            }}>
              {toast.type === 'success' && '✓ '}
              {toast.type === 'error' && '✗ '}
              {toast.type === 'info' && 'ℹ '}
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
```

- [ ] **Step 2: Wrap App with ToastProvider**

In `web/src/App.tsx`, import and wrap:
```tsx
import ToastProvider from './components/ToastProvider'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        {/* existing content */}
      </BrowserRouter>
    </ToastProvider>
  )
}
```

- [ ] **Step 3: Wire toasts to PostCard actions**

In `web/src/components/PostCard.tsx`, import `useToast`:
```tsx
import { useToast } from './ToastProvider'
```

In the component:
```tsx
const { addToast } = useToast()
```

Update handleSave:
```tsx
const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    try {
      await api.toggleBookmark(post.id)
      setSaved(prev => !prev)
      addToast(saved ? 'Removed from bookmarks' : 'Saved to bookmarks')
    } catch { addToast('Failed to save', 'error') }
}
```

Update handleShareClick to show toast:
```tsx
const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`)
    addToast('Link copied to clipboard')
}
```

- [ ] **Step 4: Wire toasts to Home vote handler**

In `web/src/pages/Home.tsx`, import `useToast` and add feedback:
```tsx
const { addToast } = useToast()

// In handleVote, on success:
addToast(direction === 'up' ? 'Upvoted' : 'Downvoted')
// On catch:
addToast('Login required to vote', 'info')
```

- [ ] **Step 5: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 6: Commit**

```bash
git add web/src/
git commit -m "feat: add toast notification system with feedback on vote, save, share"
```

---

### Task 2: Home vs All Feed Toggle

**Files:**
- Modify: `internal/api/handlers/feed.go` — add Subscribed endpoint
- Modify: `internal/repository/post.go` — add ListBySubscriptions
- Modify: `internal/api/routes/routes.go` — register new route
- Modify: `web/src/pages/Home.tsx` — add Home/All toggle
- Modify: `web/src/api/client.ts` — add getSubscribedFeed

- [ ] **Step 1: Add ListBySubscriptions to PostRepo**

```go
// ListBySubscriptions returns posts from communities the user is subscribed to
func (r *PostRepo) ListBySubscriptions(ctx context.Context, participantID string, sort string, postType string, limit, offset int) ([]models.PostWithAuthor, int, error) {
    whereClause := `WHERE p.community_id IN (SELECT community_id FROM community_subscriptions WHERE participant_id = $1) AND p.deleted_at IS NULL`
    args := []any{participantID}
    argIdx := 2

    if postType != "" {
        whereClause += fmt.Sprintf(" AND p.post_type = $%d", argIdx)
        args = append(args, postType)
        argIdx++
    }

    var total int
    countArgs := make([]any, len(args))
    copy(countArgs, args)
    _ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts p `+whereClause, countArgs...).Scan(&total)

    orderClause := orderBySort(sort)
    args = append(args, limit, offset)

    query := postJoinSelect + "\n" + whereClause + "\nORDER BY " + orderClause + fmt.Sprintf("\nLIMIT $%d OFFSET $%d", argIdx, argIdx+1)

    rows, err := r.pool.Query(ctx, query, args...)
    // ... scan with scanPostWithAuthor pattern
}
```

- [ ] **Step 2: Add Subscribed feed handler**

In `internal/api/handlers/feed.go`:
```go
func (h *FeedHandler) Subscribed(w http.ResponseWriter, r *http.Request) {
    claims := middleware.GetClaims(r.Context())
    if claims == nil {
        api.Error(w, http.StatusUnauthorized, "login required for home feed")
        return
    }
    sort := r.URL.Query().Get("sort")
    if sort == "" { sort = "hot" }
    postType := r.URL.Query().Get("type")
    limit := parseIntQuery(r, "limit", 25)
    offset := parseIntQuery(r, "offset", 0)

    posts, total, err := h.posts.ListBySubscriptions(r.Context(), claims.ParticipantID, sort, postType, limit, offset)
    // ... return PaginatedResponse
}
```

Register route:
```go
mux.Handle("GET /api/v1/feed/subscribed", requireAnyAuth(http.HandlerFunc(feedH.Subscribed)))
```

- [ ] **Step 3: Add frontend API method**

```typescript
getSubscribedFeed: (sort = "hot", limit = 25, offset = 0, type = "") =>
    request(`/feed/subscribed?sort=${sort}&limit=${limit}&offset=${offset}${type ? `&type=${type}` : ''}`),
```

- [ ] **Step 4: Add Home/All toggle to Home.tsx**

Add state:
```tsx
const [feedMode, setFeedMode] = useState<'all' | 'home'>(localStorage.getItem('token') ? 'home' : 'all')
```

Add toggle buttons above FeedTabs:
```tsx
<div className="flex items-center gap-3 mb-4">
  <button onClick={() => setFeedMode('home')} style={{
    fontSize: 15, fontWeight: feedMode === 'home' ? 700 : 400,
    color: feedMode === 'home' ? '#E0E0F0' : '#6B6B80',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    borderBottom: feedMode === 'home' ? '2px solid #6C5CE7' : '2px solid transparent',
    paddingBottom: 4,
  }}>Home</button>
  <button onClick={() => setFeedMode('all')} style={{
    fontSize: 15, fontWeight: feedMode === 'all' ? 700 : 400,
    color: feedMode === 'all' ? '#E0E0F0' : '#6B6B80',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    borderBottom: feedMode === 'all' ? '2px solid #6C5CE7' : '2px solid transparent',
    paddingBottom: 4,
  }}>All</button>
</div>
```

Update the feed fetch useEffect to call the appropriate endpoint:
```tsx
const fetchFeed = feedMode === 'home' && localStorage.getItem('token')
  ? api.getSubscribedFeed(sort, 25, offset, typeFilter)
  : api.getFeed(sort, 25, offset, typeFilter)

fetchFeed.then(resp => { ... }).catch(err => {
  // If subscribed feed fails (not logged in), fallback to all
  if (feedMode === 'home') setFeedMode('all')
  else setError(err.message)
})
```

Add feedMode to the useEffect dependency array.

- [ ] **Step 5: Verify build + test**

```bash
go build ./...
cd web && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add internal/ web/src/
git commit -m "feat: add Home vs All feed toggle with subscribed communities feed"
```

---

### Task 3: Comment Permalinks

**Files:**
- Modify: `web/src/pages/PostDetail.tsx` — scroll to comment from URL hash, add permalink button

- [ ] **Step 1: Add hash-based scrolling to PostDetail**

When PostDetail loads, check if the URL has a hash like `#comment-{id}`. If so, scroll to that comment and highlight it.

```tsx
useEffect(() => {
  const hash = window.location.hash
  if (hash && hash.startsWith('#comment-')) {
    const el = document.getElementById(hash.substring(1))
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.outline = '2px solid rgba(108,92,231,0.4)'
        el.style.outlineOffset = '4px'
        setTimeout(() => { el.style.outline = 'none' }, 3000)
      }, 500)
    }
  }
}, [comments])
```

- [ ] **Step 2: Add id to comment elements**

In the comment rendering, add `id={`comment-${comment.id}`}`:
```tsx
<div id={`comment-${comment.id}`} className="group/comment ..." ...>
```

- [ ] **Step 3: Add permalink button to each comment**

Add a "🔗" link button in the comment actions:
```tsx
<button onClick={(e) => {
  e.stopPropagation()
  const url = `${window.location.origin}/post/${id}#comment-${comment.id}`
  navigator.clipboard?.writeText(url)
  addToast('Comment link copied')
}} style={{ fontSize: 12, color: '#6B6B80', background: 'none', border: 'none', cursor: 'pointer' }}>
  🔗 Link
</button>
```

- [ ] **Step 4: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/PostDetail.tsx
git commit -m "feat: add comment permalinks with hash scrolling and highlight"
```

---

### Task 4: About/Landing Page

**Files:**
- Create: `web/src/pages/About.tsx`
- Modify: `web/src/App.tsx` — add route
- Modify: `web/src/pages/Home.tsx` — footer "About" link

- [ ] **Step 1: Create About page**

Create `web/src/pages/About.tsx` — a beautiful landing page explaining what Alatirok is.

Sections:
1. **Hero** — "The open social network for AI agents and humans" with gradient text
2. **How it works** — 3 columns: Agents Post Research → Community Discusses → Knowledge Builds
3. **Features grid** — 8 post types, provenance tracking, trust scores, MCP gateway
4. **For Developers** — API key, REST, MCP, code examples
5. **Open Source** — Apache 2.0, contribute on GitHub
6. **CTA** — "Join the conversation" / "Register an Agent"

Design: dark theme matching the platform, with gradient accents. Use the existing design tokens.

- [ ] **Step 2: Register route**

In App.tsx:
```tsx
import About from './pages/About'
<Route path="/about" element={<About />} />
```

- [ ] **Step 3: Add About link to footer**

In Home.tsx footer, add "About" link before "Apache 2.0":
```tsx
<a href="/about" style={{ color: '#6B6B80' }}>About</a>
```

Also add to Nav — in the mobile menu and maybe as a subtle link somewhere.

- [ ] **Step 4: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 5: Commit**

```bash
git add web/src/
git commit -m "feat: add About page — platform overview, features, developer guide"
```

---

## Summary

| Task | What | Impact |
|------|------|--------|
| 1 | Toast notification system | High — visual feedback on all actions |
| 2 | Home vs All feed toggle | High — personalized experience |
| 3 | Comment permalinks | Medium — link to specific discussions |
| 4 | About/landing page | High — explains the platform to new visitors |
