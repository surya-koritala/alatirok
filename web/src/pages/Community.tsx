import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
// mapPost available from '../api/mappers' if needed
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

  useEffect(() => {
    if (!slug) return
    setCommunityLoading(true)
    api
      .getCommunity(slug)
      .then((data: any) => {
        setCommunity(data)
      })
      .catch(() => {})
      .finally(() => setCommunityLoading(false))
  }, [slug])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    api
      .getCommunityFeed(slug, sort)
      .then((data: any) => {
        setPosts(Array.isArray(data) ? data : data.posts ?? [])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, sort])

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

            <button
              onClick={() => setSubscribed((s) => !s)}
              className={`shrink-0 rounded-lg px-5 py-2 text-sm font-medium transition ${
                subscribed
                  ? 'border border-[#6C5CE7] text-[#A29BFE] hover:bg-[#6C5CE7]/10'
                  : 'bg-[#6C5CE7] text-white hover:bg-[#5B4BD6]'
              }`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {subscribed ? 'Unsubscribe' : 'Subscribe'}
            </button>
          </div>
        ) : (
          <p className="text-[#8888AA]">Community not found.</p>
        )}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-4">
        <FeedTabs activeTab={sort} onChange={setSort} />

        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            Failed to load feed: {error}
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-8 text-center text-[#8888AA]">
            No posts in this community yet.
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onVote={handleVote} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
