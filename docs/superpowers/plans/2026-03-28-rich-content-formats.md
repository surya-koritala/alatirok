# Rich Content Formats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 rich content formats to MarkdownContent and MarkdownEditor — Mermaid diagrams, rich embeds, polls, collapsible sections, callout blocks, footnotes, and sortable tables.

**Architecture:** Extend the existing MarkdownContent.tsx renderer with custom remark/rehype plugins and wrapper components. Add corresponding toolbar buttons to MarkdownEditor.tsx. Polls require new backend tables and API endpoints. All other formats are frontend-only.

**Tech Stack:** React 19, react-markdown, remark-gfm, rehype-sanitize, mermaid, Next.js dynamic imports, Go backend (polls only)

**Spec:** `docs/superpowers/specs/2026-03-28-homepage-redesign-design.md` (Sub-Project 3)

---

### Task 1: Collapsible sections + Callout blocks + Footnotes

These three are the simplest — mostly CSS/config changes to the existing markdown pipeline.

**Files:**
- Modify: `web/src/components/MarkdownContent.tsx`
- Modify: `web/src/index.css`

**Collapsible sections:** Allow `<details>/<summary>` HTML tags through rehype-sanitize. Add CSS styling.

**Callout blocks:** Custom remark plugin detecting `> [!TYPE]` blockquote patterns. Transform to styled divs.

**Footnotes:** Already supported by remark-gfm — verify and add CSS styling for the footnotes section.

---

### Task 2: Mermaid diagrams

**Files:**
- Create: `web/src/components/MermaidDiagram.tsx`
- Modify: `web/src/components/MarkdownContent.tsx`

Detect ````mermaid` code blocks, render client-side via mermaid.render(). Use Next.js dynamic import with ssr:false. Lazy-load mermaid only when a diagram is present.

---

### Task 3: Rich embeds (YouTube, Twitter, GitHub)

**Files:**
- Create: `web/src/components/EmbedRenderer.tsx`
- Modify: `web/src/components/MarkdownContent.tsx`

Detect standalone URLs (YouTube, Twitter/X, GitHub) in paragraphs. YouTube → iframe. Twitter → oEmbed card (server-side fetch, no widget.js). GitHub → enhanced LinkPreview.

---

### Task 4: Sortable tables

**Files:**
- Create: `web/src/components/SortableTable.tsx`
- Modify: `web/src/components/MarkdownContent.tsx`

Wrap rendered `<table>` elements in an interactive component with click-to-sort column headers and row count.

---

### Task 5: Polls (backend + frontend)

**Files:**
- Create: `migrations/000015_add_polls.up.sql` and `.down.sql`
- Create: `internal/repository/poll.go`
- Create: `internal/api/handlers/poll.go`
- Modify: `internal/api/routes/routes.go`
- Create: `web/src/components/PollCard.tsx`
- Modify: `web/src/views/Submit.tsx`
- Modify: `web/src/api/client.ts`

Backend: polls, poll_options, poll_votes tables. Endpoints for create, vote, get.
Frontend: PollCard component for display/voting. Poll builder in Submit page.

---

### Task 6: Editor toolbar updates

**Files:**
- Modify: `web/src/components/MarkdownEditor.tsx`

Add toolbar buttons for: Strikethrough, Blockquote, Collapsible, Table, Callout (dropdown), Footnote, Mermaid. Organize in groups.

---

### Task 7: Build, deploy, verify

Build and deploy API + Web. Test each format with real content.
