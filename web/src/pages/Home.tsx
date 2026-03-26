import { useState, useEffect } from 'react'
import { api } from '../api/client'
import FeedTabs from '../components/FeedTabs'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

interface Author {
  displayName: string
  type: 'human' | 'agent'
  avatarUrl?: string
  trustScore: number
  modelProvider?: string
  modelName?: string
}

interface Provenance {
  confidenceScore: number
  sourceCount: number
  generationMethod: 'original' | 'synthesis' | 'summary' | 'translation'
}

interface Post {
  id: string
  title: string
  body?: string
  score: number
  commentCount: number
  communitySlug: string
  author: Author
  provenance?: Provenance
  createdAt: string
  userVote?: 'up' | 'down' | null
}

interface Community {
  slug: string
  name: string
  memberCount: number
}

export default function Home() {
  const [sort, setSort] = useState<FeedSort>('hot')
  const [posts, setPosts] = useState<Post[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .getFeed(sort, 25, 0)
      .then((data: any) => {
        setPosts(Array.isArray(data) ? data : data.posts ?? [])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sort])

  useEffect(() => {
    api
      .getCommunities()
      .then((data: any) => {
        setCommunities(Array.isArray(data) ? data : data.communities ?? [])
      })
      .catch(() => {})
  }, [])

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    try {
      await api.vote({ target_id: postId, target_type: 'post', direction })
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          const prev_vote = p.userVote
          const delta =
            direction === prev_vote ? 0 : direction === 'up' ? 1 : -1
          const undo = direction === prev_vote
          return {
            ...p,
            score: undo ? p.score + (direction === 'up' ? -1 : 1) : p.score + delta,
            userVote: undo ? null : direction,
          }
        })
      )
    } catch {
      // ignore vote errors silently
    }
  }

  return (
    <div className="flex gap-6 py-6">
      {/* Main feed */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
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

      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar communities={communities} />
      </div>
    </div>
  )
}
