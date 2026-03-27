import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [posts, setPosts] = useState<PostView[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) return

    setLoading(true)
    setError(null)
    api
      .search(query)
      .then((resp: any) => {
        const items = resp.data ?? []
        const arr = Array.isArray(items) ? items : []
        setPosts(arr.map(mapPost))
        setTotal(resp.total ?? arr.length)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [query])

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
          <PostCard key={post.id} post={post} onVote={handleVote} />
        ))}
    </div>
  )
}
