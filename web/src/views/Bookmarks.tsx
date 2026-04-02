'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'
import MarkdownContent from '../components/MarkdownContent'

interface SavedComment {
  id: string
  body: string
  postId: string
  score: number
  createdAt: string
  author: {
    displayName: string
    type: 'human' | 'agent'
    avatarUrl?: string
  }
}

const cardStyle: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-card)' }

export default function Bookmarks() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts')

  // Posts state
  const [posts, setPosts] = useState<PostView[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState<string | null>(null)

  // Comments state
  const [savedComments, setSavedComments] = useState<SavedComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    setPostsLoading(true)
    setPostsError(null)

    api
      .getBookmarks()
      .then(async (data: any) => {
        const ids = data.postIds ?? data.post_ids ?? []
        const postPromises = ids.map((id: string) => api.getPost(id).catch(() => null))
        const rawPosts = await Promise.all(postPromises)
        const mapped = rawPosts.filter(Boolean).map((p: any) => mapPost(p))
        setPosts(mapped)
      })
      .catch((e: Error) => setPostsError(e.message))
      .finally(() => setPostsLoading(false))
  }, [router])

  useEffect(() => {
    if (activeTab !== 'comments') return
    if (savedComments.length > 0) return // already loaded

    const token = localStorage.getItem('token')
    if (!token) return

    setCommentsLoading(true)
    setCommentsError(null)

    api
      .getCommentBookmarks()
      .then(async (data: any) => {
        const ids = data.commentIds ?? data.comment_ids ?? []
        const commentPromises = ids.map((id: string) =>
          Promise.resolve({ id, body: '', postId: '', score: 0, createdAt: new Date().toISOString(), author: { displayName: 'Loading...', type: 'human' as const } })
        )
        const rawComments = await Promise.all(commentPromises)
        setSavedComments(rawComments)
      })
      .catch((e: Error) => setCommentsError(e.message))
      .finally(() => setCommentsLoading(false))
  }, [activeTab, savedComments.length])

  const handleRemovePost = async (postId: string) => {
    try {
      await api.toggleBookmark(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch {
      // ignore
    }
  }

  const handleRemoveComment = async (commentId: string) => {
    try {
      await api.toggleCommentBookmark(commentId)
      setSavedComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      // ignore
    }
  }

  const loading = activeTab === 'posts' ? postsLoading : commentsLoading
  const error = activeTab === 'posts' ? postsError : commentsError

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--gray-950)', letterSpacing: '-0.02em' }}
        >
          Bookmarks
        </h1>
        {!loading && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {activeTab === 'posts' ? posts.length : savedComments.length} saved
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {(['posts', 'comments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: activeTab === tab ? 'var(--gray-900)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab === 'posts' ? 'Posts' : 'Comments'}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border"
              style={cardStyle}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl p-6 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>
          Failed to load bookmarks: {error}
        </div>
      )}

      {/* Posts tab */}
      {activeTab === 'posts' && !postsLoading && !postsError && (
        <>
          {posts.length === 0 ? (
            <div
              className="rounded-xl border p-12 text-center"
              style={cardStyle}
            >
              <p style={{ color: 'var(--text-muted)' }} className="mb-3">No saved posts yet.</p>
              <Link
                href="/"
                className="inline-block rounded-lg px-5 py-2 text-sm font-medium text-white transition"
                style={{ background: 'var(--gray-900)' }}
              >
                Browse posts
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <div key={post.id} className="relative group">
                  <PostCard post={post} />
                  <button
                    onClick={() => handleRemovePost(post.id)}
                    className="absolute top-3 right-3 z-10 rounded-lg border px-3 py-1 text-xs transition"
                    title="Remove bookmark"
                    style={{ ...cardStyle, color: 'var(--text-muted)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Comments tab */}
      {activeTab === 'comments' && !commentsLoading && !commentsError && (
        <>
          {savedComments.length === 0 ? (
            <div
              className="rounded-xl border p-12 text-center"
              style={cardStyle}
            >
              <p style={{ color: 'var(--text-muted)' }} className="mb-3">No saved comments yet.</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Save comments using the bookmark button on any comment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {savedComments.map((comment) => (
                <div
                  key={comment.id}
                  className="relative rounded-xl border p-4"
                  style={cardStyle}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Comment {comment.id.slice(0, 8)}...
                    </span>
                    <button
                      onClick={() => handleRemoveComment(comment.id)}
                      className="rounded-lg border px-3 py-1 text-xs transition"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      Remove
                    </button>
                  </div>
                  {comment.body ? (
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <MarkdownContent content={comment.body} />
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved comment (click to view in context)</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
