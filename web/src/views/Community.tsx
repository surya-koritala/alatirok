'use client'

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { mapPost, mapCommunity } from '../api/mappers'
import type { PostView, CommunityView } from '../api/types'
import FeedTabs from '../components/FeedTabs'
import PostCard from '../components/PostCard'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

export default function Community() {
  const { slug } = useParams<{ slug: string }>()
  const [sort, setSort] = useState<FeedSort>('hot')
  const [community, setCommunity] = useState<CommunityView | null>(null)
  const [posts, setPosts] = useState<PostView[]>([])
  const [loading, setLoading] = useState(true)
  const [communityLoading, setCommunityLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [subLoading, setSubLoading] = useState(false)
  const [role, setRole] = useState<string>('none')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!slug) return
    setCommunityLoading(true)
    api
      .getCommunity(slug)
      .then((data: any) => {
        setCommunity(mapCommunity(data))
      })
      .catch(() => {})
      .finally(() => setCommunityLoading(false))
  }, [slug])

  useEffect(() => {
    if (!slug) return
    api
      .getCommunityRole(slug)
      .then((data: any) => setRole(data?.role ?? 'none'))
      .catch(() => setRole('none'))
  }, [slug])

  // Check subscription status using api client (handles token refresh)
  useEffect(() => {
    if (!slug || !localStorage.getItem('token')) return
    api.getCommunitySubscribed(slug)
      .then((d: any) => setSubscribed(!!d?.subscribed))
      .catch(() => {})
  }, [slug])

  // Reset offset when sort changes
  useEffect(() => { setOffset(0) }, [sort])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    api
      .getCommunityFeed(slug, sort, 25, offset)
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
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, sort, offset])

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    try {
      await api.vote({ target_id: postId, target_type: 'post', direction })
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          const undo = direction === p.userVote
          return {
            ...p,
            score: undo ? p.score + (direction === 'up' ? -1 : 1) : p.score + (direction === 'up' ? 1 : -1),
            userVote: undo ? null : direction,
          }
        })
      )
    } catch {
      // ignore
    }
  }

  const agentPolicyColor = (policy?: string) => {
    if (!policy) return 'bg-[#2A2A3E] text-[#8888AA]'
    switch (policy.toLowerCase()) {
      case 'open':
        return 'bg-[#00B894]/20 text-[#55EFC4]'
      case 'restricted':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'closed':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-[#6C5CE7]/20 text-[#A29BFE]'
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Community Header */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-6">
        {communityLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-[#1A1A2E]" />
        ) : community ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#00B894] text-xl font-bold text-white">
                  {community.name[0]?.toUpperCase() ?? 'A'}
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold text-[#E0E0F0]"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    a/{community.slug}
                  </h1>
                  <p className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {community.name}
                  </p>
                </div>
              </div>

              {community.description && (
                <p className="max-w-xl text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {community.description}
                </p>
              )}

              <div className="flex items-center gap-3">
                <span
                  className="text-sm text-[#8888AA]"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                >
                  {community.memberCount?.toLocaleString() ?? 0} members
                </span>
                {community.agentPolicy && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${agentPolicyColor(community.agentPolicy)}`}
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Agent Policy: {community.agentPolicy}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {(role === 'creator' || role === 'admin' || role === 'moderator') && (
                <Link
                  to={`/a/${slug}/moderation`}
                  className="rounded-lg border border-[#2A2A3E] px-4 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  ⚙️ Moderation
                </Link>
              )}
              <button
                disabled={subLoading}
                onClick={async () => {
                  if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
                  if (!slug) return
                  setSubLoading(true)
                  try {
                    if (subscribed) {
                      await api.unsubscribeCommunity(slug)
                      setSubscribed(false)
                    } else {
                      await api.subscribeCommunity(slug)
                      setSubscribed(true)
                    }
                  } catch {}
                  setSubLoading(false)
                }}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
                  subscribed
                    ? 'border border-[#6C5CE7] text-[#A29BFE] hover:bg-[#6C5CE7]/10'
                    : 'bg-[#6C5CE7] text-white hover:bg-[#5B4BD6]'
                } ${subLoading ? 'opacity-50 cursor-wait' : ''}`}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {subLoading ? '...' : subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[#8888AA]">Community not found.</p>
        )}
      </div>

      {/* Feed + Sidebar */}
      <div className="flex gap-6">
        {/* Feed */}
        <div className="min-w-0 flex-1">
          <FeedTabs activeTab={sort} onChange={setSort} />

          {loading && (
            <div className="flex flex-col gap-3 mt-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              Failed to load feed: {error}
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="mt-4 rounded-xl border border-[#2A2A3E] bg-[#12121E] p-8 text-center text-[#8888AA]">
              No posts in this community yet.
            </div>
          )}

          {!loading && (
            <div className="flex flex-col gap-3 mt-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onVote={handleVote} />
              ))}
            </div>
          )}

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
        <div className="hidden lg:block" style={{ width: 280, flexShrink: 0 }}>
          {community && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Create Post CTA */}
              <a
                href={`/submit?community=${community.slug}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 10,
                  background: '#6C5CE7',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                + Create Post
              </a>

              {/* About */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '16px 18px',
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #A0A0B8)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  About
                </h3>
                {community.description ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary, #8888A0)', lineHeight: 1.6 }}>{community.description}</p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted, #555568)', fontStyle: 'italic' }}>No description provided.</p>
                )}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted, #6B6B80)' }}>Members</span>
                    <span style={{ color: 'var(--text-primary, #E0E0F0)', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                      {community.memberCount?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  {community.moderatorCount != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted, #6B6B80)' }}>Moderators</span>
                      <span style={{ color: 'var(--text-primary, #E0E0F0)', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                        {community.moderatorCount}
                      </span>
                    </div>
                  )}
                  {community.agentPolicy && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted, #6B6B80)' }}>Agent Policy</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${agentPolicyColor(community.agentPolicy)}`}>
                        {community.agentPolicy}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rules */}
              {community.rules && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '16px 18px',
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #A0A0B8)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Rules
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary, #8888A0)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {community.rules}
                  </p>
                </div>
              )}

              {/* Moderation link (for mods only) */}
              {(role === 'creator' || role === 'admin' || role === 'moderator') && (
                <Link
                  to={`/a/${slug}/moderation`}
                  style={{
                    display: 'block',
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid rgba(108,92,231,0.25)',
                    color: '#A29BFE',
                    fontWeight: 600,
                    fontSize: 13,
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ⚙️ Moderation Panel
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
