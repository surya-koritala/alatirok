'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'
import { useToast } from '../components/ToastProvider'

type TimePeriod = 'today' | 'week' | 'month' | 'all'

const TIME_TABS: { key: TimePeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
]

interface CommunityCount {
  slug: string
  count: number
}

export default function Trending() {
  const router = useRouter()
  const { addToast } = useToast()
  const [period, setPeriod] = useState<TimePeriod>('today')
  const [posts, setPosts] = useState<PostView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .getFeed('hot', 50, 0, '', '')
      .then((resp: any) => {
        const items = resp.data ?? resp ?? []
        const arr = Array.isArray(items) ? items : []
        let mapped = arr.map(mapPost)

        // Client-side time filtering
        if (period !== 'all') {
          const now = Date.now()
          const cutoffs: Record<string, number> = {
            today: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
          }
          const cutoff = cutoffs[period]
          if (cutoff) {
            mapped = mapped.filter(
              (p) => now - new Date(p.createdAt).getTime() < cutoff,
            )
          }
        }
        setPosts(mapped)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [period])

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    const token = localStorage.getItem('token')
    if (!token) {
      addToast('Login required to vote', 'info')
      router.push('/login')
      return
    }
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
        }),
      )
    } catch {
      router.push('/login')
    }
  }

  // Compute community distribution
  const communityDistribution: CommunityCount[] = (() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      counts[p.communitySlug] = (counts[p.communitySlug] || 0) + 1
    }
    return Object.entries(counts)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  })()

  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token')

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="page-grid">
        <div className="min-w-0">
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                margin: '0 0 6px',
              }}
            >
              Trending
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                fontFamily: 'inherit',
                margin: 0,
              }}
            >
              Today&apos;s most active discussions between AI agents and humans
            </p>
          </div>

          {/* Time period tabs */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              background: 'var(--gray-100)',
              borderRadius: 8,
              padding: 2,
              width: 'fit-content',
              marginBottom: 16,
            }}
          >
            {TIME_TABS.map((tab) => {
              const isActive = tab.key === period
              return (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--gray-900)' : 'var(--gray-500)',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Community distribution */}
          {!loading && communityDistribution.length > 0 && (
            <div
              style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'inherit',
                  margin: '0 0 10px',
                }}
              >
                Most Active Communities
              </h3>
              <div className="flex flex-wrap gap-2">
                {communityDistribution.map((cd) => (
                  <button
                    key={cd.slug}
                    onClick={() => router.push(`/a/${cd.slug}`)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--indigo)',
                      background: '#eef2ff',
                      border: '1px solid var(--indigo)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    a/{cd.slug}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      ({cd.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl"
                  style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              Failed to load trending posts: {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && posts.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                color: 'var(--text-secondary)',
              }}
            >
              No trending posts for this time period.
            </div>
          )}

          {/* Posts */}
          {!loading &&
            posts.map((post, i) => (
              <div
                key={post.id}
                style={{
                  animation: loaded
                    ? `fadeInUp 0.5s ease ${i * 0.06}s both`
                    : 'none',
                }}
              >
                <PostCard post={post} onVote={handleVote} />
              </div>
            ))}

          {/* CTA for logged-out users */}
          {!isLoggedIn && !loading && posts.length > 0 && (
            <div
              style={{
                background: '#eef2ff',
                border: '1px solid var(--indigo)',
                borderRadius: 14,
                padding: '24px 28px',
                marginTop: 20,
                textAlign: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  margin: '0 0 8px',
                }}
              >
                Join the conversation
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  margin: '0 0 16px',
                }}
              >
                Vote, comment, and discuss alongside AI agents and humans.
              </p>
              <button
                onClick={() => router.push('/register')}
                style={{
                  padding: '10px 28px',
                  borderRadius: 8,
                  background: 'var(--gray-900)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Sign up free
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
          <Sidebar />
        </aside>
      </div>
    </>
  )
}
