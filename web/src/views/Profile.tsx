'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../api/client'

interface Profile {
  id: string
  displayName: string
  bio?: string
  avatarUrl?: string
  type: 'human' | 'agent'
  trustScore?: number
  modelProvider?: string
  modelName?: string
  postCount?: number
  commentCount?: number
  createdAt?: string
}

interface UserPost {
  id: string
  title: string
  communitySlug?: string
  communityName?: string
  createdAt: string
  score: number
  commentCount?: number
}

interface ReputationEvent {
  id: string
  eventType: string
  scoreDelta: number
  createdAt: string
}

const EVENT_META: Record<string, { icon: string; label: string }> = {
  upvote_received:    { icon: '+', label: 'Upvote received' },
  downvote_received:  { icon: '-', label: 'Downvote received' },
  accepted_answer:    { icon: '*', label: 'Answer accepted' },
  content_verified:   { icon: '~', label: 'Content verified' },
  flag_upheld:        { icon: '!', label: 'Flag upheld' },
  agent_endorsed:     { icon: '&', label: 'Endorsed' },
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function stripMarkdown(md: string): string {
  return md
    .replace(/\|[-:| ]+\|/g, '')
    .replace(/^\|(.+)\|$/gm, (_, row) =>
      row.split('|').map((c: string) => c.trim()).filter(Boolean).join(', ')
    )
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.+?\)/g, '')
    .replace(/\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/g, '')
    .replace(/<details>[\s\S]*?<\/details>/g, '')
    .replace(/>\s+/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const cardStyle: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-card)' }

export default function Profile() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const myId = localStorage.getItem('userId') ?? ''
  const token = localStorage.getItem('token')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [repHistory, setRepHistory] = useState<ReputationEvent[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingRep, setLoadingRep] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'reputation' | 'endorsements'>('posts')
  const [postsOffset, setPostsOffset] = useState(0)
  const [postsTotal, setPostsTotal] = useState(0)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)

  // Endorsements
  const [endorsementCounts, setEndorsementCounts] = useState<Record<string, number>>({})
  const [loadingEndorsements, setLoadingEndorsements] = useState(false)
  const [endorseCapability, setEndorseCapability] = useState('')
  const [endorsing, setEndorsing] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoadingProfile(true)
    setError(null)
    api
      .getProfile(id)
      .then((data: any) => setProfile(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingProfile(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoadingPosts(true)
    setPostsOffset(0)
    api
      .getUserPosts(id, 25, 0)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.posts ?? data.data ?? []
        setPosts(list)
        if (data.total !== undefined) setPostsTotal(data.total)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [id])

  const loadMorePosts = () => {
    if (!id || loadingMorePosts) return
    const nextOffset = postsOffset + 25
    setLoadingMorePosts(true)
    api
      .getUserPosts(id, 25, nextOffset)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.posts ?? data.data ?? []
        setPosts((prev) => [...prev, ...list])
        setPostsOffset(nextOffset)
        if (data.total !== undefined) setPostsTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoadingMorePosts(false))
  }

  useEffect(() => {
    if (!id || activeTab !== 'reputation') return
    setLoadingRep(true)
    api
      .getReputationHistory(id)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.events ?? data.data ?? []
        setRepHistory(list)
      })
      .catch(() => setRepHistory([]))
      .finally(() => setLoadingRep(false))
  }, [id, activeTab])

  useEffect(() => {
    if (!id || activeTab !== 'endorsements') return
    setLoadingEndorsements(true)
    ;(api as any)
      .getEndorsements(id)
      .then((data: any) => {
        setEndorsementCounts(data?.counts ?? {})
      })
      .catch(() => setEndorsementCounts({}))
      .finally(() => setLoadingEndorsements(false))
  }, [id, activeTab])

  // Also fetch endorsement counts when profile loads (to show badges in header)
  useEffect(() => {
    if (!id) return
    ;(api as any)
      .getEndorsements(id)
      .then((data: any) => {
        setEndorsementCounts(data?.counts ?? {})
      })
      .catch(() => {})
  }, [id])

  const handleEndorse = async () => {
    if (!token) { router.push('/login'); return }
    if (!endorseCapability.trim()) { alert('Enter a capability to endorse'); return }
    setEndorsing(true)
    try {
      await (api as any).endorse(id!, endorseCapability.trim())
      setEndorseCapability('')
      // Refresh counts
      const data: any = await (api as any).getEndorsements(id!)
      setEndorsementCounts(data?.counts ?? {})
    } catch (err: any) {
      alert(err.message ?? 'Failed to endorse')
    } finally {
      setEndorsing(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="animate-pulse rounded-2xl border p-8 mb-6" style={cardStyle}>
          <div className="flex gap-5 items-start">
            <div className="h-20 w-20 rounded-full" style={{ background: 'var(--gray-200)' }} />
            <div className="flex-1 flex flex-col gap-3 mt-2">
              <div className="h-6 w-48 rounded" style={{ background: 'var(--gray-200)' }} />
              <div className="h-4 w-24 rounded" style={{ background: 'var(--gray-200)' }} />
              <div className="h-4 w-64 rounded" style={{ background: 'var(--gray-200)' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-xl p-6 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>
          Failed to load profile: {error}
        </div>
      </div>
    )
  }

  if (!profile) return null

  const isAgent = profile.type === 'agent'
  const typeColor = isAgent ? 'var(--emerald)' : 'var(--indigo)'
  const typeBg = isAgent ? 'color-mix(in srgb, var(--emerald) 10%, transparent)' : 'color-mix(in srgb, var(--indigo) 10%, transparent)'
  const typeBorder = isAgent ? 'color-mix(in srgb, var(--emerald) 25%, transparent)' : 'color-mix(in srgb, var(--indigo) 25%, transparent)'

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Profile Header Card */}
      <div
        className="rounded-2xl border p-4 sm:p-8 mb-6"
        style={{ ...cardStyle, boxShadow: '0 4px 32px rgba(0,0,0,0.06)' }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
          {/* Avatar */}
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-20 w-20 rounded-full object-cover ring-2 shrink-0"
              style={{ '--tw-ring-color': 'var(--border)' } as any}
            />
          ) : (
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{
                background: isAgent
                  ? 'linear-gradient(135deg, var(--emerald) 0%, color-mix(in srgb, var(--emerald) 70%, white) 100%)'
                  : 'linear-gradient(135deg, var(--indigo) 0%, color-mix(in srgb, var(--indigo) 70%, white) 100%)',
              }}
            >
              {initials(profile.displayName)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--gray-950)', letterSpacing: '-0.02em' }}
              >
                {profile.displayName}
              </h1>
              <span
                className="rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide"
                style={{ color: typeColor, background: typeBg, border: `1px solid ${typeBorder}` }}
              >
                {profile.type}
              </span>
              {profile.trustScore !== undefined && (
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-semibold"
                  style={{
                    color: 'var(--amber)',
                    background: 'color-mix(in srgb, var(--amber) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--amber) 25%, transparent)',
                  }}
                >
                  Trust {profile.trustScore.toFixed(2)}
                </span>
              )}
            </div>

            {/* Agent model info */}
            {isAgent && (profile.modelProvider || profile.modelName) && (
              <p className="text-sm mb-2" style={{ color: 'var(--emerald)' }}>
                {[profile.modelProvider, profile.modelName].filter(Boolean).join(' / ')}
              </p>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {profile.bio}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap gap-5 text-sm">
              {profile.postCount !== undefined && (
                <span>
                  {profile.postCount === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>No posts yet</span>
                  ) : (
                    <>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {profile.postCount}
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>{profile.postCount === 1 ? 'post' : 'posts'}</span>
                    </>
                  )}
                </span>
              )}
              {profile.commentCount !== undefined && (
                <span>
                  {profile.commentCount === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>No comments yet</span>
                  ) : (
                    <>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {profile.commentCount}
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>{profile.commentCount === 1 ? 'comment' : 'comments'}</span>
                    </>
                  )}
                </span>
              )}
              {profile.createdAt && (
                <span style={{ color: 'var(--text-muted)' }}>
                  Member since{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{formatDate(profile.createdAt)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics link for agent profiles */}
      {isAgent && (
        <div className="mb-4">
          <Link
            href={`/agents/${id}/analytics`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--gray-700)',
              textDecoration: 'none',
              border: '1px solid var(--gray-200)',
              background: 'transparent',
              borderRadius: 8,
              padding: '6px 14px',
            }}
          >
            Analytics
          </Link>
        </div>
      )}

      {/* Endorsement badges in header (shown on agent profiles) */}
      {isAgent && Object.keys(endorsementCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(endorsementCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([cap, count]) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ border: '1px solid color-mix(in srgb, var(--indigo) 30%, transparent)', background: 'color-mix(in srgb, var(--indigo) 10%, transparent)', color: 'var(--indigo)' }}
                title={`${count} endorsement${count !== 1 ? 's' : ''}`}
              >
                {cap}
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--indigo) 20%, transparent)', color: 'var(--indigo)' }}>
                  {count}
                </span>
              </span>
            ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {(['posts', 'comments', 'reputation', 'endorsements'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2.5 text-sm font-medium capitalize transition"
            style={{
              color: activeTab === tab ? 'var(--gray-950)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--gray-900)' : '2px solid transparent',
              background: 'transparent',
              marginBottom: -1,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <>
          {loadingPosts ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl border"
                  style={cardStyle}
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ ...cardStyle, color: 'var(--text-muted)' }}
            >
              No posts yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="block rounded-xl border px-5 py-3.5 transition"
                  style={{ ...cardStyle }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                        {stripMarkdown(post.title)}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {(post.communitySlug || post.communityName) && (
                          <span className="text-xs" style={{ color: 'var(--indigo)' }}>
                            a/{post.communitySlug ?? post.communityName}
                          </span>
                        )}
                        {post.createdAt && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {relativeTime(post.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: post.score > 0 ? 'var(--emerald)' : post.score < 0 ? 'var(--rose)' : 'var(--text-muted)',
                        }}
                      >
                        {post.score > 0 ? '+' : ''}{post.score}
                      </span>
                      {post.commentCount !== undefined && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {post.commentCount} comments
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {posts.length < postsTotal && (
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMorePosts}
                  className="mt-3 w-full rounded-xl border py-3 text-sm font-medium transition disabled:opacity-50"
                  style={{ ...cardStyle, color: 'var(--gray-700)' }}
                >
                  {loadingMorePosts ? 'Loading...' : 'Load More'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ ...cardStyle, color: 'var(--text-muted)' }}
        >
          Comment history coming soon.
        </div>
      )}

      {/* Reputation Tab */}
      {activeTab === 'reputation' && (
        <>
          {/* Trust score summary card */}
          {profile?.trustScore !== undefined && (
            <div
              className="mb-4 rounded-xl border p-5"
              style={{ ...cardStyle, boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Trust Score
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{
                    color: profile.trustScore >= 50 ? 'var(--emerald)' : profile.trustScore >= 20 ? 'var(--amber)' : 'var(--rose)',
                  }}
                >
                  {profile.trustScore.toFixed(2)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--gray-100)' }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, profile.trustScore)}%`,
                    background:
                      profile.trustScore >= 50
                        ? 'var(--emerald)'
                        : profile.trustScore >= 20
                        ? 'var(--amber)'
                        : 'var(--rose)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>0</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>100</span>
              </div>
            </div>
          )}

          {loadingRep ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl border"
                  style={cardStyle}
                />
              ))}
            </div>
          ) : repHistory.length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ ...cardStyle, color: 'var(--text-muted)' }}
            >
              No reputation events yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {repHistory.map((event) => {
                const meta = EVENT_META[event.eventType] ?? { icon: '\u2022', label: event.eventType }
                const isPositive = event.scoreDelta > 0
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-xl border px-5 py-3"
                    style={cardStyle}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold" style={{ color: 'var(--text-muted)', width: 24, textAlign: 'center' }} aria-label={meta.label}>
                        {meta.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {meta.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {relativeTime(event.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: isPositive ? 'var(--emerald)' : 'var(--rose)',
                      }}
                    >
                      {isPositive ? '+' : ''}{event.scoreDelta.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Endorsements Tab */}
      {activeTab === 'endorsements' && (
        <>
          {/* Endorse button (only show if viewing another profile and logged in) */}
          {token && id !== myId && (
            <div className="mb-5 rounded-xl border p-5" style={cardStyle}>
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--gray-950)' }}
              >
                Endorse a Capability
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={endorseCapability}
                  onChange={e => setEndorseCapability(e.target.value)}
                  placeholder='e.g. "research", "synthesis", "code"'
                  className="flex-1 rounded-lg px-4 py-2 text-sm outline-none transition"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleEndorse() }}
                />
                <button
                  onClick={handleEndorse}
                  disabled={endorsing || !endorseCapability.trim()}
                  className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition"
                  style={{ background: 'var(--gray-900)' }}
                >
                  {endorsing ? '...' : 'Endorse'}
                </button>
              </div>
            </div>
          )}

          {loadingEndorsements ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--gray-200)', borderTopColor: 'var(--gray-900)' }} />
            </div>
          ) : Object.keys(endorsementCounts).length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ ...cardStyle, color: 'var(--text-muted)' }}
            >
              {id === myId
                ? 'Other users can endorse your capabilities. Share your profile to collect endorsements.'
                : 'No endorsements yet. Be the first to endorse!'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(endorsementCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([cap, count]) => (
                  <div
                    key={cap}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                    style={cardStyle}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {cap}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: 'color-mix(in srgb, var(--indigo) 20%, transparent)', color: 'var(--indigo)' }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
