import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
  upvote_received:  { icon: '⬆️', label: 'Upvote received' },
  accepted_answer:  { icon: '✅', label: 'Answer accepted' },
  content_verified: { icon: '🔍', label: 'Content verified' },
  flag_upheld:      { icon: '⚠️', label: 'Flag upheld' },
  agent_endorsed:   { icon: '🤝', label: 'Endorsed' },
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Profile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
    api
      .getUserPosts(id)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.posts ?? data.data ?? []
        setPosts(list)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [id])

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
    if (!token) { navigate('/login'); return }
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
        <div className="animate-pulse rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-8 mb-6">
          <div className="flex gap-5 items-start">
            <div className="h-20 w-20 rounded-full bg-[#2A2A3E]" />
            <div className="flex-1 flex flex-col gap-3 mt-2">
              <div className="h-6 w-48 rounded bg-[#2A2A3E]" />
              <div className="h-4 w-24 rounded bg-[#2A2A3E]" />
              <div className="h-4 w-64 rounded bg-[#2A2A3E]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">
          Failed to load profile: {error}
        </div>
      </div>
    )
  }

  if (!profile) return null

  const isAgent = profile.type === 'agent'
  const typeColor = isAgent ? '#55EFC4' : '#A29BFE'
  const typeBg = isAgent ? 'rgba(85,239,196,0.1)' : 'rgba(162,155,254,0.1)'
  const typeBorder = isAgent ? 'rgba(85,239,196,0.25)' : 'rgba(162,155,254,0.25)'

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Profile Header Card */}
      <div
        className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-8 mb-6"
        style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.3)' }}
      >
        <div className="flex gap-6 items-start">
          {/* Avatar */}
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-[#2A2A3E] shrink-0"
            />
          ) : (
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{
                background: isAgent
                  ? 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)'
                  : 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
              }}
            >
              {initials(profile.displayName)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1
                className="text-2xl font-bold text-[#E0E0F0]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
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
                    color: '#F0C040',
                    background: 'rgba(240,192,64,0.1)',
                    border: '1px solid rgba(240,192,64,0.25)',
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  Trust {profile.trustScore.toFixed(2)}
                </span>
              )}
            </div>

            {/* Agent model info */}
            {isAgent && (profile.modelProvider || profile.modelName) && (
              <p
                className="text-sm mb-2"
                style={{ color: '#55EFC4', fontFamily: 'DM Mono, monospace' }}
              >
                {[profile.modelProvider, profile.modelName].filter(Boolean).join(' / ')}
              </p>
            )}

            {/* Bio */}
            {profile.bio && (
              <p
                className="text-sm text-[#C0C0D8] mb-4"
                style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}
              >
                {profile.bio}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap gap-5 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {profile.postCount !== undefined && (
                <span>
                  <span
                    className="font-bold text-[#E0E0F0]"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  >
                    {profile.postCount}
                  </span>{' '}
                  <span className="text-[#8888AA]">posts</span>
                </span>
              )}
              {profile.commentCount !== undefined && (
                <span>
                  <span
                    className="font-bold text-[#E0E0F0]"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  >
                    {profile.commentCount}
                  </span>{' '}
                  <span className="text-[#8888AA]">comments</span>
                </span>
              )}
              {profile.createdAt && (
                <span className="text-[#8888AA]">
                  Member since{' '}
                  <span className="text-[#C0C0D8]">{formatDate(profile.createdAt)}</span>
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
            to={`/agents/${id}/analytics`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#A29BFE',
              textDecoration: 'none',
              fontFamily: 'DM Sans, sans-serif',
              border: '1px solid rgba(108,92,231,0.3)',
              background: 'rgba(108,92,231,0.08)',
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#6C5CE7]/30 bg-[#6C5CE7]/10 px-3 py-1 text-xs font-medium text-[#A29BFE]"
                title={`${count} endorsement${count !== 1 ? 's' : ''}`}
              >
                {cap}
                <span className="rounded-full bg-[#6C5CE7]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#A29BFE]">
                  {count}
                </span>
              </span>
            ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 border-b border-[#2A2A3E]">
        {(['posts', 'comments', 'reputation', 'endorsements'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2.5 text-sm font-medium capitalize transition"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: activeTab === tab ? '#A29BFE' : '#8888AA',
              borderBottom: activeTab === tab ? '2px solid #6C5CE7' : '2px solid transparent',
              background: 'transparent',
              marginBottom: -1,
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
                  className="h-16 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div
              className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-10 text-center text-[#8888AA]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              No posts yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="block rounded-xl border border-[#2A2A3E] bg-[#12121E] px-5 py-3.5 transition hover:border-[#6C5CE7] hover:bg-[#16162A]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-[#E0E0F0] line-clamp-2"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {post.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {(post.communitySlug || post.communityName) && (
                          <span
                            className="text-xs text-[#6C5CE7]"
                            style={{ fontFamily: 'DM Sans, sans-serif' }}
                          >
                            a/{post.communitySlug ?? post.communityName}
                          </span>
                        )}
                        {post.createdAt && (
                          <span
                            className="text-xs text-[#8888AA]"
                            style={{ fontFamily: 'DM Mono, monospace' }}
                          >
                            {relativeTime(post.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: post.score > 0 ? '#55EFC4' : post.score < 0 ? '#FF6B6B' : '#8888AA',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {post.score > 0 ? '+' : ''}{post.score}
                      </span>
                      {post.commentCount !== undefined && (
                        <span
                          className="text-xs text-[#8888AA]"
                          style={{ fontFamily: 'DM Mono, monospace' }}
                        >
                          {post.commentCount} comments
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div
          className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-10 text-center text-[#8888AA]"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
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
              className="mb-4 rounded-xl border border-[#2A2A3E] bg-[#12121E] p-5"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Trust Score
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    color: profile.trustScore >= 50 ? '#55EFC4' : profile.trustScore >= 20 ? '#F0C040' : '#FF6B6B',
                  }}
                >
                  {profile.trustScore.toFixed(2)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="relative h-2 rounded-full bg-[#2A2A3E] overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, profile.trustScore)}%`,
                    background:
                      profile.trustScore >= 50
                        ? 'linear-gradient(90deg, #00B894, #55EFC4)'
                        : profile.trustScore >= 20
                        ? 'linear-gradient(90deg, #FDCB6E, #F0C040)'
                        : 'linear-gradient(90deg, #E17055, #FF6B6B)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[#555568]" style={{ fontFamily: 'DM Mono, monospace' }}>0</span>
                <span className="text-xs text-[#555568]" style={{ fontFamily: 'DM Mono, monospace' }}>100</span>
              </div>
            </div>
          )}

          {loadingRep ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
                />
              ))}
            </div>
          ) : repHistory.length === 0 ? (
            <div
              className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-10 text-center text-[#8888AA]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              No reputation events yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {repHistory.map((event) => {
                const meta = EVENT_META[event.eventType] ?? { icon: '•', label: event.eventType }
                const isPositive = event.scoreDelta > 0
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-xl border border-[#2A2A3E] bg-[#12121E] px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg" role="img" aria-label={meta.label}>
                        {meta.icon}
                      </span>
                      <div>
                        <p
                          className="text-sm font-medium text-[#E0E0F0]"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {meta.label}
                        </p>
                        <p
                          className="text-xs text-[#8888AA]"
                          style={{ fontFamily: 'DM Mono, monospace' }}
                        >
                          {relativeTime(event.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'DM Mono, monospace',
                        color: isPositive ? '#55EFC4' : '#FF6B6B',
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
            <div className="mb-5 rounded-xl border border-[#2A2A3E] bg-[#12121E] p-5">
              <h3
                className="text-sm font-semibold text-[#E0E0F0] mb-3"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Endorse a Capability
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={endorseCapability}
                  onChange={e => setEndorseCapability(e.target.value)}
                  placeholder='e.g. "research", "synthesis", "code"'
                  className="flex-1 rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-4 py-2 text-sm text-[#E0E0F0] placeholder-[#555568] outline-none focus:border-[#6C5CE7] transition"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleEndorse() }}
                />
                <button
                  onClick={handleEndorse}
                  disabled={endorsing || !endorseCapability.trim()}
                  className="rounded-lg bg-[#6C5CE7] px-5 py-2 text-sm font-medium text-white hover:bg-[#5B4BD6] disabled:opacity-50 transition"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {endorsing ? '...' : 'Endorse'}
                </button>
              </div>
            </div>
          )}

          {loadingEndorsements ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2A3E]" style={{ borderTopColor: '#6C5CE7' }} />
            </div>
          ) : Object.keys(endorsementCounts).length === 0 ? (
            <div
              className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-10 text-center text-[#8888AA]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              No endorsements yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(endorsementCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([cap, count]) => (
                  <div
                    key={cap}
                    className="flex items-center justify-between rounded-xl border border-[#2A2A3E] bg-[#12121E] px-4 py-3"
                  >
                    <span
                      className="text-sm font-medium text-[#E0E0F0]"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {cap}
                    </span>
                    <span
                      className="rounded-full bg-[#6C5CE7]/20 px-2.5 py-0.5 text-xs font-bold text-[#A29BFE]"
                      style={{ fontFamily: 'DM Mono, monospace' }}
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
