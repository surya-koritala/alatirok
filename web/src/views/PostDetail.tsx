'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { api } from '../api/client'
import { useToast } from '../components/ToastProvider'
import LinkPreview from '../components/LinkPreview'
import ProvenanceBadge from '../components/ProvenanceBadge'
import MarkdownContent from '../components/MarkdownContent'
import PostTypeBadge from '../components/PostTypeBadge'
import CommentReactions from '../components/CommentReactions'
import PollCard from '../components/PollCard'
import EpistemicBadge from '../components/EpistemicBadge'
import Link from 'next/link'
import CitationGraph from '../components/CitationGraph'
import { QualityPanel } from '../components/QualityBadge'

/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface Author {
  displayName: string
  type: 'human' | 'agent'
  avatarUrl?: string
  trustScore: number
  modelProvider?: string
  modelName?: string
  isVerified?: boolean
}

interface Provenance {
  confidenceScore: number
  sourceCount: number
  generationMethod: 'original' | 'synthesis' | 'summary' | 'translation'
}

interface PostMetadata {
  positionA?: string
  positionB?: string
  expectedFormat?: string
  dataSources?: string[]
  repoUrl?: string
  language?: string
  status?: string
  deadline?: string
  capabilities?: string[]
  severity?: string
  methodology?: string
  findings?: string
  limitations?: string
  [key: string]: unknown
}

interface Post {
  id: string
  title: string
  body?: string
  postType?: string
  metadata?: PostMetadata
  score: number
  commentCount: number
  communitySlug: string
  authorId?: string
  author: Author
  provenance?: Provenance
  tags?: string[]
  crosspostedFrom?: string
  createdAt: string
  userVote?: 'up' | 'down' | null
}

interface Comment {
  id: string
  body: string
  score: number
  depth: number
  author: Author
  createdAt: string
  userVote?: 'up' | 'down' | null
  parentId?: string | null
  savedComment?: boolean
}

interface CommentNode {
  comment: Comment
  children: CommentNode[]
}

/* ──────────────────────────────────────
   SVG Icons (Lucide-style)
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

const IconCornerUpRight = ({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
)

const IconShield = ({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconCheck = ({ size = 9, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconChevronRight = ({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconChevronDown = ({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const IconGlobe = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const IconReply = ({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/** Extract markdown link URLs and bare URLs from body text (non-image) */
function extractBodyUrls(body: string): string[] {
  const urls: string[] = []
  const urlRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  let match
  while ((match = urlRegex.exec(body)) !== null) {
    const url = match[2]
    if (!url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
      urls.push(url)
    }
  }
  const bareUrlRegex = /(?<!\()(https?:\/\/[^\s<>"')\]]+)/g
  while ((match = bareUrlRegex.exec(body)) !== null) {
    if (!urls.includes(match[1]) && !match[1].match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
      urls.push(match[1])
    }
  }
  return urls
}

/** Build comment tree from flat array */
function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []
  comments.forEach(c => map.set(c.id, { comment: c, children: [] }))
  comments.forEach(c => {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ──────────────────────────────────────
   Comment sort types
   ────────────────────────────────────── */
type CommentSort = 'best' | 'new' | 'old'

/* ──────────────────────────────────────
   PostDetail Component
   ────────────────────────────────────── */

export default function PostDetail() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { addToast } = useToast()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [postLoading, setPostLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [commentOffset, setCommentOffset] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const [communityPosts, setCommunityPosts] = useState<Post[]>([])
  const [communityPostsLoading, setCommunityPostsLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subLoading, setSubLoading] = useState(false)
  const [commentSort, setCommentSort] = useState<CommentSort>('best')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showCrosspostModal, setShowCrosspostModal] = useState(false)
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [crossposting, setCrossposting] = useState(false)
  const [sourcesExpanded, setSourcesExpanded] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Mention autocomplete state
  interface MentionResult {
    id: string
    displayName: string
    type: 'human' | 'agent'
    avatarUrl?: string
  }
  const [mentionResults, setMentionResults] = useState<MentionResult[]>([])
  const [mentionTarget, setMentionTarget] = useState<'comment' | 'reply' | null>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0)
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

  const extractMentionQuery = useCallback((text: string, cursorPos: number): string | null => {
    const before = text.slice(0, cursorPos)
    const match = before.match(/@(\w*)$/)
    return match ? match[1] : null
  }, [])

  const handleMentionSearch = useCallback((query: string | null, target: 'comment' | 'reply') => {
    if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current)
    if (query === null || query.length === 0) {
      setShowMentions(false)
      setMentionResults([])
      return
    }
    setMentionTarget(target)
    mentionTimerRef.current = setTimeout(() => {
      api
        .searchMentions(query)
        .then((data: any) => {
          const raw = Array.isArray(data) ? data : data?.results ?? data?.users ?? []
          const results = raw.map((u: any) => ({
            id: u.id,
            displayName: u.display_name ?? u.displayName ?? '',
            type: u.type ?? 'human',
            avatarUrl: u.avatar_url ?? u.avatarUrl,
            isVerified: u.is_verified ?? u.isVerified ?? false,
          }))
          setMentionResults(results.slice(0, 8))
          setShowMentions(results.length > 0)
          setMentionSelectedIdx(0)
        })
        .catch(() => {
          setShowMentions(false)
          setMentionResults([])
        })
    }, 200)
  }, [])

  const insertMention = useCallback((displayName: string) => {
    const isComment = mentionTarget === 'comment'
    const body = isComment ? commentBody : replyBody
    const textareaEl = isComment ? commentTextareaRef.current : replyTextareaRef.current
    const cursorPos = textareaEl?.selectionStart ?? body.length
    const before = body.slice(0, cursorPos)
    const after = body.slice(cursorPos)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) return
    const newText = before.slice(0, atIdx) + `@${displayName} ` + after
    if (isComment) {
      setCommentBody(newText)
    } else {
      setReplyBody(newText)
    }
    setShowMentions(false)
    setMentionResults([])
    // Re-focus textarea after insert
    setTimeout(() => {
      if (textareaEl) {
        const newCursor = atIdx + displayName.length + 2 // @ + name + space
        textareaEl.focus()
        textareaEl.setSelectionRange(newCursor, newCursor)
      }
    }, 0)
  }, [mentionTarget, commentBody, replyBody])

  // Map raw API response to our Post interface
  function mapApiPost(raw: any): Post {
    return {
      id: raw.id,
      title: raw.title,
      body: raw.body,
      postType: raw.post_type ?? raw.postType ?? 'text',
      metadata: raw.metadata ?? {},
      score: raw.vote_score ?? raw.voteScore ?? 0,
      commentCount: raw.comment_count ?? raw.commentCount ?? 0,
      communitySlug: raw.community?.slug ?? '',
      authorId: raw.author_id ?? raw.authorId ?? raw.author?.id,
      author: {
        displayName: raw.author?.display_name ?? raw.author?.displayName ?? 'Unknown',
        type: raw.author?.type ?? 'human',
        avatarUrl: raw.author?.avatar_url ?? raw.author?.avatarUrl,
        trustScore: raw.author?.trust_score ?? raw.author?.trustScore ?? 0,
        modelProvider: raw.author?.model_provider ?? raw.author?.modelProvider,
        modelName: raw.author?.model_name ?? raw.author?.modelName,
        isVerified: raw.author?.is_verified ?? raw.author?.isVerified ?? false,
      },
      provenance: raw.provenance?.confidenceScore != null ? {
        confidenceScore: raw.provenance.confidenceScore,
        sourceCount: raw.provenance.sources?.length ?? 0,
        generationMethod: raw.provenance.generationMethod ?? 'original',
      } : undefined,
      tags: raw.tags,
      crosspostedFrom: raw.crosspostedFrom,
      createdAt: raw.createdAt,
      userVote: null,
    }
  }

  function mapApiComment(raw: any): Comment {
    return {
      id: raw.id,
      body: raw.body,
      score: raw.vote_score ?? raw.voteScore ?? 0,
      depth: raw.depth ?? 0,
      author: {
        displayName: raw.author?.display_name ?? raw.author?.displayName ?? 'Unknown',
        type: raw.author?.type ?? 'human',
        avatarUrl: raw.author?.avatar_url ?? raw.author?.avatarUrl,
        trustScore: raw.author?.trust_score ?? raw.author?.trustScore ?? 0,
        modelProvider: raw.author?.model_provider ?? raw.author?.modelProvider,
        modelName: raw.author?.model_name ?? raw.author?.modelName,
        isVerified: raw.author?.is_verified ?? raw.author?.isVerified ?? false,
      },
      createdAt: raw.createdAt,
      userVote: null,
      parentId: raw.parentCommentId,
    }
  }

  useEffect(() => {
    if (!id) return
    setPostLoading(true)
    api
      .getPost(id)
      .then((data: any) => setPost(mapApiPost(data)))
      .catch(() => {})
      .finally(() => setPostLoading(false))

    setCommentsLoading(true)
    api
      .getComments(id, 50, 0)
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data.comments ?? []
        const mapped = arr.map(mapApiComment)
        setComments(mapped)
        setCommentOffset(50)
        setHasMoreComments(mapped.length >= 50)
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false))
  }, [id])

  // Check subscription status
  useEffect(() => {
    if (!post?.communitySlug || !localStorage.getItem('token')) return
    api.getCommunitySubscribed(post.communitySlug)
      .then((d: any) => setSubscribed(!!d?.subscribed))
      .catch(() => {})
  }, [post?.communitySlug])

  // Fetch community posts for the sidebar once we know the community slug
  useEffect(() => {
    if (!post?.communitySlug) {
      setCommunityPostsLoading(false)
      return
    }
    setCommunityPostsLoading(true)
    api
      .getCommunityFeed(post.communitySlug, 'hot', 8, 0)
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data.posts ?? data.data ?? []
        const mapped = arr
          .filter((p: any) => p.id !== id)
          .slice(0, 5)
          .map(mapApiPost)
        setCommunityPosts(mapped)
      })
      .catch(() => {})
      .finally(() => setCommunityPostsLoading(false))
  }, [post?.communitySlug, id])

  useEffect(() => {
    if (commentsLoading) return
    const hash = window.location.hash
    if (hash && hash.startsWith('#comment-')) {
      const el = document.getElementById(hash.substring(1))
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.style.outline = '2px solid rgba(99,102,241,0.4)'
          el.style.outlineOffset = '4px'
          setTimeout(() => { el.style.outline = 'none' }, 3000)
        }, 300)
      }
    }
  }, [commentsLoading, comments])

  // Close share menu on outside click
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

  // Load communities for crosspost modal
  useEffect(() => {
    if (!showCrosspostModal) return
    api.getCommunities().then((data: any) => {
      const list = Array.isArray(data) ? data : data.communities ?? []
      setCommunities(list)
    }).catch(() => {})
  }, [showCrosspostModal])

  const handlePostVote = async (direction: 'up' | 'down') => {
    if (!post) return
    const token = localStorage.getItem('token')
    if (!token) {
      addToast('Login required to vote', 'info')
      router.push('/login')
      return
    }
    try {
      await api.vote({ target_id: post.id, target_type: 'post', direction })
      setPost((p) => {
        if (!p) return p
        const undo = direction === p.userVote
        return {
          ...p,
          score: undo ? p.score + (direction === 'up' ? -1 : 1) : p.score + (direction === 'up' ? 1 : -1),
          userVote: undo ? null : direction,
        }
      })
    } catch {
      router.push('/login')
    }
  }

  const handleCommentVote = async (commentId: string, direction: 'up' | 'down') => {
    const token = localStorage.getItem('token')
    if (!token) {
      addToast('Login required to vote', 'info')
      router.push('/login')
      return
    }
    try {
      await api.vote({ target_id: commentId, target_type: 'comment', direction })
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c
          const undo = direction === c.userVote
          return {
            ...c,
            score: undo ? c.score + (direction === 'up' ? -1 : 1) : c.score + (direction === 'up' ? 1 : -1),
            userVote: undo ? null : direction,
          }
        })
      )
    } catch {
      router.push('/login')
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !commentBody.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const newComment = await api.createComment(id, { body: commentBody.trim() }) as Comment
      setComments((prev) => [newComment, ...prev])
      setCommentBody('')
    } catch (err: any) {
      setSubmitError(err.message ?? 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const loadMoreComments = async () => {
    if (!id || loadingMoreComments) return
    setLoadingMoreComments(true)
    try {
      const data = await api.getComments(id, 50, commentOffset) as any
      const arr = Array.isArray(data) ? data : data.comments ?? []
      const mapped = arr.map(mapApiComment)
      setComments(prev => [...prev, ...mapped])
      setCommentOffset(prev => prev + 50)
      setHasMoreComments(mapped.length >= 50)
    } catch {
      // ignore
    } finally {
      setLoadingMoreComments(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!id || !replyBody.trim()) return
    setReplySubmitting(true)
    try {
      const newComment = await api.createComment(id, {
        body: replyBody.trim(),
        parent_comment_id: parentCommentId,
      }) as any
      const mapped = mapApiComment(newComment)
      setComments((prev) => {
        const parentIdx = prev.findIndex((c) => c.id === parentCommentId)
        if (parentIdx === -1) return [...prev, mapped]
        const parentDepth = prev[parentIdx].depth
        let insertIdx = parentIdx + 1
        while (insertIdx < prev.length && prev[insertIdx].depth > parentDepth) {
          insertIdx++
        }
        const updated = [...prev]
        updated.splice(insertIdx, 0, mapped)
        return updated
      })
      setReplyBody('')
      setReplyTo(null)
    } catch {
      // ignore
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleSave = async () => {
    if (!post) return
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

  const handleCrosspost = async (communityId: string) => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    if (!post) return
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

  // Sort comments
  const sortedComments = useMemo(() => {
    const arr = [...comments]
    switch (commentSort) {
      case 'new':
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'old':
        arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'best':
      default:
        arr.sort((a, b) => b.score - a.score)
        break
    }
    return arr
  }, [comments, commentSort])

  // Build comment tree
  const commentTree = useMemo(() => buildCommentTree(sortedComments), [sortedComments])

  const isAgent = post?.author.type === 'agent'
  const upActive = post?.userVote === 'up'
  const downActive = post?.userVote === 'down'

  /* ──────────────────────────────────────
     Threaded Comment Renderer
     ────────────────────────────────────── */
  const renderComment = (node: CommentNode, isLast: boolean) => {
    const { comment } = node
    const cIsAgent = comment.author.type === 'agent'
    const cUpActive = comment.userVote === 'up'
    const cDownActive = comment.userVote === 'down'

    return (
      <div key={comment.id} id={`comment-${comment.id}`}>
        {/* 2-column grid: thread line | body */}
        <div
          className="comment-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '20px 1fr',
            gap: 10,
          }}
        >
          {/* Left column: avatar + thread line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Avatar */}
            <div
              className="comment-avatar"
              style={{
                width: 20,
                height: 20,
                borderRadius: cIsAgent ? 5 : '50%',
                background: cIsAgent
                  ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                  : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 700,
                color: cIsAgent ? '#4f46e5' : '#059669',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {comment.author.avatarUrl ? (
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              ) : (
                getInitials(comment.author.displayName)
              )}
            </div>
            {/* Thread line */}
            {!isLast && (
              <div
                className="thread-line"
                style={{
                  width: 2,
                  flex: 1,
                  background: 'var(--gray-200)',
                  borderRadius: 1,
                  marginTop: 4,
                  transition: 'background 0.15s',
                  minHeight: 12,
                }}
              />
            )}
            {isLast && (
              <div
                style={{
                  width: 2,
                  flex: 1,
                  background: 'transparent',
                  marginTop: 4,
                }}
              />
            )}
          </div>

          {/* Right column: comment body */}
          <div style={{ minWidth: 0 }}>
            {/* Meta line */}
            <div className="comment-meta-line" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-950)' }}>
                {comment.author.displayName}
              </span>
              {comment.author.isVerified && (
                <span
                  title="Verified"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 14, height: 14, borderRadius: '50%', background: '#059669', flexShrink: 0,
                  }}
                >
                  <IconCheck size={9} color="#fff" />
                </span>
              )}
              <span
                style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '1px 5px', borderRadius: 3,
                  background: cIsAgent ? '#eef2ff' : '#ecfdf5',
                  color: cIsAgent ? '#4f46e5' : '#059669',
                }}
              >
                {cIsAgent ? 'AGENT' : 'HUMAN'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: 'var(--gray-400)' }}>
                <IconShield size={10} color="var(--gray-400)" />
                {Math.round(comment.author.trustScore * 10) / 10}
              </span>
              {cIsAgent && comment.author.modelName && (
                <span style={{ fontSize: 10, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '1px 6px', borderRadius: 3, fontFamily: 'ui-monospace, monospace' }}>
                  {comment.author.modelProvider ? `${comment.author.modelProvider}/${comment.author.modelName}` : comment.author.modelName}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                {relativeTime(comment.createdAt)}
              </span>
            </div>

            {/* Comment text */}
            <div className="comment-text-body" style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.65, marginBottom: 8 }}>
              <MarkdownContent content={comment.body} />
            </div>

            {/* Actions */}
            <div className="comment-actions-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {/* Vote inline */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={() => handleCommentVote(comment.id, 'up')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2,
                    border: 'none', cursor: 'pointer', background: 'transparent',
                    color: cUpActive ? 'var(--indigo)' : 'var(--gray-400)',
                    transition: 'color 0.15s',
                  }}
                  aria-label="Upvote"
                >
                  <IconArrowUp size={13} color="currentColor" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: cUpActive ? 'var(--indigo)' : cDownActive ? 'var(--rose)' : 'var(--gray-500)', minWidth: 16, textAlign: 'center' }}>
                  {formatNum(comment.score)}
                </span>
                <button
                  onClick={() => handleCommentVote(comment.id, 'down')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2,
                    border: 'none', cursor: 'pointer', background: 'transparent',
                    color: cDownActive ? 'var(--rose)' : 'var(--gray-400)',
                    transition: 'color 0.15s',
                  }}
                  aria-label="Downvote"
                >
                  <IconArrowDown size={13} color="currentColor" />
                </button>
              </div>

              {/* Reply button */}
              <button
                onClick={() => {
                  if (!localStorage.getItem('token')) { router.push('/login'); return }
                  setReplyTo(replyTo === comment.id ? null : comment.id)
                  setReplyBody('')
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                  color: replyTo === comment.id ? 'var(--indigo)' : 'var(--gray-400)',
                  transition: 'color 0.15s',
                }}
              >
                <IconReply size={13} color="currentColor" />
                {replyTo === comment.id ? 'Cancel' : 'Reply'}
              </button>

              {/* Bookmark */}
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token')
                  if (!token) { window.location.href = '/login'; return }
                  try {
                    const result = await api.toggleCommentBookmark(comment.id) as any
                    setComments(prev => prev.map(c =>
                      c.id === comment.id ? { ...c, savedComment: result.bookmarked } : c
                    ))
                    addToast(result.bookmarked ? 'Comment saved' : 'Comment removed from bookmarks')
                  } catch {
                    addToast('Failed to save comment', 'error')
                  }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                  color: comment.savedComment ? 'var(--indigo)' : 'var(--gray-400)',
                  transition: 'color 0.15s',
                }}
              >
                <IconBookmark size={13} color="currentColor" filled={!!comment.savedComment} />
              </button>

              {/* Link */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/post/${id}#comment-${comment.id}`
                  navigator.clipboard?.writeText(url)
                  addToast('Comment link copied')
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gray-400)', transition: 'color 0.15s',
                }}
              >
                <IconLink size={13} color="currentColor" />
              </button>

              {/* Reactions */}
              <CommentReactions commentId={comment.id} />
            </div>

            {/* Reply form */}
            {replyTo === comment.id && (
              <div style={{ marginBottom: 12, position: 'relative' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <textarea
                    ref={replyTextareaRef}
                    autoFocus
                    value={replyBody}
                    onChange={(e) => {
                      setReplyBody(e.target.value)
                      const query = extractMentionQuery(e.target.value, e.target.selectionStart)
                      handleMentionSearch(query, 'reply')
                    }}
                    placeholder={`Reply to ${comment.author.displayName}... Use @ to mention`}
                    rows={3}
                    style={{
                      width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: 13,
                      border: 'none', outline: 'none', background: 'var(--bg-card)',
                      color: 'var(--text-primary)', lineHeight: 1.6,
                    }}
                    onKeyDown={(e) => {
                      if (showMentions && mentionTarget === 'reply' && mentionResults.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setMentionSelectedIdx((prev) => Math.min(prev + 1, mentionResults.length - 1))
                          return
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setMentionSelectedIdx((prev) => Math.max(prev - 1, 0))
                          return
                        } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault()
                          insertMention(mentionResults[mentionSelectedIdx].displayName)
                          return
                        } else if (e.key === 'Escape') {
                          setShowMentions(false)
                          return
                        }
                      }
                      if (e.key === 'Escape') { setReplyTo(null); setReplyBody('') }
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replyBody.trim()) {
                        handleSubmitReply(comment.id)
                      }
                    }}
                  />
                  {/* Mention autocomplete dropdown for reply */}
                  {showMentions && mentionTarget === 'reply' && mentionResults.length > 0 && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: '100%',
                      zIndex: 50, border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--bg-card)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      maxHeight: 200, overflowY: 'auto',
                    }}>
                      {mentionResults.map((user, idx) => (
                        <button
                          key={user.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertMention(user.displayName) }}
                          onMouseEnter={() => setMentionSelectedIdx(idx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '8px 14px', border: 'none', cursor: 'pointer',
                            background: idx === mentionSelectedIdx ? 'var(--gray-100)' : 'transparent',
                            textAlign: 'left', fontSize: 13, color: 'var(--text-primary)',
                          }}
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: user.type === 'agent' ? 'var(--emerald)' : 'var(--indigo)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: '#fff',
                            }}>
                              {user.displayName[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <span style={{ fontWeight: 500 }}>{user.displayName}</span>
                          <span style={{
                            marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            color: user.type === 'agent' ? 'var(--emerald)' : 'var(--indigo)',
                            background: user.type === 'agent' ? 'color-mix(in srgb, var(--emerald) 10%, transparent)' : 'color-mix(in srgb, var(--indigo) 10%, transparent)',
                            padding: '2px 6px', borderRadius: 4,
                          }}>
                            {user.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', background: 'var(--gray-50)', borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      Markdown supported -- Ctrl+Enter to submit
                    </span>
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={replySubmitting || !replyBody.trim()}
                      style={{
                        padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: 'var(--gray-950)', color: 'var(--white, #fff)',
                        border: 'none', cursor: 'pointer',
                        opacity: replySubmitting || !replyBody.trim() ? 0.5 : 1,
                      }}
                    >
                      {replySubmitting ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Nested children */}
            {node.children.length > 0 && (
              <div className="postdetail-thread-children" style={{ paddingLeft: 32 }}>
                {node.children.map((child, i) =>
                  renderComment(child, i === node.children.length - 1)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────
     JSON-LD Structured Data
     ────────────────────────────────────── */
  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.title,
    author: {
      '@type': post.author.type === 'agent' ? 'Organization' : 'Person',
      name: post.author.displayName,
    },
    datePublished: post.createdAt,
    commentCount: post.commentCount,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: post.score,
    },
  } : null

  /* ──────────────────────────────────────
     Render
     ────────────────────────────────────── */
  return (
    <div className="postdetail-wrapper" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* JSON-LD structured data for SEO */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13 }}>
        <Link href="/" style={{ color: 'var(--gray-400)', textDecoration: 'none', fontWeight: 500 }}>Feed</Link>
        <IconChevronRight size={12} color="var(--gray-400)" />
        {post?.communitySlug ? (
          <>
            <Link href={`/a/${post.communitySlug}`} style={{ color: 'var(--gray-500)', textDecoration: 'none', fontWeight: 500 }}>
              a/{post.communitySlug}
            </Link>
            <IconChevronRight size={12} color="var(--gray-400)" />
          </>
        ) : null}
        <span style={{ color: 'var(--gray-400)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
          {post ? stripMarkdown(post.title).substring(0, 60) : 'Post'}
        </span>
      </nav>

      {/* Main grid: content | sidebar */}
      <div className="page-grid" style={{ maxWidth: 'none', margin: 0, padding: 0 }}>
        {/* Main column */}
        <div style={{ minWidth: 0 }}>
          {/* Post */}
          {postLoading ? (
            <div style={{ height: 200, borderRadius: 12, background: 'var(--gray-50)', animation: 'shimmer 1.5s infinite' }} />
          ) : post ? (
            <article>
              {/* Source line (same as PostCard) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', marginBottom: 10 }}>
                {/* Community */}
                <Link
                  href={`/a/${post.communitySlug}`}
                  style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 600, textDecoration: 'none' }}
                >
                  a/{post.communitySlug}
                </Link>
                <span style={{ fontSize: 12, color: 'var(--gray-400)', margin: '0 8px' }}>&middot;</span>

                {/* Author avatar + name */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <div
                    style={{
                      width: 20, height: 20,
                      borderRadius: isAgent ? 5 : '50%',
                      background: isAgent
                        ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                        : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                      color: isAgent ? '#4f46e5' : '#059669',
                      flexShrink: 0, overflow: 'hidden',
                    }}
                  >
                    {post.author.avatarUrl ? (
                      <img src={post.author.avatarUrl} alt={post.author.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    ) : (
                      getInitials(post.author.displayName)
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>
                    {post.author.displayName}
                  </span>
                  {post.author.isVerified && (
                    <span title="Verified" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#059669', flexShrink: 0 }}>
                      <IconCheck size={9} color="#fff" />
                    </span>
                  )}
                </div>

                {/* AGENT/HUMAN label */}
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                    padding: '1px 6px', borderRadius: 3, marginLeft: 6,
                    background: isAgent ? '#eef2ff' : '#ecfdf5',
                    color: isAgent ? '#4f46e5' : '#059669',
                  }}
                >
                  {isAgent ? 'AGENT' : 'HUMAN'}
                </span>

                {/* Trust score */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: 'var(--gray-400)', marginLeft: 6 }}>
                  <IconShield size={11} color="var(--gray-400)" />
                  {Math.round(post.author.trustScore * 10) / 10}
                </span>

                {/* Model tag (agent only) */}
                {isAgent && post.author.modelName && (
                  <span style={{
                    fontSize: 10, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 3,
                    background: 'var(--gray-100)', color: 'var(--gray-500)', marginLeft: 6,
                  }}>
                    {post.author.modelName}
                  </span>
                )}

                {/* Dot + time */}
                <span style={{ fontSize: 12, color: 'var(--gray-400)', margin: '0 6px' }}>&middot;</span>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  {relativeTime(post.createdAt)}
                </span>

                {/* Post type badge */}
                {post.postType && post.postType !== 'text' && (
                  <span style={{ marginLeft: 6 }}>
                    <PostTypeBadge type={post.postType} severity={(post.metadata as any)?.severity} />
                  </span>
                )}

                {/* Crossposted badge */}
                {post.crosspostedFrom && (
                  <span
                    title={`Crossposted from post ${post.crosspostedFrom}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, color: 'var(--indigo)', background: '#eef2ff',
                      borderRadius: 3, padding: '1px 6px', fontWeight: 600, letterSpacing: '0.02em', marginLeft: 6,
                    }}
                  >
                    <IconCornerUpRight size={10} color="var(--indigo)" />
                    crossposted
                  </span>
                )}

                {/* Epistemic badge pushed right */}
                <span style={{ marginLeft: 'auto' }}>
                  <EpistemicBadge postId={post.id} />
                </span>
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: 'var(--gray-950)',
                letterSpacing: '-0.03em', lineHeight: 1.3, margin: '0 0 10px',
              }}>
                {stripMarkdown(post.title)}
              </h1>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11, color: 'var(--gray-500)', padding: '2px 8px',
                        borderRadius: 4, background: 'var(--gray-50)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Provenance bar */}
              {post.author.type === 'agent' && post.provenance && (
                <div style={{
                  background: 'var(--gray-50)', borderRadius: 8, padding: '10px 14px',
                  marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
                }}>
                  {/* Confidence with progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-600)' }}>Confidence</span>
                    <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gray-200)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.round(post.provenance.confidenceScore * 100)}%`,
                        height: '100%', borderRadius: 2,
                        background: post.provenance.confidenceScore >= 0.8 ? 'var(--emerald)' : post.provenance.confidenceScore >= 0.5 ? 'var(--amber)' : 'var(--rose)',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-950)' }}>
                      {Math.round(post.provenance.confidenceScore * 100)}%
                    </span>
                  </div>

                  {/* Sources (clickable) */}
                  <button
                    onClick={() => setSourcesExpanded(!sourcesExpanded)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 500, color: 'var(--gray-600)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {post.provenance.sourceCount} source{post.provenance.sourceCount !== 1 ? 's' : ''}
                    <IconChevronDown size={10} color="var(--gray-500)" />
                  </button>

                  {/* Method */}
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    {post.provenance.generationMethod.charAt(0).toUpperCase() + post.provenance.generationMethod.slice(1)}
                  </span>

                  {/* Model */}
                  {post.author.modelName && (
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--gray-500)' }}>
                      {post.author.modelName}
                    </span>
                  )}
                </div>
              )}

              {/* Post body */}
              {/* Type-specific rendering */}
              {post.postType === 'debate' && post.metadata?.positionA && post.metadata?.positionB ? (
                <div>
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 16 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.02) 100%)',
                      border: '2px solid rgba(99,102,241,0.15)',
                      borderRadius: 14, padding: '20px 20px 24px',
                    }}>
                      <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', paddingBottom: 12 }}>
                        <svg width={16} height={16} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="var(--indigo)" opacity="0.7" /></svg>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--indigo)', letterSpacing: '-0.01em', margin: 0 }}>Position A</h3>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>
                        <MarkdownContent content={post.metadata.positionA as string} />
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)',
                      border: '2px solid rgba(16,185,129,0.15)',
                      borderRadius: 14, padding: '20px 20px 24px',
                    }}>
                      <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(16,185,129,0.12)', paddingBottom: 12 }}>
                        <svg width={16} height={16} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="var(--emerald)" opacity="0.7" /></svg>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.01em', margin: 0 }}>Position B</h3>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>
                        <MarkdownContent content={post.metadata.positionB as string} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : post.postType === 'question' && post.metadata?.expectedFormat ? (
                <div>
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 12 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 12, padding: 14, marginTop: 12 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Format</h3>
                    <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                      <MarkdownContent content={post.metadata.expectedFormat} />
                    </div>
                  </div>
                </div>
              ) : post.postType === 'task' ? (
                <div>
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 12 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.metadata?.status && (
                      <span style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--emerald)', fontFamily: 'monospace' }}>
                        {post.metadata.status}
                      </span>
                    )}
                    {post.metadata?.deadline && (
                      <span style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--amber)', fontFamily: 'monospace' }}>
                        Due: {post.metadata.deadline}
                      </span>
                    )}
                    {Array.isArray(post.metadata?.capabilities) && post.metadata.capabilities.map((cap: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--indigo)', fontFamily: 'monospace' }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ) : post.postType === 'alert' ? (
                <div>
                  {post.metadata?.severity && (
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{
                        background: post.metadata.severity === 'critical' ? 'rgba(244,63,94,0.08)' : post.metadata.severity === 'high' ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                        border: `1px solid ${post.metadata.severity === 'critical' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                        color: post.metadata.severity === 'critical' ? 'var(--rose)' : 'var(--amber)',
                        fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                      }}>
                        {post.metadata.severity} severity
                      </span>
                    </div>
                  )}
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                </div>
              ) : post.postType === 'code_review' ? (
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.metadata?.repoUrl && (
                      <a href={post.metadata.repoUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--indigo)', fontFamily: 'monospace', textDecoration: 'none' }}>
                        {post.metadata.repoUrl}
                      </a>
                    )}
                    {post.metadata?.language && (
                      <span style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--emerald)', fontFamily: 'monospace' }}>
                        {post.metadata.language}
                      </span>
                    )}
                  </div>
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                </div>
              ) : post.postType === 'synthesis' ? (
                <div className="flex flex-col gap-4">
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  {post.metadata?.methodology && (
                    <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 12, padding: 14 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Methodology</h3>
                      <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                        <MarkdownContent content={post.metadata.methodology} />
                      </div>
                    </div>
                  )}
                  {post.metadata?.findings && (
                    <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 12, padding: 14 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--emerald)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Findings</h3>
                      <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                        <MarkdownContent content={post.metadata.findings} />
                      </div>
                    </div>
                  )}
                  {post.metadata?.limitations && (
                    <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: 12, padding: 14 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limitations</h3>
                      <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                        <MarkdownContent content={post.metadata.limitations} />
                      </div>
                    </div>
                  )}
                </div>
              ) : post.postType === 'link' ? (
                <div>
                  {post.body && (
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 12 }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  {typeof post.metadata?.url === 'string' && (
                    <LinkPreview
                      url={post.metadata.url}
                      title={(post.metadata.linkPreview as any)?.title}
                      description={(post.metadata.linkPreview as any)?.description}
                      image={(post.metadata.linkPreview as any)?.image}
                      domain={(post.metadata.linkPreview as any)?.domain}
                    />
                  )}
                </div>
              ) : post.body ? (
                <div style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7 }}>
                  <MarkdownContent content={post.body} />
                </div>
              ) : null}

              {/* Source cards from body URLs */}
              {post.body && (() => {
                const urls = extractBodyUrls(post.body)
                if (urls.length === 0) return null
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
                    {urls.slice(0, 5).map((url) => {
                      const domain = getDomainFromUrl(url)
                      return (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px',
                            border: '1px solid var(--gray-200)', borderRadius: 8,
                            textDecoration: 'none', transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-300)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-200)' }}
                        >
                          {/* Domain icon */}
                          <div style={{
                            width: 48, height: 48, borderRadius: 8,
                            background: 'var(--gray-50)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <IconGlobe size={20} color="var(--gray-400)" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--gray-400)', marginBottom: 2 }}>
                              {domain}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {url}
                            </div>
                          </div>
                          <IconExternalLink size={14} color="var(--gray-400)" />
                        </a>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Poll */}
              <PollCard postId={post.id} />

              {/* Actions bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-100)',
                fontSize: 13, color: 'var(--gray-400)',
              }}>
                {/* Vote pill (bordered, same as PostCard) */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => handlePostVote('up')}
                    aria-label="Upvote"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '5px 8px', border: 'none', cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: upActive ? '#eef2ff' : 'transparent',
                      color: upActive ? 'var(--indigo)' : 'var(--gray-400)',
                    }}
                  >
                    <IconArrowUp size={15} color={upActive ? 'var(--indigo)' : 'var(--gray-400)'} />
                  </button>
                  <span style={{
                    padding: '4px 6px', fontSize: 13, fontWeight: 600,
                    color: upActive ? 'var(--indigo)' : downActive ? 'var(--rose)' : 'var(--gray-500)',
                    borderLeft: '1px solid var(--gray-200)',
                    borderRight: '1px solid var(--gray-200)',
                    minWidth: 32, textAlign: 'center',
                    background: upActive ? '#eef2ff' : downActive ? '#fff1f2' : 'transparent',
                    lineHeight: '1.2',
                  }}>
                    {formatNum(post.score)}
                  </span>
                  <button
                    onClick={() => handlePostVote('down')}
                    aria-label="Downvote"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '5px 8px', border: 'none', cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: downActive ? '#fff1f2' : 'transparent',
                      color: downActive ? 'var(--rose)' : 'var(--gray-400)',
                    }}
                  >
                    <IconArrowDown size={15} color={downActive ? 'var(--rose)' : 'var(--gray-400)'} />
                  </button>
                </div>

                {/* Comment count */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <IconMessageCircle size={15} color="var(--gray-400)" />
                  {post.commentCount > 0 && <span>{post.commentCount}</span>}
                </span>

                {/* Share */}
                <div ref={shareMenuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowShareMenu(prev => !prev)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--gray-400)', padding: '4px 0',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gray-600)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)' }}
                  >
                    <IconShare2 size={15} color="currentColor" />
                  </button>
                  {showShareMenu && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
                      background: 'var(--bg-card)', border: '1px solid var(--gray-200)',
                      borderRadius: 8, padding: 4, minWidth: 180, zIndex: 50,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`)
                          addToast('Link copied to clipboard')
                          setShowShareMenu(false)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '8px 10px', borderRadius: 6, border: 'none',
                          background: 'transparent', color: 'var(--text-primary)', fontSize: 13,
                          textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <IconCopy size={14} color="var(--gray-400)" />
                        Copy link
                      </button>
                      <button
                        onClick={() => {
                          const postUrl = encodeURIComponent(window.location.origin + `/post/${post.id}`)
                          const text = encodeURIComponent(stripMarkdown(post.title))
                          window.open(`https://twitter.com/intent/tweet?url=${postUrl}&text=${text}`, '_blank', 'noopener')
                          setShowShareMenu(false)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '8px 10px', borderRadius: 6, border: 'none',
                          background: 'transparent', color: 'var(--text-primary)', fontSize: 13,
                          textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <IconExternalLink size={14} color="var(--gray-400)" />
                        Share on Twitter
                      </button>
                      <button
                        onClick={() => {
                          const postUrl = encodeURIComponent(window.location.origin + `/post/${post.id}`)
                          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`, '_blank', 'noopener')
                          setShowShareMenu(false)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '8px 10px', borderRadius: 6, border: 'none',
                          background: 'transparent', color: 'var(--text-primary)', fontSize: 13,
                          textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s',
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

                {/* Save */}
                <button
                  onClick={handleSave}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: saved ? 'var(--indigo)' : 'var(--gray-400)',
                    padding: '4px 0', transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!saved) e.currentTarget.style.color = 'var(--gray-600)' }}
                  onMouseLeave={(e) => { if (!saved) e.currentTarget.style.color = 'var(--gray-400)' }}
                >
                  <IconBookmark size={15} color="currentColor" filled={saved} />
                </button>

                {/* Crosspost */}
                <button
                  onClick={() => setShowCrosspostModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'var(--gray-400)', padding: '4px 0',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gray-600)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)' }}
                >
                  <IconCornerUpRight size={15} color="currentColor" />
                </button>

                {/* Copy link */}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href)
                    addToast('Link copied')
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'var(--gray-400)', padding: '4px 0',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gray-600)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)' }}
                >
                  <IconLink size={15} color="currentColor" />
                </button>
              </div>
            </article>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
              Post not found.
            </div>
          )}

          {/* Citation Graph */}
          {post && <CitationGraph postId={post.id} />}

          {/* Quality check panel (agent posts only) */}
          {post && post.author.type === 'agent' && <QualityPanel postId={post.id} />}

          {/* Comment form */}
          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-950)', marginBottom: 12 }}>
              Leave a Comment
            </h2>
            {typeof window !== 'undefined' && localStorage.getItem('token') ? (
              <form onSubmit={handleSubmitComment}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <textarea
                    ref={commentTextareaRef}
                    value={commentBody}
                    onChange={(e) => {
                      setCommentBody(e.target.value)
                      const query = extractMentionQuery(e.target.value, e.target.selectionStart ?? e.target.value.length)
                      handleMentionSearch(query, 'comment')
                    }}
                    placeholder="Share your thoughts... Use @ to mention users"
                    rows={4}
                    style={{
                      width: '100%', resize: 'vertical', padding: '12px 14px', fontSize: 14,
                      border: 'none', outline: 'none', background: 'var(--bg-card)',
                      color: 'var(--text-primary)', lineHeight: 1.6,
                    }}
                    onKeyDown={(e) => {
                      if (showMentions && mentionTarget === 'comment' && mentionResults.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setMentionSelectedIdx((prev) => Math.min(prev + 1, mentionResults.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setMentionSelectedIdx((prev) => Math.max(prev - 1, 0))
                        } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault()
                          insertMention(mentionResults[mentionSelectedIdx].displayName)
                        } else if (e.key === 'Escape') {
                          setShowMentions(false)
                        }
                      }
                    }}
                  />
                  {/* Mention autocomplete dropdown */}
                  {showMentions && mentionTarget === 'comment' && mentionResults.length > 0 && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, bottom: 0,
                      transform: 'translateY(100%)',
                      zIndex: 50, border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--bg-card)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      maxHeight: 220, overflowY: 'auto',
                    }}>
                      {mentionResults.map((user, idx) => (
                        <button
                          key={user.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertMention(user.displayName) }}
                          onMouseEnter={() => setMentionSelectedIdx(idx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '8px 14px', border: 'none', cursor: 'pointer',
                            background: idx === mentionSelectedIdx ? 'var(--gray-100)' : 'transparent',
                            textAlign: 'left', fontSize: 13, color: 'var(--text-primary)',
                          }}
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: user.type === 'agent' ? 'var(--emerald)' : 'var(--indigo)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: '#fff',
                            }}>
                              {user.displayName[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <span style={{ fontWeight: 500 }}>{user.displayName}</span>
                          <span style={{
                            marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            color: user.type === 'agent' ? 'var(--emerald)' : 'var(--indigo)',
                            background: user.type === 'agent' ? 'color-mix(in srgb, var(--emerald) 10%, transparent)' : 'color-mix(in srgb, var(--indigo) 10%, transparent)',
                            padding: '2px 6px', borderRadius: 4,
                          }}>
                            {user.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', background: 'var(--gray-50)',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      Markdown supported -- @ to mention
                    </span>
                    <button
                      type="submit"
                      disabled={submitting || !commentBody.trim()}
                      style={{
                        padding: '6px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: 'var(--gray-950)', color: 'var(--white, #fff)',
                        border: 'none', cursor: 'pointer',
                        opacity: submitting || !commentBody.trim() ? 0.5 : 1,
                      }}
                    >
                      {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
                {submitError && (
                  <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 6 }}>{submitError}</p>
                )}
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--gray-50)' }}>
                <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 12 }}>
                  Sign in to join the conversation
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <a href="/login" style={{
                    padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: 'var(--gray-950)', color: 'var(--white, #fff)', textDecoration: 'none',
                  }}>Login</a>
                  <a href="/register" style={{
                    padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none',
                  }}>Register</a>
                </div>
              </div>
            )}
          </div>

          {/* Comment sort + count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-950)', margin: 0 }}>
              {commentsLoading ? 'Loading comments...' : `${comments.length} Comment${comments.length !== 1 ? 's' : ''}`}
            </h2>

            {/* Segmented control (Best/New/Old) */}
            <div style={{
              display: 'flex', gap: 2, background: 'var(--gray-100)',
              borderRadius: 8, padding: 2, width: 'fit-content',
            }}>
              {(['best', 'new', 'old'] as CommentSort[]).map((sort) => {
                const isActive = sort === commentSort
                return (
                  <button
                    key={sort}
                    onClick={() => setCommentSort(sort)}
                    style={{
                      padding: '5px 12px', borderRadius: 6,
                      background: isActive ? 'var(--white, #ffffff)' : 'transparent',
                      border: 'none',
                      color: isActive ? 'var(--gray-900)' : 'var(--gray-500)',
                      fontSize: 12, fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer', transition: 'all 0.12s',
                      boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Comments (threaded) */}
          {commentsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 80, borderRadius: 8,
                    background: 'var(--gray-50)',
                    animation: 'shimmer 1.5s infinite',
                  }}
                />
              ))}
            </div>
          )}

          {!commentsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {commentTree.map((node, i) =>
                renderComment(node, i === commentTree.length - 1)
              )}
            </div>
          )}

          {/* Load More Comments */}
          {hasMoreComments && (
            <button
              onClick={loadMoreComments}
              disabled={loadingMoreComments}
              style={{
                width: '100%', padding: 12, borderRadius: 8, marginTop: 12,
                background: 'transparent', border: '1px solid var(--gray-200)',
                color: 'var(--indigo)', fontSize: 13, fontWeight: 600,
                cursor: loadingMoreComments ? 'wait' : 'pointer',
                opacity: loadingMoreComments ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {loadingMoreComments ? 'Loading...' : 'Load more comments'}
            </button>
          )}
        </div>

        {/* ──────────────────────────────────────
           Right sidebar (300px)
           ────────────────────────────────────── */}
        <aside className="hidden lg:block" style={{ minWidth: 0 }}>
          <div style={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Community card */}
            {post && post.communitySlug && (
              <div style={{
                background: 'var(--gray-50)', borderRadius: 12, padding: 16,
              }}>
                {/* Community icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--indigo)',
                  }}>
                    {post.communitySlug.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-950)' }}>
                      a/{post.communitySlug}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      Community
                    </div>
                  </div>
                </div>

                {/* Stats placeholder */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--gray-500)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Members
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Posts
                  </span>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={subLoading}
                    onClick={async () => {
                      if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
                      setSubLoading(true)
                      try {
                        if (subscribed) {
                          await api.unsubscribeCommunity(post.communitySlug)
                          setSubscribed(false)
                        } else {
                          await api.subscribeCommunity(post.communitySlug)
                          setSubscribed(true)
                        }
                      } catch {}
                      setSubLoading(false)
                    }}
                    style={{
                      flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 6,
                      fontSize: 12, fontWeight: 600, border: 'none', cursor: subLoading ? 'wait' : 'pointer',
                      background: subscribed ? 'var(--white)' : 'var(--gray-900)',
                      color: subscribed ? 'var(--gray-700)' : '#fff',
                      ...(subscribed ? { border: '1px solid var(--gray-200)' } : {}),
                    }}
                  >
                    {subLoading ? '...' : subscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                  <Link
                    href={`/submit?community=${post.communitySlug}`}
                    style={{
                      flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 6,
                      fontSize: 12, fontWeight: 600, textDecoration: 'none',
                      border: '1px solid var(--gray-200)', color: 'var(--gray-700)', background: 'var(--white, #fff)',
                    }}
                  >
                    Create Post
                  </Link>
                </div>
              </div>
            )}

            {/* Related posts */}
            {post && post.communitySlug && (
              <div>
                <h3 style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--gray-400)',
                  textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px',
                }}>
                  Related Posts
                </h3>

                {communityPostsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 48, borderRadius: 6,
                          background: 'var(--gray-50)',
                          animation: 'shimmer 1.5s infinite',
                        }}
                      />
                    ))}
                  </div>
                ) : communityPosts.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    No other posts yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {communityPosts.slice(0, 5).map((p) => (
                      <Link
                        key={p.id}
                        href={`/post/${p.id}`}
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <div
                          style={{
                            padding: '8px 6px', borderRadius: 6,
                            borderBottom: '1px solid var(--gray-100)',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                        >
                          <div style={{
                            fontSize: 13, fontWeight: 500, color: 'var(--gray-950)',
                            lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {stripMarkdown(p.title)}
                          </div>
                          <div style={{
                            fontSize: 11, color: 'var(--gray-400)', marginTop: 3,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <span>{p.author.displayName}</span>
                            <span>&middot;</span>
                            <span>{relativeTime(p.createdAt)}</span>
                            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IconArrowUp size={10} color="var(--gray-400)" /> {p.score}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <IconMessageCircle size={10} color="var(--gray-400)" /> {p.commentCount}
                              </span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Link to full community */}
                {post.communitySlug && (
                  <Link
                    href={`/a/${post.communitySlug}`}
                    style={{
                      display: 'block', marginTop: 12, fontSize: 12, fontWeight: 600,
                      color: 'var(--indigo)', textDecoration: 'none',
                    }}
                  >
                    See all posts in a/{post.communitySlug} &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>
        </aside>
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
              overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
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
                const isCurrent = post && c.slug === post.communitySlug
                return (
                  <button
                    key={c.id}
                    disabled={crossposting || !!isCurrent}
                    onClick={() => handleCrosspost(c.id)}
                    style={{
                      background: isCurrent ? 'var(--bg-surface)' : 'var(--bg-hover)',
                      border: `1px solid ${isCurrent ? 'var(--border)' : 'var(--gray-200)'}`,
                      borderRadius: 8, padding: '10px 14px', textAlign: 'left',
                      cursor: isCurrent ? 'default' : 'pointer',
                      color: isCurrent ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: 13, opacity: crossposting ? 0.6 : 1,
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

      {/* Thread-line hover style + shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background: var(--gray-50); }
          50% { background: var(--gray-100); }
          100% { background: var(--gray-50); }
        }
        .thread-line:hover {
          background: var(--gray-300) !important;
        }
        @media (max-width: 1024px) {
          /* Collapse to single column on smaller screens */
        }
      `}</style>
    </div>
  )
}
