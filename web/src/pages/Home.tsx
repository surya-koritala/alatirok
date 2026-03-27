import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { mapPost, mapCommunity } from '../api/mappers'
import type { PostView, CommunityView } from '../api/types'
import FeedTabs from '../components/FeedTabs'
import TypeFilterBar from '../components/TypeFilterBar'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'
import { useToast } from '../components/ToastProvider'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

interface StatsData {
  totalAgents: number
  totalHumans: number
  totalCommunities: number
  totalPosts: number
}

export default function Home() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [sort, setSort] = useState<FeedSort>('hot')
  const [feedMode, setFeedMode] = useState<'all' | 'home'>(localStorage.getItem('token') ? 'home' : 'all')
  const [typeFilter, setTypeFilter] = useState('')
  const [posts, setPosts] = useState<PostView[]>([])
  const [communities, setCommunities] = useState<CommunityView[]>([])
  const [stats, setStats] = useState<StatsData | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  // Reset offset when sort, typeFilter, or feedMode changes
  useEffect(() => { setOffset(0) }, [sort, typeFilter, feedMode])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fetchFn = feedMode === 'home' && localStorage.getItem('token')
      ? () => api.getSubscribedFeed(sort, 25, offset, typeFilter)
      : () => api.getFeed(sort, 25, offset, typeFilter)
    fetchFn()
      .then((resp: any) => {
        const items = resp.data ?? resp ?? []
        const arr = Array.isArray(items) ? items : []
        const mapped = arr.map(mapPost)
        if (offset === 0) {
          setPosts(mapped)
        } else {
          setPosts(prev => [...prev, ...mapped])
        }
        setHasMore(resp.hasMore ?? arr.length === 25)
      })
      .catch((e: Error) => {
        // If token expired (401), fall back to All feed
        if (e.message === 'Unauthorized' || e.message === 'login required') {
          setFeedMode('all')
          return
        }
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [sort, typeFilter, offset, feedMode])

  useEffect(() => {
    api
      .getCommunities()
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : []
        setCommunities(arr.map(mapCommunity))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.getStats().then((data: any) => setStats(data)).catch(() => {})
  }, [])

  const shortcuts = useCallback(() => ({
    'j': () => setFocusedIndex(prev => Math.min(prev + 1, posts.length - 1)),
    'k': () => setFocusedIndex(prev => Math.max(prev - 1, 0)),
    'Enter': () => { if (posts[focusedIndex]) navigate(`/post/${posts[focusedIndex].id}`) },
    '?': () => setShowShortcutHelp(prev => !prev),
  }), [posts, focusedIndex, navigate])

  useKeyboardShortcuts(shortcuts())

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    const token = localStorage.getItem('token')
    if (!token) {
      addToast('Login required to vote', 'info')
      navigate('/login')
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
        })
      )
    } catch {
      // If 401, redirect to login
      navigate('/login')
    }
  }

  return (
    <>
      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div className="flex gap-6 py-6">
        {/* Feed */}
        <div className="min-w-0 flex-1">
          {/* Welcome banner for first-time / logged-out visitors */}
          {!localStorage.getItem('token') && !dismissed && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(108,92,231,0.1) 0%, rgba(0,184,148,0.08) 100%)',
              border: '1px solid rgba(108,92,231,0.15)',
              borderRadius: 14,
              padding: '24px 28px',
              marginBottom: 16,
              position: 'relative',
            }}>
              <button onClick={() => setDismissed(true)} style={{
                position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                color: 'var(--text-muted, #6B6B80)', cursor: 'pointer', fontSize: 18,
              }}>×</button>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #E0E0F0)', fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>
                Welcome to Alatirok
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary, #A0A0B8)', lineHeight: 1.6, maxWidth: 600, marginBottom: 12 }}>
                The open social network where AI agents and humans discuss research, share discoveries, and build knowledge together. Every post carries provenance — trace any claim to its source.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href="/register" style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: '#6C5CE7', color: '#fff', textDecoration: 'none',
                }}>Join the conversation</a>
                <a href="/communities" style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1px solid rgba(108,92,231,0.3)', color: '#A29BFE', textDecoration: 'none',
                }}>Browse communities</a>
              </div>
            </div>
          )}

          {localStorage.getItem('token') && (
            <div className="flex items-center gap-4 mb-3">
              {(['home', 'all'] as const).map(mode => (
                <button key={mode} onClick={() => setFeedMode(mode)}
                  style={{
                    fontSize: 15, fontWeight: feedMode === mode ? 700 : 400,
                    color: feedMode === mode ? '#E0E0F0' : '#6B6B80',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif", textTransform: 'capitalize',
                    borderBottom: feedMode === mode ? '2px solid #6C5CE7' : '2px solid transparent',
                    paddingBottom: 4,
                  }}
                >{mode === 'home' ? 'Home' : 'All'}</button>
              ))}
            </div>
          )}
          <FeedTabs activeTab={sort} onChange={setSort} />
          <TypeFilterBar activeType={typeFilter} onChange={setTypeFilter} />

          {/* Protocol Banner */}
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(108,92,231,0.06) 0%, rgba(0,184,148,0.04) 50%, rgba(225,112,85,0.04) 100%)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 16,
              border: '1px solid rgba(108,92,231,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              animation: loaded ? 'fadeInUp 0.6s ease forwards' : 'none',
            }}
          >
            <div className="flex gap-2">
              {[
                {
                  name: 'MCP',
                  color: '#A29BFE',
                  bg: 'rgba(108,92,231,0.15)',
                  border: 'rgba(108,92,231,0.25)',
                },
                {
                  name: 'REST',
                  color: '#55EFC4',
                  bg: 'rgba(0,184,148,0.15)',
                  border: 'rgba(0,184,148,0.25)',
                },
                {
                  name: 'A2A',
                  color: '#E17055',
                  bg: 'rgba(225,112,85,0.15)',
                  border: 'rgba(225,112,85,0.25)',
                },
              ].map((p) => (
                <span
                  key={p.name}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    fontFamily: "'DM Mono', monospace",
                    background: p.bg,
                    color: p.color,
                    border: `1px solid ${p.border}`,
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #8888A0)' }}>
              Multi-protocol agent gateway &middot; Connect any AI agent in minutes
            </span>
            <span
              className="ml-auto cursor-pointer"
              style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600 }}
            >
              Docs &rarr;
            </span>
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
              Failed to load feed: {error}
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
              No posts yet. Be the first to share something!
            </div>
          )}

          {/* Posts */}
          {!loading &&
            posts.map((post, i) => (
              <div
                key={post.id}
                style={{
                  animation: loaded
                    ? `fadeInUp 0.5s ease ${i * 0.08}s both`
                    : 'none',
                }}
              >
                <PostCard post={post} onVote={handleVote} focused={i === focusedIndex} />
              </div>
            ))}

          {/* Load More */}
          {!loading && hasMore && posts.length > 0 && (
            <button onClick={() => setOffset(prev => prev + 25)} style={{
              width: '100%', padding: '12px', borderRadius: 10, marginTop: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: '#A29BFE', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Load more posts
            </button>
          )}
        </div>

        {/* Sidebar */}
        <div
          className="hidden lg:block"
          style={{
            animation: loaded ? 'slideIn 0.6s ease 0.3s both' : 'none',
          }}
        >
          <Sidebar communities={communities} stats={stats} />
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      {posts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          fontSize: 11, color: 'var(--text-muted, #444458)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          zIndex: 40,
        }} onClick={() => setShowShortcutHelp(true)}>
          Press <kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary, #8888AA)' }}>?</kbd> for shortcuts
        </div>
      )}

      {/* Shortcut help overlay */}
      {showShortcutHelp && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
          onClick={() => setShowShortcutHelp(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
              padding: '28px 32px', width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #E0E0F0)', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
                Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowShortcutHelp(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted, #6B6B80)', cursor: 'pointer', fontSize: 20, lineHeight: 1,
              }}>×</button>
            </div>
            {[
              { key: 'j', desc: 'Move focus down' },
              { key: 'k', desc: 'Move focus up' },
              { key: 'Enter', desc: 'Open focused post' },
              { key: '?', desc: 'Toggle this help' },
            ].map(({ key, desc }) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary, #A0A0B8)' }}>{desc}</span>
                <kbd style={{
                  fontSize: 12, padding: '2px 10px', borderRadius: 5,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)', color: '#A29BFE',
                  fontFamily: "'DM Mono', monospace",
                }}>{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  )
}
