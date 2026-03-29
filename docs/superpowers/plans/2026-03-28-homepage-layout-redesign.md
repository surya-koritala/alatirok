# Homepage + Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the homepage with a compact hero for logged-out visitors, a live activity ticker, and an enhanced sidebar with all platform features organized in collapsible groups.

**Architecture:** Replace the existing welcome banner + protocol banner with a compact hero (tagline + live stats + activity ticker). Reorganize the existing Sidebar component to include communities, online agents, discover links, stats, and trending agents — all with collapsible sections. Remove the Explore dropdown from Nav (sidebar covers it). Add a new backend endpoint for recent activity.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS, Go backend

**Spec:** `docs/superpowers/specs/2026-03-28-homepage-redesign-design.md` (Sub-Project 2)

---

### Task 1: Add backend activity/recent endpoint

**Files:**
- Create: `internal/api/handlers/activity.go`
- Modify: `internal/api/routes/routes.go`

The hero's activity ticker needs a public endpoint returning recent platform events.

- [ ] **Step 1: Create the activity handler**

Create `internal/api/handlers/activity.go`. It queries recent posts and comments (last 20) with author display names, ordered by created_at DESC. Returns JSON array of events.

- [ ] **Step 2: Register the route**

Add `GET /api/v1/activity/recent` as a public route (no auth) in `routes.go`.

- [ ] **Step 3: Verify endpoint works**

```bash
curl http://localhost:8090/api/v1/activity/recent?limit=10
```

- [ ] **Step 4: Commit**

---

### Task 2: Build the Hero component

**Files:**
- Create: `web/src/components/Hero.tsx`

A client component showing the compact hero for logged-out visitors.

- [ ] **Step 1: Create Hero.tsx**

Component includes:
- Left side: tagline "The open network for AI agents & humans", subtitle, two CTAs (Join + Connect your agent)
- Right side: 3 live stats (agents online, total posts, total agents) fetched from `/api/v1/stats` and `/api/v1/agents/online/count`
- Bottom: activity ticker — horizontal scrolling bar with recent events from `/api/v1/activity/recent`, auto-scrolling via CSS animation
- Dismissible with × button, preference saved to localStorage key `hero_dismissed`
- Does not render if user is logged in (check for token in localStorage)
- Responsive: stats stack below text on mobile

- [ ] **Step 2: Verify locally**

Open http://localhost:3000 in incognito (logged out) — hero should appear. Login — hero should not appear.

- [ ] **Step 3: Commit**

---

### Task 3: Rebuild Sidebar with all features

**Files:**
- Modify: `web/src/components/Sidebar.tsx`

Replace the current 3-section sidebar with the new 6-section design.

- [ ] **Step 1: Rewrite Sidebar.tsx**

New sections (top to bottom):
1. **Create Post CTA** — purple button → /submit
2. **Communities** — top 5 shown, "Show N more" expander, "Browse all" link, "+ Create" for logged-in
3. **Online Agents** — green pulse dot, pill badges from `/api/v1/agents/online`, "+N more" overflow
4. **Discover** — collapsible (default expanded), chevron toggle: Agent Directory, Leaderboard, Challenges, Tasks
5. **Platform Stats** — 2x2 grid (agents, humans, communities, posts)
6. **Trending Agents** — collapsible (default expanded), top 3 with rank, "Show more" expander

Collapsible state saved to localStorage (`sidebar_discover_collapsed`, `sidebar_trending_collapsed`).
Sidebar is sticky (`position: sticky; top: 72px`) with max-height and overflow scroll.

- [ ] **Step 2: Verify all sections render and collapse/expand works**

- [ ] **Step 3: Commit**

---

### Task 4: Integrate Hero and Sidebar into Home page

**Files:**
- Modify: `web/src/views/Home.tsx`

- [ ] **Step 1: Replace welcome banner and protocol banner with Hero component**

Remove the existing `!localStorage.getItem('token') && !dismissed` banner (lines ~149-179) and the protocol banner (lines ~200-263). Import and render `<Hero />` in their place.

- [ ] **Step 2: Pass new Sidebar to the layout**

The Home view currently renders `<Sidebar communities={communities} stats={stats} />`. Update it to render the new Sidebar (which fetches its own data internally).

- [ ] **Step 3: Verify the home page shows hero (logged out) and new sidebar**

- [ ] **Step 4: Commit**

---

### Task 5: Simplify Nav (remove Explore dropdown)

**Files:**
- Modify: `web/src/components/Nav.tsx`

- [ ] **Step 1: Remove the Explore dropdown**

The sidebar now has the Discover section covering Agent Directory, Leaderboard, Challenges, Tasks. Remove the Explore dropdown from Nav. Keep About, API Docs, Content Policy in the footer (already there).

- [ ] **Step 2: Verify nav is cleaner and all links still reachable via sidebar or footer**

- [ ] **Step 3: Commit**

---

### Task 6: Build, deploy, and verify

- [ ] **Step 1: Build**
```bash
cd /Users/suryakoritala/Alatirok/web && npm run build
```

- [ ] **Step 2: Build and deploy API (if activity endpoint was added)**
```bash
docker buildx build --platform linux/amd64 -f deployments/docker/Dockerfile -t alatirokacr.azurecr.io/alatirok-api:v11 .
docker push alatirokacr.azurecr.io/alatirok-api:v11
az containerapp update --name alatirok-api --resource-group alatirok-rg --image alatirokacr.azurecr.io/alatirok-api:v11
```

- [ ] **Step 3: Build and deploy web**
```bash
docker buildx build --platform linux/amd64 --build-arg API_URL=https://alatirok-api.politeground-a4062fec.centralus.azurecontainerapps.io -f web/Dockerfile -t alatirokacr.azurecr.io/alatirok-web:v13 web/
docker push alatirokacr.azurecr.io/alatirok-web:v13
az containerapp update --name alatirok-web --resource-group alatirok-rg --image alatirokacr.azurecr.io/alatirok-web:v13
```

- [ ] **Step 4: Verify on production**
- Hero visible for logged-out visitors
- Hero hidden for logged-in users
- Activity ticker scrolling
- Sidebar all 6 sections render
- Collapsible sections work
- Online agents show
- Mobile responsive

- [ ] **Step 5: Commit**
