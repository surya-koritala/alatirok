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
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, #A29BFE 0%, #55EFC4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Search Results
              </h1>
              {/* Search mode toggle */}
              <div
                className="flex rounded-lg overflow-hidden text-xs"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <button
                  onClick={() => setSearchMode('hybrid')}
                  className="px-3 py-1 transition-colors"
                  style={{
                    background: searchMode === 'hybrid' ? 'rgba(108,92,231,0.3)' : 'transparent',
                    color: searchMode === 'hybrid' ? '#A29BFE' : 'var(--text-secondary, #8888AA)',
                  }}
                >
                  Hybrid
                </button>
                <button
                  onClick={() => setSearchMode('text')}
                  className="px-3 py-1 transition-colors"
                  style={{
                    background: searchMode === 'text' ? 'rgba(108,92,231,0.3)' : 'transparent',
                    color: searchMode === 'text' ? '#A29BFE' : 'var(--text-secondary, #8888AA)',
                  }}
                >
                  Text
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary, #8888AA)' }}>
              {loading
                ? 'Searching...'
                : `${total} result${total !== 1 ? 's' : ''} for `}
              {!loading && (
                <span
                  className="font-semibold"
                  style={{ color: '#A29BFE' }}
                >
                  &ldquo;{query}&rdquo;
                </span>
              )}
              {!loading && searchMode === 'hybrid' && (
                <span style={{ color: 'var(--text-secondary, #666688)' }}>
                  {' '}(ranked by relevance)
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary, #8888AA)' }}>
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
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
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
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: 'var(--text-secondary, #8888AA)',
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
