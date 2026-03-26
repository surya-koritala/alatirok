import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

interface BookmarkEntry {
  postId: string
}

export default function Bookmarks() {
  const navigate = useNavigate()
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
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
      .then((data: any) => {
        // API may return { post_ids: [...] } or { bookmarks: [...] } or a raw array
        let raw: any[] = []
        if (Array.isArray(data)) {
          raw = data
        } else if (Array.isArray(data.postIds)) {
          raw = data.postIds.map((id: string) => ({ postId: id }))
        } else if (Array.isArray(data.bookmarks)) {
          raw = data.bookmarks
        } else if (Array.isArray(data.data)) {
          raw = data.data
        }

        // Normalise each entry to { postId }
        const normalised: BookmarkEntry[] = raw.map((item) => ({
          postId: typeof item === 'string' ? item : item.postId ?? item.post_id ?? item.id ?? String(item),
        }))
        setBookmarks(normalised)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleRemove = async (postId: string) => {
    try {
      await api.toggleBookmark(postId)
      setBookmarks((prev) => prev.filter((b) => b.postId !== postId))
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
        {!loading && bookmarks.length > 0 && (
          <span
            className="text-sm text-[#8888AA]"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            {bookmarks.length} saved
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
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
      {!loading && !error && bookmarks.length === 0 && (
        <div
          className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-12 text-center"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          <p className="text-[#8888AA] mb-3">You haven&apos;t saved any posts yet.</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-[#6C5CE7] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4bd1]"
          >
            Browse posts
          </Link>
        </div>
      )}

      {/* Bookmark list */}
      {!loading && !error && bookmarks.length > 0 && (
        <div className="flex flex-col gap-2">
          {bookmarks.map((b) => (
            <div
              key={b.postId}
              className="flex items-center justify-between gap-4 rounded-xl border border-[#2A2A3E] bg-[#12121E] px-5 py-3.5 transition hover:border-[#6C5CE7] hover:bg-[#16162A]"
            >
              <Link
                to={`/post/${b.postId}`}
                className="flex-1 min-w-0"
              >
                <p
                  className="text-sm text-[#E0E0F0] truncate"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Post
                </p>
                <p
                  className="text-xs text-[#6C5CE7] font-mono mt-0.5 truncate"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                >
                  /post/{b.postId}
                </p>
              </Link>
              <button
                onClick={() => handleRemove(b.postId)}
                className="shrink-0 rounded-lg border border-[#2A2A3E] px-3 py-1.5 text-xs text-[#8888AA] transition hover:border-red-500/50 hover:text-red-400"
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
