# Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Alatirok frontend from Vite SPA to Next.js App Router with SSR, dynamic meta tags, and SEO — with zero regressions on all existing features.

**Architecture:** Replace React Router + Vite with Next.js App Router. All 29 routes become Next.js pages. Components carry over as Client Components. Auth, theme, and SSE remain client-side via providers. API calls proxy through Next.js rewrites (env-driven URL). SSR pages fetch data server-side for meta tags, then hydrate client-side for interactivity.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.9, Tailwind CSS 4 (PostCSS), existing component library

**Spec:** `docs/superpowers/specs/2026-03-28-homepage-redesign-design.md` (Sub-Project 1)

**Scope note:** This plan covers ONLY the Next.js migration. Homepage redesign and rich content formats are separate plans.

---

## File Structure

### New files to create:
```
web/next.config.js                    — Next.js configuration (rewrites, standalone, env)
web/postcss.config.js                 — PostCSS config for Tailwind v4
web/app/layout.tsx                    — Root layout (Server Component: html, head, theme script, fonts)
web/app/providers.tsx                 — Client wrapper: AuthProvider, ToastProvider, ThemeProvider, SSE
web/app/page.tsx                      — Home page (SSR for meta, Client Component for feed)
web/app/a/[slug]/page.tsx             — Community page (SSR for meta)
web/app/a/[slug]/moderation/page.tsx  — Moderation page (Client)
web/app/post/[id]/page.tsx            — Post detail (SSR for meta)
web/app/login/page.tsx                — Login (Client)
web/app/register/page.tsx             — Register (Client)
web/app/forgot-password/page.tsx      — Forgot password (Client)
web/app/agents/register/page.tsx      — Agent register (Client)
web/app/submit/page.tsx               — Submit post (Client)
web/app/search/page.tsx               — Search (Client)
web/app/notifications/page.tsx        — Notifications (Client)
web/app/profile/[id]/page.tsx         — Profile (SSR for meta)
web/app/bookmarks/page.tsx            — Bookmarks (Client)
web/app/my-agents/page.tsx            — My agents (Client)
web/app/settings/page.tsx             — Settings (Client)
web/app/about/page.tsx                — About (Static)
web/app/docs/page.tsx                 — API docs (Static)
web/app/policy/page.tsx               — Content policy (Static)
web/app/communities/page.tsx          — Community list (SSR)
web/app/communities/create/page.tsx   — Create community (Client)
web/app/webhooks/page.tsx             — Webhooks (Client)
web/app/agents/page.tsx               — Agent directory (SSR)
web/app/agents/[id]/analytics/page.tsx — Agent analytics (SSR)
web/app/messages/page.tsx             — Messages (Client)
web/app/tasks/page.tsx                — Task marketplace (Client)
web/app/privacy/page.tsx              — Privacy (Static)
web/app/terms/page.tsx                — Terms (Static)
web/app/leaderboard/page.tsx          — Leaderboard (SSR)
web/app/challenges/page.tsx           — Challenges (SSR)
web/app/robots.ts                     — Dynamic robots.txt
web/app/sitemap.ts                    — Dynamic sitemap
web/public/og-default.png             — Default social preview image
web/src/lib/api-server.ts             — Server-side API fetcher (for SSR pages)
```

### Files to modify:
```
web/package.json            — Replace Vite deps with Next.js, update scripts
web/tsconfig.json           — Next.js-compatible TypeScript config
web/src/index.css           — Change @import "tailwindcss" to @tailwind directives if needed
web/Dockerfile              — Replace nginx with next start
web/src/api/client.ts       — No changes (continues to work client-side)
```

### Files to delete:
```
web/vite.config.ts          — Replaced by next.config.js
web/tsconfig.app.json       — Merged into tsconfig.json
web/tsconfig.node.json      — Merged into tsconfig.json
web/index.html              — Replaced by app/layout.tsx
web/src/main.tsx            — Replaced by Next.js entry
web/src/App.tsx             — Split into layout.tsx + providers.tsx
web/nginx.conf              — Replaced by Next.js rewrites
```

### Files preserved unchanged:
```
web/src/components/*.tsx     — All 18 components (add 'use client' directive)
web/src/pages/*.tsx          — All 29 pages (add 'use client' directive)
web/src/api/client.ts        — API client (already client-only)
web/src/api/mappers.ts       — Data mappers
web/src/api/types.ts         — TypeScript types
web/src/hooks/*.ts           — Custom hooks
web/public/favicon.svg       — Favicon
```

---

### Task 1: Initialize Next.js and configure build tooling

**Files:**
- Modify: `web/package.json`
- Create: `web/next.config.js`
- Create: `web/postcss.config.js`
- Modify: `web/tsconfig.json`
- Delete: `web/vite.config.ts`, `web/tsconfig.app.json`, `web/tsconfig.node.json`

- [ ] **Step 1: Update package.json dependencies**

Replace Vite-specific deps with Next.js. Keep all existing React/markdown deps.

```json
{
  "name": "@alatirok/web",
  "private": true,
  "version": "0.1.0",
  "description": "React frontend for Alatirok",
  "license": "Apache-2.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "katex": "^0.16.43",
    "mermaid": "^11.13.0",
    "next": "^15.3.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-markdown": "^10.1.0",
    "rehype-katex": "^7.0.1",
    "rehype-prism-plus": "^2.0.2",
    "rehype-sanitize": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "remark-math": "^6.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.2",
    "@types/node": "^24.12.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "eslint": "^9.39.4",
    "eslint-config-next": "^15.3.0",
    "tailwindcss": "^4.2.2",
    "typescript": "~5.9.3"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  rewrites: () => {
    const apiUrl = process.env.API_URL || 'http://localhost:8090';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL || 'https://www.alatirok.com',
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Create postcss.config.js**

```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 4: Update tsconfig.json**

Replace the references-based config with a single Next.js-compatible config:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Delete Vite files**

```bash
cd /Users/suryakoritala/Alatirok/web
rm -f vite.config.ts tsconfig.app.json tsconfig.node.json index.html src/main.tsx
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/suryakoritala/Alatirok/web
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 7: Verify Next.js initializes**

```bash
cd /Users/suryakoritala/Alatirok/web
npx next --version
```

Expected: Next.js version prints without error.

- [ ] **Step 8: Commit**

```bash
git add -A web/
git commit -m "feat(web): replace Vite with Next.js build tooling

- Swap vite/react-router deps for next.js 15
- Add next.config.js with standalone output, API rewrites
- Add postcss.config.js for Tailwind v4
- Update tsconfig.json for Next.js
- Remove vite.config.ts, index.html, main.tsx"
```

---

### Task 2: Create root layout and providers

**Files:**
- Create: `web/app/layout.tsx`
- Create: `web/app/providers.tsx`
- Preserve: `web/src/index.css` (imported by layout)
- Preserve: `web/src/components/Nav.tsx`, `web/src/components/ToastProvider.tsx`, `web/src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Add 'use client' to all existing components and pages**

Every file in `web/src/components/` and `web/src/pages/` needs `'use client'` as the first line, since they all use hooks, localStorage, or browser APIs.

```bash
cd /Users/suryakoritala/Alatirok/web
for f in src/components/*.tsx src/pages/*.tsx src/api/client.ts; do
  if ! head -1 "$f" | grep -q "'use client'"; then
    echo "'use client'" | cat - "$f" > tmp && mv tmp "$f"
  fi
done
```

- [ ] **Step 2: Create app/providers.tsx (Client Component)**

This wraps the app with ToastProvider, handles theme, and SSE connection — everything that was in `App.tsx`.

```tsx
'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import ToastProvider from '../src/components/ToastProvider'

interface ThemeContextValue {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (stored) {
      setTheme(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  // SSE connection for real-time events
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const es = new EventSource(`/api/v1/events/stream?token=${encodeURIComponent(token)}`)
    es.addEventListener('comment.created', () => {})
    es.addEventListener('mention', () => {})
    es.addEventListener('vote.received', () => {})
    es.onerror = () => { es.close() }
    return () => es.close()
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 3: Create app/layout.tsx (Server Component)**

```tsx
import type { Metadata } from 'next'
import Providers from './providers'
import ClientLayout from './client-layout'
import '../src/index.css'
import 'katex/dist/katex.min.css'

export const metadata: Metadata = {
  title: {
    default: 'Alatirok — The open network for AI agents & humans',
    template: '%s | Alatirok',
  },
  description: 'The open social network where AI agents and humans discuss research, share discoveries, and build knowledge together. Every post carries provenance.',
  openGraph: {
    type: 'website',
    siteName: 'Alatirok',
    title: 'Alatirok — The open network for AI agents & humans',
    description: 'Where AI agents and humans build knowledge together.',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alatirok',
    description: 'The open network for AI agents & humans',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&family=Outfit:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Create app/client-layout.tsx (Client Component)**

This handles the Nav, main content area, and footer — the shell that was in App.tsx.

```tsx
'use client'

import Nav from '../src/components/Nav'
import ErrorBoundary from '../src/components/ErrorBoundary'
import { useTheme } from './providers'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className="min-h-screen font-['DM_Sans']"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      <Nav onToggleTheme={toggleTheme} theme={theme} />
      <main className="max-w-7xl mx-auto px-4 pt-16">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          marginTop: 64,
          padding: '24px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>alatirok</span>
          <a href="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>About</a>
          <a href="/docs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>API Docs</a>
          <a href="/policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Content Policy</a>
          <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</a>
          <a href="https://github.com/surya-koritala/alatirok" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
          <span style={{ color: 'var(--text-muted)' }}>Apache 2.0</span>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: Verify the app starts**

```bash
cd /Users/suryakoritala/Alatirok/web
npm run dev
```

Expected: Next.js dev server starts on port 3000. Page loads (may be blank — no route pages yet).

- [ ] **Step 6: Commit**

```bash
git add app/ src/
git commit -m "feat(web): add Next.js root layout and providers

- Root layout with metadata, theme flash prevention, fonts
- Providers: theme context, toast, SSE connection
- Client layout: nav, footer, error boundary
- All existing components marked 'use client'"
```

---

### Task 3: Migrate all 29 page routes

**Files:**
- Create: All `web/app/*/page.tsx` files (29 route pages)
- Preserve: All `web/src/pages/*.tsx` (unchanged, imported by route pages)

Each Next.js page is a thin wrapper that imports the existing page component. Client-only pages simply re-export. SSR pages add `generateMetadata()` for dynamic meta tags.

- [ ] **Step 1: Create server-side API helper**

Create `web/src/lib/api-server.ts` for SSR data fetching:

```ts
const API_URL = process.env.API_URL || 'http://localhost:8090';

export async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create SSR pages with metadata (8 pages)**

Create these pages with `generateMetadata()` that fetches data server-side:

**`web/app/page.tsx`** (Home):
```tsx
import type { Metadata } from 'next'
import Home from '../src/pages/Home'

export const metadata: Metadata = {
  title: 'Alatirok — The open network for AI agents & humans',
  description: 'Where AI agents and humans discuss research, share discoveries, and build knowledge together.',
}

export default function HomePage() {
  return <Home />
}
```

**`web/app/post/[id]/page.tsx`** (Post Detail — dynamic meta):
```tsx
import type { Metadata } from 'next'
import PostDetail from '../../../src/pages/PostDetail'
import { fetchApi } from '../../../src/lib/api-server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchApi<any>(`/posts/${id}`)
  if (!post) return { title: 'Post | Alatirok' }
  const desc = (post.body || '').slice(0, 160)
  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      type: 'article',
    },
  }
}

export default function PostPage() {
  return <PostDetail />
}
```

**`web/app/a/[slug]/page.tsx`** (Community — dynamic meta):
```tsx
import type { Metadata } from 'next'
import Community from '../../../src/pages/Community'
import { fetchApi } from '../../../src/lib/api-server'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const community = await fetchApi<any>(`/communities/${slug}`)
  if (!community) return { title: 'Community | Alatirok' }
  return {
    title: `a/${community.slug} — ${community.name}`,
    description: community.description || `${community.name} community on Alatirok`,
  }
}

export default function CommunityPage() {
  return <Community />
}
```

**`web/app/profile/[id]/page.tsx`** (Profile — dynamic meta):
```tsx
import type { Metadata } from 'next'
import Profile from '../../../src/pages/Profile'
import { fetchApi } from '../../../src/lib/api-server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const profile = await fetchApi<any>(`/profiles/${id}`)
  if (!profile) return { title: 'Profile | Alatirok' }
  return {
    title: `${profile.display_name} on Alatirok`,
    description: profile.bio || `${profile.display_name}'s profile on Alatirok`,
  }
}

export default function ProfilePage() {
  return <Profile />
}
```

**`web/app/communities/page.tsx`**:
```tsx
import type { Metadata } from 'next'
import Discover from '../../src/pages/Discover'

export const metadata: Metadata = {
  title: 'Communities',
  description: 'Browse Alatirok communities where AI agents and humans collaborate.',
}

export default function CommunitiesPage() {
  return <Discover />
}
```

**`web/app/agents/page.tsx`**:
```tsx
import type { Metadata } from 'next'
import AgentDirectory from '../../src/pages/AgentDirectory'

export const metadata: Metadata = {
  title: 'Agent Directory',
  description: 'Discover AI agents on Alatirok — browse by capability, provider, and trust score.',
}

export default function AgentsPage() {
  return <AgentDirectory />
}
```

**`web/app/leaderboard/page.tsx`**:
```tsx
import type { Metadata } from 'next'
import Leaderboard from '../../src/pages/Leaderboard'

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top AI agents and humans on Alatirok ranked by reputation.',
}

export default function LeaderboardPage() {
  return <Leaderboard />
}
```

**`web/app/challenges/page.tsx`**:
```tsx
import type { Metadata } from 'next'
import Challenges from '../../src/pages/Challenges'

export const metadata: Metadata = {
  title: 'Challenges',
  description: 'Community challenges on Alatirok — compete, submit, and vote.',
}

export default function ChallengesPage() {
  return <Challenges />
}
```

- [ ] **Step 3: Create all Client-only pages (21 pages)**

These are simple re-exports with static metadata. Create each file:

```bash
# Template for each client-only page:
# app/<path>/page.tsx imports from src/pages/<Component> and adds static metadata
```

Create these files with the pattern:

**`web/app/a/[slug]/moderation/page.tsx`**:
```tsx
import CommunityModeration from '../../../../src/pages/CommunityModeration'
export const metadata = { title: 'Moderation' }
export default function Page() { return <CommunityModeration /> }
```

**`web/app/login/page.tsx`**:
```tsx
import Login from '../../src/pages/Login'
export const metadata = { title: 'Login' }
export default function Page() { return <Login /> }
```

**`web/app/register/page.tsx`**:
```tsx
import Register from '../../src/pages/Register'
export const metadata = { title: 'Register' }
export default function Page() { return <Register /> }
```

**`web/app/forgot-password/page.tsx`**:
```tsx
import ForgotPassword from '../../src/pages/ForgotPassword'
export const metadata = { title: 'Forgot Password' }
export default function Page() { return <ForgotPassword /> }
```

**`web/app/agents/register/page.tsx`**:
```tsx
import AgentRegister from '../../../src/pages/AgentRegister'
export const metadata = { title: 'Register Agent' }
export default function Page() { return <AgentRegister /> }
```

**`web/app/agents/[id]/analytics/page.tsx`**:
```tsx
import AgentAnalytics from '../../../../src/pages/AgentAnalytics'
export const metadata = { title: 'Agent Analytics' }
export default function Page() { return <AgentAnalytics /> }
```

**`web/app/submit/page.tsx`**:
```tsx
import Submit from '../../src/pages/Submit'
export const metadata = { title: 'Create Post' }
export default function Page() { return <Submit /> }
```

**`web/app/search/page.tsx`**:
```tsx
import Search from '../../src/pages/Search'
export const metadata = { title: 'Search' }
export default function Page() { return <Search /> }
```

**`web/app/notifications/page.tsx`**:
```tsx
import Notifications from '../../src/pages/Notifications'
export const metadata = { title: 'Notifications' }
export default function Page() { return <Notifications /> }
```

**`web/app/bookmarks/page.tsx`**:
```tsx
import Bookmarks from '../../src/pages/Bookmarks'
export const metadata = { title: 'Bookmarks' }
export default function Page() { return <Bookmarks /> }
```

**`web/app/my-agents/page.tsx`**:
```tsx
import MyAgents from '../../src/pages/MyAgents'
export const metadata = { title: 'My Agents' }
export default function Page() { return <MyAgents /> }
```

**`web/app/settings/page.tsx`**:
```tsx
import Settings from '../../src/pages/Settings'
export const metadata = { title: 'Settings' }
export default function Page() { return <Settings /> }
```

**`web/app/communities/create/page.tsx`**:
```tsx
import CreateCommunity from '../../../src/pages/CreateCommunity'
export const metadata = { title: 'Create Community' }
export default function Page() { return <CreateCommunity /> }
```

**`web/app/webhooks/page.tsx`**:
```tsx
import Webhooks from '../../src/pages/Webhooks'
export const metadata = { title: 'Webhooks' }
export default function Page() { return <Webhooks /> }
```

**`web/app/messages/page.tsx`**:
```tsx
import Messages from '../../src/pages/Messages'
export const metadata = { title: 'Messages' }
export default function Page() { return <Messages /> }
```

**`web/app/tasks/page.tsx`**:
```tsx
import TaskMarketplace from '../../src/pages/TaskMarketplace'
export const metadata = { title: 'Task Marketplace' }
export default function Page() { return <TaskMarketplace /> }
```

**`web/app/about/page.tsx`**:
```tsx
import About from '../../src/pages/About'
export const metadata = { title: 'About' }
export default function Page() { return <About /> }
```

**`web/app/docs/page.tsx`**:
```tsx
import ApiDocs from '../../src/pages/ApiDocs'
export const metadata = { title: 'API Documentation' }
export default function Page() { return <ApiDocs /> }
```

**`web/app/policy/page.tsx`**:
```tsx
import ContentPolicy from '../../src/pages/ContentPolicy'
export const metadata = { title: 'Content Policy' }
export default function Page() { return <ContentPolicy /> }
```

**`web/app/privacy/page.tsx`**:
```tsx
import Privacy from '../../src/pages/Privacy'
export const metadata = { title: 'Privacy Policy' }
export default function Page() { return <Privacy /> }
```

**`web/app/terms/page.tsx`**:
```tsx
import Terms from '../../src/pages/Terms'
export const metadata = { title: 'Terms of Service' }
export default function Page() { return <Terms /> }
```

- [ ] **Step 4: Fix React Router imports in existing pages**

The existing pages use `useParams`, `useNavigate`, `Link` from `react-router-dom`. These must be replaced with Next.js equivalents:

- `useParams` → `useParams` from `next/navigation`
- `useNavigate` → `useRouter` from `next/navigation` (`.push()` instead of direct call)
- `Link` from `react-router-dom` → `Link` from `next/link`
- `useSearchParams` → `useSearchParams` from `next/navigation`

Run search-and-replace across all files in `src/pages/` and `src/components/`:

```bash
cd /Users/suryakoritala/Alatirok/web
# Find all files importing from react-router-dom
grep -rl "react-router-dom" src/
```

For each file:
- Replace `import { ... } from 'react-router-dom'` with appropriate Next.js imports
- Replace `useNavigate()` calls: `const navigate = useNavigate()` → `const router = useRouter()`, then `navigate('/path')` → `router.push('/path')`
- Replace `<Link to=` → `<Link href=`
- `useParams<{ id: string }>()` stays the same import name but from `next/navigation`

- [ ] **Step 5: Verify dev server loads homepage**

```bash
cd /Users/suryakoritala/Alatirok/web
npm run dev
# Open http://localhost:3000 in browser
```

Expected: Homepage loads with feed, nav, sidebar. No console errors about missing routes.

- [ ] **Step 6: Smoke test all major routes**

Visit each in the browser:
- `/` — Home feed
- `/login` — Login form
- `/a/osai` — Community page
- `/post/<any-post-id>` — Post detail
- `/profile/<any-id>` — Profile page
- `/agents` — Agent directory
- `/leaderboard` — Leaderboard

Expected: All pages render. Auth flows work. Voting works. Comments work.

- [ ] **Step 7: Commit**

```bash
git add app/ src/
git commit -m "feat(web): migrate all 29 routes to Next.js App Router

- SSR pages with dynamic metadata: post, community, profile, agents, leaderboard, challenges
- Client pages re-export existing components
- Replace react-router-dom with next/navigation and next/link
- Server-side API helper for metadata fetching"
```

---

### Task 4: Add SEO (robots.txt, sitemap, JSON-LD)

**Files:**
- Create: `web/app/robots.ts`
- Create: `web/app/sitemap.ts`
- Create: `web/public/og-default.png` (placeholder)

- [ ] **Step 1: Create robots.ts**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
```

- [ ] **Step 2: Create sitemap.ts**

```ts
import type { MetadataRoute } from 'next'
import { fetchApi } from '../src/lib/api-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'

  // Static pages
  const staticPages = [
    '', '/about', '/docs', '/policy', '/privacy', '/terms',
    '/communities', '/agents', '/leaderboard', '/challenges', '/tasks',
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  // Dynamic: communities
  const communities = await fetchApi<any[]>('/communities') || []
  const communityPages = (Array.isArray(communities) ? communities : []).map((c: any) => ({
    url: `${siteUrl}/a/${c.slug}`,
    lastModified: new Date(c.updated_at || c.created_at),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...communityPages]
}
```

- [ ] **Step 3: Create placeholder OG image**

Create a simple 1200x630 PNG at `web/public/og-default.png`. Can be a gradient with the Alatirok logo text. For now, create a placeholder:

```bash
# Create a minimal placeholder (replace with actual design later)
cd /Users/suryakoritala/Alatirok/web/public
# Use any image tool or just create a file that can be replaced later
```

- [ ] **Step 4: Verify SEO endpoints**

```bash
cd /Users/suryakoritala/Alatirok/web
npm run dev
# Check:
# http://localhost:3000/robots.txt — should return robots rules
# http://localhost:3000/sitemap.xml — should return sitemap with community URLs
# View page source on http://localhost:3000 — should have <meta> OG tags
# View page source on http://localhost:3000/post/<id> — should have post-specific title
```

- [ ] **Step 5: Commit**

```bash
git add app/robots.ts app/sitemap.ts public/og-default.png
git commit -m "feat(web): add SEO - robots.txt, dynamic sitemap, OG tags"
```

---

### Task 5: Update Docker and deploy

**Files:**
- Modify: `web/Dockerfile`
- Delete: `web/nginx.conf`

- [ ] **Step 1: Update Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Delete nginx.conf**

```bash
rm /Users/suryakoritala/Alatirok/web/nginx.conf
```

- [ ] **Step 3: Test Docker build locally**

```bash
cd /Users/suryakoritala/Alatirok
docker buildx build --platform linux/amd64 -f web/Dockerfile -t alatirok-web-test web/
```

Expected: Build succeeds.

- [ ] **Step 4: Test Docker run locally**

```bash
docker run --rm -p 3001:3000 -e API_URL=http://host.docker.internal:8090 alatirok-web-test
# Open http://localhost:3001 — should load the app
```

Expected: App loads, API calls proxy correctly.

- [ ] **Step 5: Build and push to Azure**

```bash
cd /Users/suryakoritala/Alatirok
docker buildx build --platform linux/amd64 -f web/Dockerfile -t alatirokacr.azurecr.io/alatirok-web:v10 web/
docker push alatirokacr.azurecr.io/alatirok-web:v10
```

- [ ] **Step 6: Deploy to Azure with API_URL env var**

```bash
az containerapp update --name alatirok-web --resource-group alatirok-rg \
  --image alatirokacr.azurecr.io/alatirok-web:v10 \
  --set-env-vars "API_URL=https://alatirok-api.politeground-a4062fec.centralus.azurecontainerapps.io"
```

- [ ] **Step 7: Verify production deployment**

Visit `https://www.alatirok.com` and test:
- Homepage loads
- Login/register works
- Post detail shows correct OG tags (use https://opengraph.dev or similar)
- Community pages work
- API calls succeed (voting, commenting)
- Theme toggle works
- SSE events work (notifications)

- [ ] **Step 8: Commit**

```bash
git add web/Dockerfile
git rm web/nginx.conf
git commit -m "feat(web): update Docker for Next.js (replace nginx with node server)"
```

---

### Task 6: Regression testing checklist

This is a manual verification task, not a code task. Every item must pass before the migration is considered complete.

- [ ] **Auth flows**
  - [ ] Login with email/password
  - [ ] Register new account
  - [ ] Logout
  - [ ] Token refresh (wait 15+ min or manually expire token)
  - [ ] OAuth (GitHub) if configured

- [ ] **Content CRUD**
  - [ ] Create a post
  - [ ] Create a comment
  - [ ] Reply to a comment (threaded)
  - [ ] Upvote/downvote a post
  - [ ] Upvote/downvote a comment
  - [ ] Edit a post
  - [ ] Delete a post
  - [ ] Bookmark a post

- [ ] **Communities**
  - [ ] View community page
  - [ ] Subscribe/unsubscribe (persists on refresh)
  - [ ] Create community
  - [ ] Community moderation panel (if mod)

- [ ] **Agent features**
  - [ ] Register an agent
  - [ ] Generate API key
  - [ ] Agent directory loads
  - [ ] Agent analytics page loads

- [ ] **Real-time**
  - [ ] SSE connection established (check browser Network tab)
  - [ ] Notifications received

- [ ] **UI**
  - [ ] Dark/light theme toggle
  - [ ] Theme persists on refresh
  - [ ] Mobile responsive (resize browser)
  - [ ] Keyboard shortcuts (j/k/Enter on home feed)

- [ ] **SEO**
  - [ ] View source on homepage: OG tags present
  - [ ] View source on post page: post title in OG tags
  - [ ] `/robots.txt` accessible
  - [ ] `/sitemap.xml` accessible with community URLs
  - [ ] Image uploads display correctly

- [ ] **Commit final**

```bash
git commit --allow-empty -m "chore: Next.js migration complete - all regression tests passed"
```
