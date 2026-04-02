'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  // Color gradient from amber (low) to green (high)
  const hue = Math.round(score * 120) // 0 = red, 120 = green
  return (
    <div className="flex items-center gap-2 mb-1">
      <div
        className="h-1.5 rounded-full"
        style={{
          width: '80px',
          background: 'var(--gray-100)',
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: `hsl(${hue}, 70%, 55%)`,
          }}
        />
      </div>
      <span
        className="text-xs font-mono"
        style={{ color: `hsl(${hue}, 70%, 55%)` }}
      >
        {pct}%
      </span>
    </div>
  )
}

export default function Search() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [posts, setPosts] = useState<PostView[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'hybrid' | 'text'>('hybrid')

  useEffect(() => {
    if (!query) return

    setLoading(true)
    setError(null)
    api
      .search(query, 25, 0, searchMode)
      .then((resp: any) => {
        const items = resp.data ?? []
        const arr = Array.isArray(items) ? items : []
        setPosts(arr.map(mapPost))
        setTotal(resp.total ?? arr.length)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [query, searchMode])

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    try {
      await api.vote({ target_id: postId, target_type: 'post', direction })
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          const undo = direction === p.userVote
          return {
            ...p,
            score: undo
              ? p.score + (direction === 'up' ? -1 : 1)
              : p.score + (direction === 'up' ? 1 : -1),
            userVote: undo ? null : direction,
          }
        })
      )
    } catch {
      // ignore vote errors
    }
  }

  return (
    <div className="page-grid">
      <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        {query ? (
          <>
            <div className="flex items-center justify-between">
              <h1
                className="text-2xl font-bold"
                style={{
                  color: 'var(--gray-950)',
                  letterSpacing: '-0.02em',
                }}
              >
                Search Results
              </h1>
              {/* Search mode toggle */}
              <div style={{ display: 'flex', gap: 2, background: 'var(--gray-100)', borderRadius: 8, padding: 2 }}>
                {(['hybrid', 'text'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSearchMode(mode)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none',
                      background: searchMode === mode ? '#fff' : 'transparent',
                      color: searchMode === mode ? 'var(--gray-900)' : 'var(--gray-500)',
                      fontSize: 12, fontWeight: searchMode === mode ? 600 : 500,
                      fontFamily: 'inherit', cursor: 'pointer',
                      boxShadow: searchMode === mode ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {loading
                ? 'Searching...'
                : `${total} result${total !== 1 ? 's' : ''} for `}
              {!loading && (
                <span
                  className="font-semibold"
                  style={{ color: 'var(--indigo)' }}
                >
                  &ldquo;{query}&rdquo;
                </span>
              )}
              {!loading && searchMode === 'hybrid' && (
                <span style={{ color: 'var(--text-muted)' }}>
                  {' '}(ranked by relevance)
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter a search query in the search bar above.
          </p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ padding: '20px 0', borderBottom: '1px solid var(--gray-100)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <div className="skeleton" style={{ width: 80, height: 12 }} />
                <div className="skeleton skeleton-avatar" />
                <div className="skeleton" style={{ width: 60, height: 12 }} />
              </div>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" style={{ width: '85%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Search failed: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && query && posts.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-secondary)',
          }}
        >
          No results found for &ldquo;{query}&rdquo;. Try a different search term.
        </div>
      )}

      {/* Results */}
      {!loading &&
        posts.map((post) => (
          <div key={post.id}>
            {post.relevanceScore != null && post.relevanceScore > 0 && (
              <RelevanceBar score={post.relevanceScore} />
            )}
            <PostCard post={post} onVote={handleVote} />
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:block" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
        <Sidebar />
      </aside>
    </div>
  )
}
