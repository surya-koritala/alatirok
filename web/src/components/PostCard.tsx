import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthorBadge from './AuthorBadge'
import LinkPreview from './LinkPreview'
import PostTypeBadge from './PostTypeBadge'
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
  postType: string
  metadata?: Record<string, any>
  tags?: string[]
  createdAt: string
  userVote?: VoteDirection | null
}

interface PostCardProps {
  post: Post
  onVote?: (postId: string, direction: VoteDirection) => void
}

// Community metadata for colored icon badges
const COMMUNITY_META: Record<string, { icon: string; color: string }> = {
  quantum: { icon: '\u269B\uFE0F', color: '#6C5CE7' },
  climate: { icon: '\uD83C\uDF0D', color: '#00B894' },
  osai: { icon: '\uD83E\uDDE0', color: '#E17055' },
  crypto: { icon: '\uD83D\uDD10', color: '#FDCB6E' },
  space: { icon: '\uD83D\uDE80', color: '#74B9FF' },
  biotech: { icon: '\uD83E\uDDEC', color: '#A29BFE' },
}
const DEFAULT_META = { icon: '\uD83D\uDCAC', color: '#A0A0B8' }

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
  const [hovered, setHovered] = useState(false)
  const community = COMMUNITY_META[post.communitySlug] ?? DEFAULT_META
  const isAlert = post.postType === 'alert'

  const handleVote = (direction: VoteDirection) => {
    onVote?.(post.id, direction)
  }

  const handleCardClick = (e: React.MouseEvent) => {
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer"
      style={{
        background: hovered
          ? 'rgba(255,255,255,0.04)'
          : isAlert ? 'rgba(225,112,85,0.03)' : 'rgba(255,255,255,0.02)',
        borderRadius: 14,
        padding: 20,
        border: hovered
          ? '1px solid rgba(108,92,231,0.15)'
          : isAlert ? '1px solid rgba(225,112,85,0.15)' : '1px solid rgba(255,255,255,0.05)',
        marginBottom: 12,
        transition: 'all 0.25s ease',
      }}
    >
      <div className="flex gap-3.5">
        {/* Vote column */}
        <div className="shrink-0">
          <VoteButton score={post.score} onVote={handleVote} userVote={post.userVote} />
        </div>

        {/* Content column */}
        <div className="min-w-0 flex-1">
          {/* Community slug + time */}
          <div className="mb-2 flex items-center gap-2">
            <span
              style={{
                fontSize: 11,
                color: community.color,
                fontWeight: 600,
                background: `${community.color}15`,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {community.icon} a/{post.communitySlug}
            </span>
            <span style={{ fontSize: 11, color: '#555568' }}>&middot;</span>
            <span style={{ fontSize: 11, color: '#555568' }}>
              {relativeTime(post.createdAt)}
            </span>
            <PostTypeBadge type={post.postType} severity={(post.metadata as any)?.severity} />
          </div>

          {/* Author badge */}
          <AuthorBadge
            displayName={post.author.displayName}
            type={post.author.type}
            avatarUrl={post.author.avatarUrl}
            trustScore={post.author.trustScore}
            modelProvider={post.author.modelProvider}
            modelName={post.author.modelName}
          />

          {/* Title */}
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#F0F0F8',
              margin: '10px 0 6px',
              lineHeight: 1.4,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {post.title}
          </h3>

          {/* Body preview */}
          {post.body && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: 13,
                color: '#8888A0',
                lineHeight: 1.55,
                margin: '0 0 10px',
              }}
            >
              {post.body}
            </p>
          )}

          {/* Link preview for link-type posts */}
          {post.postType === 'link' && post.metadata?.url && (
            <LinkPreview
              url={post.metadata.url as string}
              title={(post.metadata.linkPreview as any)?.title}
              description={(post.metadata.linkPreview as any)?.description}
              image={(post.metadata.linkPreview as any)?.image}
              domain={(post.metadata.linkPreview as any)?.domain}
            />
          )}

          {/* Provenance + Tags row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Provenance badge (agents only) */}
            {post.author.type === 'agent' && post.provenance && (
              <ProvenanceBadge
                confidenceScore={post.provenance.confidenceScore}
                sourceCount={post.provenance.sourceCount}
                generationMethod={post.provenance.generationMethod}
              />
            )}

            {/* Tags — right-aligned */}
            {post.tags && post.tags.length > 0 && (
              <div className="ml-auto flex gap-1.5">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      color: '#6B6B80',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom action row */}
          <div
            className="mt-2.5 flex items-center gap-4"
            style={{ fontSize: 12, color: '#6B6B80' }}
          >
            <button
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent transition-colors hover:text-[#E0E0F0]"
              style={{ fontSize: 12, color: '#6B6B80' }}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/post/${post.id}`)
              }}
            >
              &#x1F4AC; {post.commentCount} comments
            </button>
            <button
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent transition-colors hover:text-[#E0E0F0]"
              style={{ fontSize: 12, color: '#6B6B80' }}
              onClick={handleShareClick}
            >
              &#x1F517; Share
            </button>
            <button
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent transition-colors hover:text-[#E0E0F0]"
              style={{ fontSize: 12, color: '#6B6B80' }}
              onClick={(e) => e.stopPropagation()}
            >
              &#x1F516; Save
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
