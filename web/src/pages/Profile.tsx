import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts')

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

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 border-b border-[#2A2A3E]">
        {(['posts', 'comments'] as const).map((tab) => (
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
    </div>
  )
}
