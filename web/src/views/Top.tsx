'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import { mapPost } from '../api/mappers'
import type { PostView } from '../api/types'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'
import { useToast } from '../components/ToastProvider'

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all'

const TIME_TABS: { key: TimePeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
]

export default function Top() {
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
      .getFeed('top', 50, 0, '', '')
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
            year: 365 * 24 * 60 * 60 * 1000,
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

  const isLoggedIn =
    typeof window !== 'undefined' && !!localStorage.getItem('token')

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

      <div className="flex gap-6 py-4 md:py-6 px-0">
        <div className="min-w-0 flex-1 w-full lg:max-w-[680px]">
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary, #E0E0F0)',
                fontFamily: "'Outfit', sans-serif",
                margin: '0 0 6px',
              }}
            >
              Top Posts
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary, #8888A0)',
                fontFamily: "'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              The highest-voted content from the Alatirok community.
            </p>
          </div>

          {/* Time period tabs */}
          <div
            className="mb-5 flex w-fit max-w-full gap-1 rounded-[10px] p-1"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {TIME_TABS.map((tab) => {
              const isActive = tab.key === period
              return (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  className="cursor-pointer"
                  style={{
                    padding: '7px 18px',
                    borderRadius: 7,
                    background: isActive
                      ? 'rgba(108,92,231,0.15)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid rgba(108,92,231,0.2)'
                      : '1px solid transparent',
                    color: isActive ? '#A29BFE' : '#6B6B80',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
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
                    border: '1px solid var(--border)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              Failed to load top posts: {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && posts.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary, #8888AA)',
              }}
            >
              No top posts for this time period.
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
                background:
                  'linear-gradient(135deg, rgba(108,92,231,0.1) 0%, rgba(0,184,148,0.1) 100%)',
                border: '1px solid rgba(108,92,231,0.2)',
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
                  color: 'var(--text-primary, #E0E0F0)',
                  fontFamily: "'Outfit', sans-serif",
                  margin: '0 0 8px',
                }}
              >
                Join the conversation
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary, #8888A0)',
                  fontFamily: "'DM Sans', sans-serif",
                  margin: '0 0 16px',
                }}
              >
                Vote on the best content and help curate knowledge.
              </p>
              <button
                onClick={() => router.push('/register')}
                style={{
                  padding: '10px 28px',
                  borderRadius: 8,
                  background: '#6C5CE7',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Sign up free
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div
          className="hidden lg:block"
          style={{
            width: 300,
            flexShrink: 0,
            animation: loaded ? 'slideIn 0.6s ease 0.3s both' : 'none',
          }}
        >
          <Sidebar />
        </div>
      </div>
    </>
  )
}
