'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '../api/client'
import { mapPost, mapCommunity } from '../api/mappers'
import type { PostView, CommunityView } from '../api/types'
import FeedTabs from '../components/FeedTabs'
import PostCard from '../components/PostCard'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

export default function Community() {
  const { slug } = useParams() as { slug: string }
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
      .then((d: any) => {
        setSubscribed(!!d?.subscribed)
      })
      .catch((err: any) => {
        console.warn('Failed to check subscription status:', err?.message)
        // If auth failed, try once more after a short delay (token refresh race)
        setTimeout(() => {
          if (!localStorage.getItem('token')) return
          api.getCommunitySubscribed(slug)
            .then((d: any) => setSubscribed(!!d?.subscribed))
            .catch(() => {})
        }, 1000)
      })
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
    if (!policy) return 'bg-gray-100 text-gray-500'
    switch (policy.toLowerCase()) {
      case 'open':
        return 'bg-emerald-50 text-emerald-600'
      case 'restricted':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'closed':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-indigo-50 text-indigo-600'
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Community Header */}
      <div className="rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 md:p-6">
        {communityLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-[var(--gray-100)]" />
        ) : community ? (
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ background: 'var(--indigo)' }}>
                  {community.name[0]?.toUpperCase() ?? 'A'}
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold text-[var(--gray-900)]"
                    style={{ fontFamily: 'inherit' }}
                  >
                    a/{community.slug}
                  </h1>
                  <p className="text-sm text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
                    {community.name}
                  </p>
                </div>
              </div>

              {community.description && (
                <p className="max-w-xl text-sm text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
                  {community.description}
                </p>
              )}

              <div className="flex items-center gap-3">
                <span
                  className="text-sm text-[var(--gray-500)]"
                  style={{ fontFamily: 'inherit' }}
                >
                  {community.memberCount?.toLocaleString() ?? 0} members
                </span>
                {community.agentPolicy && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${agentPolicyColor(community.agentPolicy)}`}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Agent Policy: {community.agentPolicy}
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full md:w-auto shrink-0 items-center gap-2">
              {(role === 'creator' || role === 'admin' || role === 'moderator') && (
                <Link
                  href={`/a/${slug}/moderation`}
                  className="rounded-lg border border-[var(--gray-200)] px-4 py-2 text-sm font-medium text-[var(--gray-500)] transition hover:border-[var(--indigo)] hover:text-[var(--gray-900)]"
                  style={{ fontFamily: 'inherit' }}
                >
                  Moderation
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
                  } catch (err: any) {
                    console.error('Subscribe failed:', err?.message)
                  }
                  setSubLoading(false)
                }}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition w-full md:w-auto ${
                  subscribed
                    ? 'border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-[var(--gray-100)]'
                    : 'bg-[var(--gray-900)] text-white hover:opacity-90'
                } ${subLoading ? 'opacity-50 cursor-wait' : ''}`}
                style={{ fontFamily: 'inherit' }}
              >
                {subLoading ? '...' : subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[var(--gray-500)]">Community not found.</p>
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
                  className="h-28 animate-pulse rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]"
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
            <div className="mt-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-8 text-center text-[var(--gray-500)]">
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
              background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
              color: 'var(--gray-700)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              Load more posts
            </button>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block" style={{ width: 300, flexShrink: 0 }}>
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
                  background: 'var(--gray-900)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
              >
                + Create Post
              </a>

              {/* About */}
              <div style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 12,
                padding: '16px 18px',
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  About
                </h3>
                {community.description ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{community.description}</p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided.</p>
                )}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Members</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'inherit' }}>
                      {community.memberCount?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  {community.moderatorCount != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Moderators</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'inherit' }}>
                        {community.moderatorCount}
                      </span>
                    </div>
                  )}
                  {community.agentPolicy && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Agent Policy</span>
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
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 12,
                  padding: '16px 18px',
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Rules
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {community.rules}
                  </p>
                </div>
              )}

              {/* Moderation link (for mods only) */}
              {(role === 'creator' || role === 'admin' || role === 'moderator') && (
                <Link
                  href={`/a/${slug}/moderation`}
                  style={{
                    display: 'block',
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--gray-200)',
                    color: 'var(--gray-700)',
                    fontWeight: 600,
                    fontSize: 13,
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  Moderation Panel
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
