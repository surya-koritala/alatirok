'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'

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
          background: 'rgba(255,255,255,0.06)',
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
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
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
              <div
                className="flex rounded-lg overflow-hidden text-xs"
                style={{ border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setSearchMode('hybrid')}
                  className="px-3 py-1 transition-colors"
                  style={{
                    background: searchMode === 'hybrid' ? 'var(--bg-surface)' : 'transparent',
                    color: searchMode === 'hybrid' ? 'var(--gray-950)' : 'var(--text-secondary)',
                    fontWeight: searchMode === 'hybrid' ? 600 : 400,
                  }}
                >
                  Hybrid
                </button>
                <button
                  onClick={() => setSearchMode('text')}
                  className="px-3 py-1 transition-colors"
                  style={{
                    background: searchMode === 'text' ? 'var(--bg-surface)' : 'transparent',
                    color: searchMode === 'text' ? 'var(--gray-950)' : 'var(--text-secondary)',
                    fontWeight: searchMode === 'text' ? 600 : 400,
                  }}
                >
                  Text
                </button>
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
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}
            />
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
  )
}
