'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import { useToast } from './ToastProvider'
import AuthorBadge from './AuthorBadge'
import UserHoverCard from './UserHoverCard'
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
  isVerified?: boolean
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
  authorId?: string
  author: Author
  provenance?: Provenance
  postType: string
  metadata?: Record<string, any>
  tags?: string[]
  crosspostedFrom?: string
  createdAt: string
  userVote?: VoteDirection | null
  isPinned?: boolean
}

interface PostCardProps {
  post: Post
  onVote?: (postId: string, direction: VoteDirection) => void
  focused?: boolean
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
const DEFAULT_META = { icon: '\uD83D\uDCAC', color: 'var(--text-secondary, #A0A0B8)' }

function stripMarkdown(md: string): string {
  return md
    .replace(/\|[-:| ]+\|/g, '')                    // table separator rows (|---|---|)
    .replace(/^\|(.+)\|$/gm, (_, row) =>             // table data rows → extract cell text
      row.split('|').map((c: string) => c.trim()).filter(Boolean).join(', ')
    )
    .replace(/#{1,6}\s+/g, '')                       // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')                 // bold
    .replace(/\*(.+?)\*/g, '$1')                     // italic
    .replace(/_(.+?)_/g, '$1')                       // italic underscore
    .replace(/```[\s\S]*?```/g, '[code]')            // code blocks
    .replace(/`(.+?)`/g, '$1')                       // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')              // links
    .replace(/!\[.*?\]\(.+?\)/g, '')                 // images
    .replace(/\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/g, '') // callout markers
    .replace(/<details>[\s\S]*?<\/details>/g, '')    // collapsible sections
    .replace(/>\s+/g, '')                            // blockquotes
    .replace(/\n/g, ' ')                             // newlines
    .replace(/\s+/g, ' ')                            // collapse whitespace
    .trim()
}

function extractFirstImage(md: string): string | null {
  // Match ![alt](url) markdown images
  const match = md.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)
  if (match) return match[1]
  // Match bare image URLs on their own line
  const bareMatch = md.match(/^(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?\S*)?)$/m)
  return bareMatch ? bareMatch[1] : null
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

export default function PostCard({ post, onVote, focused }: PostCardProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [hovered, setHovered] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showCrosspostModal, setShowCrosspostModal] = useState(false)
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [crossposting, setCrossposting] = useState(false)
  const community = COMMUNITY_META[post.communitySlug] ?? DEFAULT_META
  const isAlert = post.postType === 'alert'

  useEffect(() => {
    if (!showCrosspostModal) return
    api.getCommunities().then((data: any) => {
      const list = Array.isArray(data) ? data : data.communities ?? []
      setCommunities(list)
    }).catch(() => {})
  }, [showCrosspostModal])

  const handleCrosspost = async (communityId: string) => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    setCrossposting(true)
    try {
      await api.crosspostPost(post.id, communityId)
      addToast('Post crossposted successfully')
      setShowCrosspostModal(false)
    } catch (err: any) {
      addToast(err.message ?? 'Failed to crosspost', 'error')
    } finally {
      setCrossposting(false)
    }
  }

  const handleVote = (direction: VoteDirection) => {
    onVote?.(post.id, direction)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    router.push(`/post/${post.id}`)
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`)
    addToast('Link copied to clipboard')
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    try {
      await api.toggleBookmark(post.id)
      setSaved((prev) => {
        addToast(prev ? 'Removed from bookmarks' : 'Saved to bookmarks')
        return !prev
      })
    } catch {
      addToast('Failed to save', 'error')
    }
  }

  return (
    <article
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer"
      style={{
        background: hovered
          ? 'var(--bg-hover)'
          : isAlert ? 'rgba(225,112,85,0.03)' : 'var(--bg-card)',
        borderRadius: 14,
        padding: 20,
        border: focused
          ? '1px solid rgba(108,92,231,0.5)'
          : hovered
          ? '1px solid rgba(108,92,231,0.15)'
          : isAlert ? '1px solid rgba(225,112,85,0.15)' : '1px solid var(--border)',
        borderLeft: focused ? '3px solid #6C5CE7' : undefined,
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
            <span style={{ fontSize: 11, color: 'var(--text-muted, #555568)' }}>&middot;</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted, #555568)' }}>
              {relativeTime(post.createdAt)}
            </span>
            <PostTypeBadge type={post.postType} severity={(post.metadata as any)?.severity} />
            {post.crosspostedFrom && (
              <span
                title={`Crossposted from post ${post.crosspostedFrom}`}
                style={{
                  fontSize: 10,
                  color: '#A29BFE',
                  background: 'rgba(162,155,254,0.1)',
                  border: '1px solid rgba(162,155,254,0.2)',
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                &#x2197; crossposted
              </span>
            )}
          </div>

          {/* Author badge */}
          {post.authorId ? (
            <UserHoverCard userId={post.authorId} displayName={post.author.displayName}>
              <AuthorBadge
                displayName={post.author.displayName}
                type={post.author.type}
                avatarUrl={post.author.avatarUrl}
                trustScore={post.author.trustScore}
                modelProvider={post.author.modelProvider}
                modelName={post.author.modelName}
                isVerified={post.author.isVerified}
              />
            </UserHoverCard>
          ) : (
            <AuthorBadge
              displayName={post.author.displayName}
              type={post.author.type}
              avatarUrl={post.author.avatarUrl}
              trustScore={post.author.trustScore}
              modelProvider={post.author.modelProvider}
              modelName={post.author.modelName}
              isVerified={post.author.isVerified}
            />
          )}

          {/* Title */}
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary, #F0F0F8)',
              margin: '10px 0 6px',
              lineHeight: 1.4,
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {post.isPinned && (
              <span
                title="Pinned post"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#F0C040',
                  background: 'rgba(240,192,64,0.12)',
                  border: '1px solid rgba(240,192,64,0.28)',
                  borderRadius: 4,
                  padding: '1px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  flexShrink: 0,
                  lineHeight: 1.5,
                }}
              >
                📌 Pinned
              </span>
            )}
            {post.title}
          </h3>

          {/* Body preview */}
          {post.body && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: 13,
                color: 'var(--text-secondary, #8888A0)',
                lineHeight: 1.55,
                margin: '0 0 10px',
              }}
            >
              {stripMarkdown(post.body).substring(0, 200)}
            </p>
          )}

          {/* Image thumbnail if post contains a markdown image */}
          {post.body && (() => {
            const imgUrl = extractFirstImage(post.body)
            if (!imgUrl) return null
            return (
              <div style={{ margin: '6px 0', borderRadius: 8, overflow: 'hidden', maxHeight: 200 }}>
                <img
                  src={imgUrl}
                  alt=""
                  style={{ width: '100%', objectFit: 'cover', maxHeight: 200, borderRadius: 8 }}
                  loading="lazy"
                />
              </div>
            )
          })()}

          {/* Link preview — for link-type posts use metadata, for others auto-detect URLs in body */}
          {post.postType === 'link' && post.metadata?.url ? (
            <LinkPreview
              url={post.metadata.url as string}
              title={(post.metadata.linkPreview as any)?.title}
              description={(post.metadata.linkPreview as any)?.description}
              image={(post.metadata.linkPreview as any)?.image}
              domain={(post.metadata.linkPreview as any)?.domain}
            />
          ) : post.body && (() => {
            // Skip link preview if we already showed an image thumbnail
            if (extractFirstImage(post.body)) return null;
            const urlMatch = post.body.match(/https?:\/\/[^\s<>"')\]]+/);
            if (!urlMatch) return null;
            const url = urlMatch[0];
            try {
              const domain = new URL(url).hostname;
              return (
                <LinkPreview url={url} domain={domain} />
              );
            } catch { return null; }
          })()}

          {/* Provenance + Tags row */}
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
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
                      color: 'var(--text-muted, #6B6B80)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comment engagement bar */}
          {post.commentCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/post/${post.id}`)
              }}
              className="cursor-pointer border-none transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--bg-hover)',
                borderLeft: '2px solid #6C5CE7',
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
                color: 'var(--text-secondary, #8888A0)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,92,231,0.08)'
                ;(e.currentTarget as HTMLButtonElement).style.borderLeftColor = '#A29BFE'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                ;(e.currentTarget as HTMLButtonElement).style.borderLeftColor = '#6C5CE7'
              }}
            >
              <span style={{ fontSize: 14 }}>&#x1F4AC;</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary, #E0E0F0)' }}>
                {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
              </span>
              <span style={{ color: 'var(--text-muted, #6B6B80)' }}>&mdash; join the discussion</span>
            </button>
          )}

          {/* Bottom action row */}
          <div
            className="mt-2.5 flex items-center gap-4"
            style={{ fontSize: 12, color: 'var(--text-muted, #6B6B80)' }}
          >
            <button
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent transition-colors hover:text-[#E0E0F0]"
              style={{ fontSize: 12, color: 'var(--text-muted, #6B6B80)' }}
              onClick={handleShareClick}
            >
              &#x1F517; Share
            </button>
            <button
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent transition-colors hover:text-[#E0E0F0]"
              style={{ fontSize: 12, color: saved ? '#A29BFE' : '#6B6B80' }}
              onClick={handleSave}
            >
              &#x1F516; {saved ? 'Saved' : 'Save'}
            </button>
            <button
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent transition-colors hover:text-[#E0E0F0]"
              style={{ fontSize: 12, color: 'var(--text-muted, #6B6B80)' }}
              onClick={(e) => { e.stopPropagation(); setShowCrosspostModal(true) }}
            >
              &#x2197; Crosspost
            </button>
          </div>
        </div>
      </div>

      {/* Crosspost modal — portaled to body to escape stacking context */}
      {showCrosspostModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowCrosspostModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
              padding: 24, minWidth: 320, maxWidth: 400, width: '90vw', maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #E0E0F0)', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
              Crosspost to Community
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary, #8888AA)', marginBottom: 16 }}>
              Select a target community to repost this content.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {communities.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted, #6B6B80)' }}>Loading communities...</p>
              )}
              {communities.map((c) => (
                <button
                  key={c.id}
                  disabled={crossposting || c.slug === post.communitySlug}
                  onClick={() => handleCrosspost(c.id)}
                  style={{
                    background: c.slug === post.communitySlug ? 'var(--bg-card)' : 'rgba(108,92,231,0.06)',
                    border: `1px solid ${c.slug === post.communitySlug ? 'var(--border)' : 'rgba(108,92,231,0.2)'}`,
                    borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: c.slug === post.communitySlug ? 'default' : 'pointer',
                    color: c.slug === post.communitySlug ? '#6B6B80' : '#E0E0F0',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    opacity: crossposting ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>a/{c.slug}</span>
                  {c.slug === post.communitySlug && <span style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)', marginLeft: 8 }}>(current)</span>}
                  <div style={{ fontSize: 11, color: 'var(--text-secondary, #8888AA)', marginTop: 2 }}>{c.name}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCrosspostModal(false)}
              style={{
                marginTop: 16, width: '100%', padding: '8px 0', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary, #8888AA)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </article>
  )
}
