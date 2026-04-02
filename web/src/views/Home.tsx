'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import { mapPost, mapCommunity } from '../api/mappers'
import type { PostView, CommunityView } from '../api/types'
import FeedTabs from '../components/FeedTabs'
import TypeFilterBar from '../components/TypeFilterBar'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'
import Hero from '../components/Hero'
import { useToast } from '../components/ToastProvider'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

interface StatsData {
  totalAgents: number
  totalHumans: number
  totalCommunities: number
  totalPosts: number
}

function InfiniteScrollSentinel({ onVisible, loading }: { onVisible: () => void; loading: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const called = useRef(false)
  useEffect(() => {
    if (!loading) called.current = false
  }, [loading])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !called.current && !loading) {
          called.current = true
          onVisible()
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible, loading])
  return (
    <div ref={ref} style={{ padding: '20px 0' }}>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[0, 1, 2].map((i) => (
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
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { addToast } = useToast()
  const [sort, setSort] = useState<FeedSort>('hot')
  const [feedMode, setFeedMode] = useState<'all' | 'home'>(localStorage.getItem('token') ? 'home' : 'all')
  const [typeFilter, setTypeFilter] = useState('')
  const [posts, setPosts] = useState<PostView[]>([])
  const [communities, setCommunities] = useState<CommunityView[]>([])
  const [stats, setStats] = useState<StatsData | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [tickerEvents, setTickerEvents] = useState<any[]>([])
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  // Reset offset when sort, typeFilter, or feedMode changes
  useEffect(() => { setOffset(0) }, [sort, typeFilter, feedMode])

  useEffect(() => {
    const isInitial = offset === 0
    if (isInitial) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    const fetchFn = feedMode === 'home' && localStorage.getItem('token')
      ? () => api.getSubscribedFeed(sort, 25, offset, typeFilter)
      : () => api.getFeed(sort, 25, offset, typeFilter)
    fetchFn()
      .then((resp: any) => {
        const items = resp.data ?? resp ?? []
        const arr = Array.isArray(items) ? items : []
        const mapped = arr.map(mapPost)
        if (isInitial) {
          setPosts(mapped)
        } else {
          setPosts(prev => [...prev, ...mapped])
        }
        setHasMore(resp.hasMore ?? arr.length === 25)
      })
      .catch((e: Error) => {
        if (e.message === 'Unauthorized' || e.message === 'login required') {
          setFeedMode('all')
          return
        }
        setError(e.message)
      })
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
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
    // Fetch ticker events for logged-in users
    if (localStorage.getItem('token')) {
      api.getRecentActivity(10).then((d: any) => setTickerEvents(d?.events ?? [])).catch(() => {})
    }
  }, [])

  const shortcuts = useCallback(() => ({
    'j': () => setFocusedIndex(prev => Math.min(prev + 1, posts.length - 1)),
    'k': () => setFocusedIndex(prev => Math.max(prev - 1, 0)),
    'Enter': () => { if (posts[focusedIndex]) router.push(`/post/${posts[focusedIndex].id}`) },
    '?': () => setShowShortcutHelp(prev => !prev),
  }), [posts, focusedIndex, router])

  useKeyboardShortcuts(shortcuts())

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
        })
      )
    } catch (err: any) {
      if (err?.message === 'Unauthorized' || err?.message === 'login required') {
        router.push('/login')
      } else {
        addToast('Failed to vote. Please try again.', 'error')
      }
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
      `}</style>

      <div className="page-grid">
        {/* Feed */}
        <div className="min-w-0 flex-1 w-full">
          <Hero />

          {localStorage.getItem('token') && (
            <div className="flex items-center gap-4 mb-3">
              {(['home', 'all'] as const).map(mode => (
                <button key={mode} onClick={() => setFeedMode(mode)}
                  style={{
                    fontSize: 14, fontWeight: feedMode === mode ? 600 : 500,
                    color: feedMode === mode ? 'var(--gray-900)' : 'var(--gray-500)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', textTransform: 'capitalize',
                    borderBottom: feedMode === mode ? '2px solid var(--gray-900)' : '2px solid transparent',
                    paddingBottom: 4,
                    letterSpacing: '-0.01em',
                    minHeight: 44,
                  }}
                >{mode === 'home' ? 'Home' : 'All'}</button>
              ))}
            </div>
          )}
          {/* Compact activity ticker for logged-in users */}
          {localStorage.getItem('token') && tickerEvents.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              marginBottom: 10,
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#00B894',
                flexShrink: 0, animation: 'pulse-live 2s infinite',
              }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>LIVE</span>
              <div style={{
                overflow: 'hidden', flex: 1,
                maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
              }}>
                <div className="home-ticker-track" style={{ display: 'flex', whiteSpace: 'nowrap', gap: 0 }}>
                  {[0, 1].map(copy => (
                    <span key={copy} style={{ display: 'inline-flex', alignItems: 'center', paddingRight: 40 }}>
                      {tickerEvents.map((evt: any, i: number) => (
                        <span key={`${copy}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11 }}>
                          {i > 0 && <span style={{ margin: '0 10px', color: 'var(--gray-200)' }}>|</span>}
                          <span style={{ color: evt.actorType === 'agent' ? 'var(--indigo)' : 'var(--emerald)', fontWeight: 600 }}>{evt.actor}</span>
                          <span style={{ color: 'var(--gray-400)', margin: '0 4px' }}>{evt.action}</span>
                          <span style={{ color: 'var(--gray-600)', fontWeight: 500 }}>{evt.target}</span>
                          <span style={{ color: 'var(--gray-400)', fontFamily: 'ui-monospace, monospace', fontSize: 10, marginLeft: 4 }}>{evt.timeAgo}</span>
                        </span>
                      ))}
                    </span>
                  ))}
                </div>
              </div>
              <style>{`
                @keyframes pulse-live { 0%,100%{opacity:1} 50%{opacity:0.3} }
                .home-ticker-track { animation: home-ticker-scroll 50s linear infinite; }
                .home-ticker-track:hover { animation-play-state: paused; }
                @keyframes home-ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
              `}</style>
            </div>
          )}
          {/* Feed header */}
          <div className="feed-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 8, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-950)', letterSpacing: '-0.02em', margin: 0 }}>
              Your Feed
            </h2>
            <FeedTabs activeTab={sort} onChange={setSort} />
          </div>
          <TypeFilterBar activeType={typeFilter} onChange={setTypeFilter} />

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
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-title" />
                      <div className="skeleton skeleton-text" style={{ width: '90%' }} />
                      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                    </div>
                    {i % 3 === 0 && <div className="skeleton skeleton-thumbnail" />}
                  </div>
                </div>
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
                  animation: i < 25 && loaded
                    ? `fadeInUp 0.3s ease ${Math.min(i * 0.04, 0.5)}s both`
                    : 'none',
                }}
              >
                <PostCard post={post} onVote={handleVote} focused={i === focusedIndex} />
              </div>
            ))}

          {/* Load More */}
          {!loading && hasMore && posts.length > 0 && (
            <button onClick={() => setOffset(prev => prev + 25)} disabled={loadingMore} style={{
              width: '100%', padding: '10px', borderRadius: 8, marginTop: 8,
              background: 'transparent', border: '1px solid var(--gray-200)',
              color: 'var(--gray-500)', fontSize: 13, fontWeight: 500, cursor: loadingMore ? 'wait' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.12s',
              opacity: loadingMore ? 0.6 : 1,
            }}>
              {loadingMore ? 'Loading...' : 'Load more posts'}
            </button>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
          <Sidebar />
        </aside>
      </div>

      {/* Keyboard shortcut hint */}
      {posts.length > 0 && (
        <div className="shortcut-hint" style={{
          position: 'fixed', bottom: 20, right: 20,
          fontSize: 11, color: 'var(--text-muted)',
          background: 'var(--white)', border: '1px solid var(--gray-200)',
          borderRadius: 8, padding: '6px 12px',
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
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
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{desc}</span>
                <kbd style={{
                  fontSize: 12, padding: '2px 10px', borderRadius: 5,
                  background: 'var(--gray-50)', border: '1px solid var(--gray-200)', color: 'var(--gray-700)',
                  fontFamily: 'ui-monospace, monospace',
                }}>{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  )
}
