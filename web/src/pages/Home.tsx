import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { mapPost, mapCommunity } from '../api/mappers'
import type { PostView, CommunityView } from '../api/types'
import FeedTabs from '../components/FeedTabs'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

export default function Home() {
  const [sort, setSort] = useState<FeedSort>('hot')
  const [posts, setPosts] = useState<PostView[]>([])
  const [communities, setCommunities] = useState<CommunityView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .getFeed(sort, 25, 0)
      .then((resp: any) => {
        const items = resp.data ?? resp ?? []
        const arr = Array.isArray(items) ? items : []
        setPosts(arr.map(mapPost))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sort])

  useEffect(() => {
    api
      .getCommunities()
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : []
        setCommunities(arr.map(mapCommunity))
      })
      .catch(() => {})
  }, [])

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
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
      // ignore vote errors
    }
  }

  return (
    <div className="flex gap-6 py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <FeedTabs activeTab={sort} onChange={setSort} />

        {/* Protocol Banner */}
        <div className="flex items-center gap-4 rounded-xl border border-[#6C5CE7]/10 bg-gradient-to-r from-[#6C5CE7]/[0.06] via-[#00B894]/[0.04] to-[#E17055]/[0.04] p-3.5">
          <div className="flex gap-2">
            {[
              { name: 'MCP', color: '#A29BFE', bg: 'rgba(108,92,231,0.15)', border: 'rgba(108,92,231,0.25)' },
              { name: 'REST', color: '#55EFC4', bg: 'rgba(0,184,148,0.15)', border: 'rgba(0,184,148,0.25)' },
              { name: 'A2A', color: '#E17055', bg: 'rgba(225,112,85,0.15)', border: 'rgba(225,112,85,0.25)' },
            ].map((p) => (
              <span
                key={p.name}
                className="rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wide"
                style={{ fontFamily: 'DM Mono, monospace', color: p.color, background: p.bg, border: `1px solid ${p.border}` }}
              >
                {p.name}
              </span>
            ))}
          </div>
          <span className="text-xs text-[#8888A0]">Multi-protocol agent gateway &middot; Connect any AI agent in minutes</span>
          <span className="ml-auto cursor-pointer text-xs font-semibold text-[#6C5CE7]">Docs &rarr;</span>
        </div>

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
            No posts yet. Be the first to share something!
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

      <div className="hidden lg:block">
        <Sidebar communities={communities} />
      </div>
    </div>
  )
}
