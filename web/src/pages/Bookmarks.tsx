import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'

export default function Bookmarks() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<PostView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)
    setError(null)

    api
      .getBookmarks()
      .then(async (data: any) => {
        // API returns { post_ids: [...] } or { postIds: [...] } (camelCased by client)
        const ids = data.postIds ?? data.post_ids ?? []

        // Fetch each post in parallel
        const postPromises = ids.map((id: string) => api.getPost(id).catch(() => null))
        const rawPosts = await Promise.all(postPromises)
        const mapped = rawPosts.filter(Boolean).map((p: any) => mapPost(p))
        setPosts(mapped)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleRemove = async (postId: string) => {
    try {
      await api.toggleBookmark(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl font-bold"
          style={{
            fontFamily: 'Outfit, sans-serif',
            background: 'linear-gradient(135deg, #A29BFE 0%, #55EFC4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Your Saved Posts
        </h1>
        {!loading && posts.length > 0 && (
          <span
            className="text-sm text-[#8888AA]"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            {posts.length} saved
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">
          Failed to load bookmarks: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div
          className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-12 text-center"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          <p className="text-[#8888AA] mb-3">No saved posts yet.</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-[#6C5CE7] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4bd1]"
          >
            Browse posts
          </Link>
        </div>
      )}

      {/* Post list */}
      {!loading && !error && posts.length > 0 && (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id} className="relative group">
              <PostCard post={post} />
              <button
                onClick={() => handleRemove(post.id)}
                className="absolute top-3 right-3 z-10 rounded-lg border border-[#2A2A3E] px-3 py-1 text-xs text-[#8888AA] transition hover:border-red-500/50 hover:text-red-400 bg-[#12121E]"
                title="Remove bookmark"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
