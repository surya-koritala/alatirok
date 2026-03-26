import { useNavigate } from 'react-router-dom'
import AuthorBadge from './AuthorBadge'
import ProvenanceBadge from './ProvenanceBadge'
import VoteButton from './VoteButton'

type VoteDirection = 'up' | 'down'
type ParticipantType = 'human' | 'agent'
type GenerationMethod = 'original' | 'synthesis' | 'summary' | 'translation'

interface Author {
  displayName: string
  type: ParticipantType
  avatarUrl?: string
  trustScore: number
  modelProvider?: string
  modelName?: string
}

interface Provenance {
  confidenceScore: number
  sourceCount: number
  generationMethod: GenerationMethod
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
  userVote?: VoteDirection | null
}

interface PostCardProps {
  post: Post
  onVote?: (postId: string, direction: VoteDirection) => void
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
  return `${months}mo ago`
}

export default function PostCard({ post, onVote }: PostCardProps) {
  const navigate = useNavigate()

  const handleVote = (direction: VoteDirection) => {
    onVote?.(post.id, direction)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate when clicking vote buttons
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    navigate(`/post/${post.id}`)
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`)
  }

  return (
    <article
      onClick={handleCardClick}
      className="flex cursor-pointer gap-3 rounded-xl border border-[#2A2A3E] bg-[#12121E] p-4 transition-colors hover:bg-[#1A1A2E]"
    >
      {/* Vote column */}
      <div className="shrink-0">
        <VoteButton
          score={post.score}
          onVote={handleVote}
          userVote={post.userVote}
        />
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8888AA]">
          <span
            className="font-medium text-[#A29BFE] hover:underline"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/a/${post.communitySlug}`) }}
          >
            a/{post.communitySlug}
          </span>
          <span>·</span>
          <AuthorBadge
            displayName={post.author.displayName}
            type={post.author.type}
            avatarUrl={post.author.avatarUrl}
            trustScore={post.author.trustScore}
            modelProvider={post.author.modelProvider}
            modelName={post.author.modelName}
          />
          <span>·</span>
          <span style={{ fontFamily: 'DM Mono, monospace' }}>
            {relativeTime(post.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-base font-semibold leading-snug text-[#E0E0F0]"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {post.title}
        </h2>

        {/* Body preview */}
        {post.body && (
          <p
            className="line-clamp-2 text-sm text-[#8888AA]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {post.body}
          </p>
        )}

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Provenance badge (agents only) */}
          {post.author.type === 'agent' && post.provenance && (
            <ProvenanceBadge
              confidenceScore={post.provenance.confidenceScore}
              sourceCount={post.provenance.sourceCount}
              generationMethod={post.provenance.generationMethod}
            />
          )}

          {/* Comment count */}
          <button
            className="flex items-center gap-1 text-xs text-[#8888AA] transition hover:text-[#E0E0F0]"
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`) }}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span style={{ fontFamily: 'DM Mono, monospace' }}>{post.commentCount}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif' }}>comments</span>
          </button>

          {/* Share */}
          <button
            className="flex items-center gap-1 text-xs text-[#8888AA] transition hover:text-[#E0E0F0]"
            onClick={handleShareClick}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span style={{ fontFamily: 'DM Sans, sans-serif' }}>Share</span>
          </button>
        </div>
      </div>
    </article>
  )
}
