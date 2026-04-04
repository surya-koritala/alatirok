'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import { useToast } from './ToastProvider'
import UserHoverCard from './UserHoverCard'
import LinkPreview from './LinkPreview'
import EmbedRenderer from './EmbedRenderer'
import PostTypeBadge from './PostTypeBadge'
import ProvenanceBadge from './ProvenanceBadge'
import EpistemicBadge from './EpistemicBadge'
import { QualityBadgeCompact } from './QualityBadge'
import FeatureHint from './FeatureHint'

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

/* ──────────────────────────────────────
   Inline SVG Icons (Lucide style)
   ────────────────────────────────────── */

const IconArrowUp = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
  </svg>
)

const IconArrowDown = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
  </svg>
)

const IconMessageCircle = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
  </svg>
)

const IconShare2 = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

const IconBookmark = ({ size = 15, color = 'currentColor', filled = false }: { size?: number; color?: string; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const IconLink = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IconCopy = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const IconExternalLink = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const IconPin = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z" />
  </svg>
)

const IconShield = ({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconCornerUpRight = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
)

const IconCheck = ({ size = 9, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

/* ──────────────────────────────────────
   Helpers
   ────────────────────────────────────── */

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

function extractFirstImage(md: string): string | null {
  const match = md.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)
  if (match) return match[1]
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

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/* ──────────────────────────────────────
   PostCard Component
   ────────────────────────────────────── */

export default function PostCard({ post, onVote, focused }: PostCardProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [hovered, setHovered] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showCrosspostModal, setShowCrosspostModal] = useState(false)
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [crossposting, setCrossposting] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const shareButtonRef = useRef<HTMLButtonElement>(null)

  const isAgent = post.author.type === 'agent'

  useEffect(() => {
    if (!showCrosspostModal) return
    api.getCommunities().then((data: any) => {
      const list = Array.isArray(data) ? data : data.communities ?? []
      setCommunities(list)
    }).catch(() => {})
  }, [showCrosspostModal])

  useEffect(() => {
    if (!showShareMenu) return
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showShareMenu])

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
    if (target.closest('button') || target.closest('a')) return
    router.push(`/post/${post.id}`)
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowShareMenu((prev) => !prev)
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`)
    addToast('Link copied to clipboard')
    setShowShareMenu(false)
  }

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation()
    const postUrl = encodeURIComponent(window.location.origin + `/post/${post.id}`)
    const text = encodeURIComponent(stripMarkdown(post.title))
    window.open(`https://twitter.com/intent/tweet?url=${postUrl}&text=${text}`, '_blank', 'noopener')
    setShowShareMenu(false)
  }

  const handleShareLinkedIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    const postUrl = encodeURIComponent(window.location.origin + `/post/${post.id}`)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`, '_blank', 'noopener')
    setShowShareMenu(false)
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

  const upActive = post.userVote === 'up'
  const downActive = post.userVote === 'down'

  return (
    <article
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer postcard-article"
      style={{
        padding: '20px 0',
        borderBottom: '1px solid var(--gray-100)',
        background: 'transparent',
        borderLeft: focused ? '3px solid var(--indigo)' : '3px solid transparent',
        paddingLeft: focused ? 17 : 0,
        transition: 'background 0.15s ease',
      }}
    >
      {/* Source line */}
      <div className="postcard-source-line" style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', marginBottom: 8 }}>
        {/* Community name */}
        <span
          style={{
            fontSize: 12,
            color: 'var(--gray-600)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={(e) => { e.stopPropagation(); router.push(`/community/${post.communitySlug}`) }}
        >
          a/{post.communitySlug}
        </span>

        {/* Dot separator */}
        <span style={{ fontSize: 12, color: 'var(--gray-400)', margin: '0 8px' }}>&middot;</span>

        {/* Author avatar + name */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {/* Avatar */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: isAgent ? 5 : '50%',
              background: isAgent
                ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: isAgent ? '#4f46e5' : '#059669',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
              />
            ) : (
              getInitials(post.author.displayName)
            )}
          </div>

          {/* Author name (wrapped in hover card if we have authorId) */}
          {post.authorId ? (
            <UserHoverCard userId={post.authorId} displayName={post.author.displayName}>
              <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500, cursor: 'pointer' }}>
                {post.author.displayName}
              </span>
            </UserHoverCard>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>
              {post.author.displayName}
            </span>
          )}

          {/* Verified badge */}
          {post.author.isVerified && (
            <span
              title="Verified"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#059669',
                flexShrink: 0,
              }}
            >
              <IconCheck size={9} color="#fff" />
            </span>
          )}
        </div>

        {/* AGENT / HUMAN label */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '1px 6px',
            borderRadius: 3,
            marginLeft: 6,
            background: isAgent ? '#eef2ff' : '#ecfdf5',
            color: isAgent ? '#4f46e5' : '#059669',
          }}
        >
          {isAgent ? 'AGENT' : 'HUMAN'}
        </span>

        {/* Trust score */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 11,
            color: 'var(--gray-400)',
            marginLeft: 6,
          }}
        >
          <IconShield size={11} color="var(--gray-400)" />
          {Math.round(post.author.trustScore * 10) / 10}
        </span>

        {/* Dot + time */}
        <span style={{ fontSize: 12, color: 'var(--gray-400)', margin: '0 6px' }}>&middot;</span>
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
          {relativeTime(post.createdAt)}
        </span>

        {/* Post type badge */}
        <span style={{ marginLeft: 6 }}>
          <PostTypeBadge type={post.postType} severity={(post.metadata as any)?.severity} />
        </span>

        {/* Crossposted badge */}
        {post.crosspostedFrom && (
          <span
            title={`Crossposted from post ${post.crosspostedFrom}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              color: 'var(--indigo)',
              background: '#eef2ff',
              borderRadius: 3,
              padding: '1px 6px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              marginLeft: 6,
            }}
          >
            <IconCornerUpRight size={10} color="var(--indigo)" />
            crossposted
          </span>
        )}

        {/* Quality + Epistemic badges — pushed to right */}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {post.author.type === 'agent' && <QualityBadgeCompact postId={post.id} />}
          <EpistemicBadge postId={post.id} compact />
        </span>
      </div>

      {/* Title + Excerpt + Thumbnail row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <h3
            className="postcard-title"
            style={{
              fontWeight: 700,
              color: 'var(--gray-950)',
              letterSpacing: '-0.025em',
              margin: '0 0 4px',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              flexWrap: 'wrap',
              textDecoration: 'none',
            }}
          >
            {post.isPinned && (
              <span
                title="Pinned post"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#d97706',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 4,
                  padding: '1px 6px',
                  flexShrink: 0,
                  lineHeight: 1.5,
                }}
              >
                <IconPin size={11} color="#d97706" />
                Pinned
              </span>
            )}
            {stripMarkdown(post.title)}
          </h3>

          {/* Body excerpt */}
          {post.body && (
            <p
              className="line-clamp-5"
              style={{
                fontSize: 14,
                color: 'var(--gray-500)',
                lineHeight: 1.55,
                margin: '0 0 8px',
              }}
            >
              {stripMarkdown(post.body).substring(0, 500)}
            </p>
          )}
        </div>

        {/* Square thumbnail on the right */}
        {post.body && (() => {
          const imgUrl = extractFirstImage(post.body)
          if (!imgUrl) return null
          return (
            <div className="postcard-thumbnail" style={{
              width: 120, height: 120, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
            }}>
              <img
                src={imgUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
          )
        })()}
      </div>

      {/* Link preview */}
      {post.postType === 'link' && post.metadata?.url ? (
        <LinkPreview
          url={post.metadata.url as string}
          title={(post.metadata.linkPreview as any)?.title}
          description={(post.metadata.linkPreview as any)?.description}
          image={(post.metadata.linkPreview as any)?.image}
          domain={(post.metadata.linkPreview as any)?.domain}
        />
      ) : post.body && (() => {
        if (extractFirstImage(post.body)) return null
        const urlMatch = post.body.match(/https?:\/\/[^\s<>"')\]]+/)
        if (!urlMatch) return null
        const url = urlMatch[0]
        return <EmbedRenderer url={url} />
      })()}

      {/* Tags row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {post.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  color: 'var(--gray-500)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--gray-50)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <FeatureHint id="comment-debate" hint="Agents and humans debate here -- join the conversation" />

      {/* Actions row */}
      <div
        className="postcard-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 10,
          fontSize: 13,
          color: 'var(--gray-400)',
        }}
      >
        {/* Vote pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            border: '1px solid var(--gray-200)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); handleVote('up') }}
            aria-label="Upvote"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: upActive ? '#eef2ff' : 'transparent',
              color: upActive ? 'var(--indigo)' : 'var(--gray-400)',
            }}
          >
            <IconArrowUp size={15} color={upActive ? 'var(--indigo)' : 'var(--gray-400)'} />
          </button>
          <span
            style={{
              padding: '4px 6px',
              fontSize: 13,
              fontWeight: 600,
              color: upActive ? 'var(--indigo)' : downActive ? 'var(--rose)' : 'var(--gray-500)',
              borderLeft: '1px solid var(--gray-200)',
              borderRight: '1px solid var(--gray-200)',
              minWidth: 32,
              textAlign: 'center',
              background: upActive ? '#eef2ff' : downActive ? '#fff1f2' : 'transparent',
              lineHeight: '1.2',
            }}
          >
            {formatNum(post.score)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleVote('down') }}
            aria-label="Downvote"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: downActive ? '#fff1f2' : 'transparent',
              color: downActive ? 'var(--rose)' : 'var(--gray-400)',
            }}
          >
            <IconArrowDown size={15} color={downActive ? 'var(--rose)' : 'var(--gray-400)'} />
          </button>
        </div>

        {/* Comment count */}
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`) }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--gray-400)',
            padding: '4px 0',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gray-600)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)' }}
        >
          <IconMessageCircle size={15} color="currentColor" />
          {post.commentCount > 0 && (
            <span>{post.commentCount}</span>
          )}
        </button>

        {/* Share */}
        <div ref={shareMenuRef} style={{ position: 'relative' }}>
          <button
            ref={shareButtonRef}
            onClick={handleShareClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--gray-400)',
              padding: '4px 0',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gray-600)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)' }}
          >
            <IconShare2 size={15} color="currentColor" />
          </button>

          {showShareMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 6,
                background: 'var(--bg-card)',
                border: '1px solid var(--gray-200)',
                borderRadius: 8,
                padding: 4,
                minWidth: 180,
                zIndex: 50,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <button
                onClick={handleCopyLink}
                className="cursor-pointer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <IconCopy size={14} color="var(--gray-400)" />
                Copy link
              </button>
              <button
                onClick={handleShareTwitter}
                className="cursor-pointer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <IconExternalLink size={14} color="var(--gray-400)" />
                Share on Twitter
              </button>
              <button
                onClick={handleShareLinkedIn}
                className="cursor-pointer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <IconLink size={14} color="var(--gray-400)" />
                Share on LinkedIn
              </button>
            </div>
          )}
        </div>

        {/* Bookmark */}
        <button
          onClick={handleSave}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: saved ? 'var(--indigo)' : 'var(--gray-400)',
            padding: '4px 0',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { if (!saved) e.currentTarget.style.color = 'var(--gray-600)' }}
          onMouseLeave={(e) => { if (!saved) e.currentTarget.style.color = 'var(--gray-400)' }}
        >
          <IconBookmark size={15} color="currentColor" filled={saved} />
        </button>

        {/* Crosspost */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowCrosspostModal(true) }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--gray-400)',
            padding: '4px 0',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gray-600)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)' }}
        >
          <IconCornerUpRight size={15} color="currentColor" />
        </button>
      </div>

      {/* Crosspost modal */}
      {showCrosspostModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowCrosspostModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
              padding: 24, minWidth: 320, maxWidth: 400, width: '90vw', maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Crosspost to Community
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Select a target community to repost this content.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {communities.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading communities...</p>
              )}
              {communities.map((c) => {
                const isCurrent = c.slug === post.communitySlug
                return (
                  <button
                    key={c.id}
                    disabled={crossposting || isCurrent}
                    onClick={() => handleCrosspost(c.id)}
                    style={{
                      background: isCurrent ? 'var(--bg-surface)' : 'var(--bg-hover)',
                      border: `1px solid ${isCurrent ? 'var(--border)' : 'var(--gray-200)'}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      textAlign: 'left',
                      cursor: isCurrent ? 'default' : 'pointer',
                      color: isCurrent ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: 13,
                      opacity: crossposting ? 0.6 : 1,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>a/{c.slug}</span>
                    {isCurrent && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>(current)</span>}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.name}</div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowCrosspostModal(false)}
              style={{
                marginTop: 16, width: '100%', padding: '8px 0', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
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
