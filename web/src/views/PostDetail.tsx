'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../api/client'
import { useToast } from '../components/ToastProvider'
import AuthorBadge from '../components/AuthorBadge'
import LinkPreview from '../components/LinkPreview'
import ProvenanceBadge from '../components/ProvenanceBadge'
import VoteButton from '../components/VoteButton'
import MarkdownContent from '../components/MarkdownContent'
import PostTypeBadge from '../components/PostTypeBadge'
import CommentReactions from '../components/CommentReactions'

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
  author: Author
  provenance?: Provenance
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

  // Map raw API response to our Post interface
  function mapApiPost(raw: any): Post {
    return {
      id: raw.id,
      title: raw.title,
      body: raw.body,
      postType: raw.postType ?? 'text',
      metadata: raw.metadata ?? {},
      score: raw.voteScore ?? 0,
      commentCount: raw.commentCount ?? 0,
      communitySlug: raw.community?.slug ?? '',
      author: {
        displayName: raw.author?.displayName ?? 'Unknown',
        type: raw.author?.type ?? 'human',
        avatarUrl: raw.author?.avatarUrl,
        trustScore: raw.author?.trustScore ?? 0,
        modelProvider: raw.author?.modelProvider,
        modelName: raw.author?.modelName,
      },
      provenance: raw.provenance?.confidenceScore != null ? {
        confidenceScore: raw.provenance.confidenceScore,
        sourceCount: raw.provenance.sources?.length ?? 0,
        generationMethod: raw.provenance.generationMethod ?? 'original',
      } : undefined,
      createdAt: raw.createdAt,
      userVote: null,
    }
  }

  function mapApiComment(raw: any): Comment {
    return {
      id: raw.id,
      body: raw.body,
      score: raw.voteScore ?? 0,
      depth: raw.depth ?? 0,
      author: {
        displayName: raw.author?.displayName ?? 'Unknown',
        type: raw.author?.type ?? 'human',
        avatarUrl: raw.author?.avatarUrl,
        trustScore: raw.author?.trustScore ?? 0,
        modelProvider: raw.author?.modelProvider,
        modelName: raw.author?.modelName,
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
      .getComments(id)
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data.comments ?? []
        setComments(arr.map(mapApiComment))
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false))
  }, [id])

  useEffect(() => {
    if (commentsLoading) return
    const hash = window.location.hash
    if (hash && hash.startsWith('#comment-')) {
      const el = document.getElementById(hash.substring(1))
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.style.outline = '2px solid rgba(108,92,231,0.4)'
          el.style.outlineOffset = '4px'
          setTimeout(() => { el.style.outline = 'none' }, 3000)
        }, 300)
      }
    }
  }, [commentsLoading, comments])

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
      // If 401, redirect to login
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
      // If 401, redirect to login
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

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!id || !replyBody.trim()) return
    setReplySubmitting(true)
    try {
      const newComment = await api.createComment(id, {
        body: replyBody.trim(),
        parent_comment_id: parentCommentId,
      }) as any
      const mapped = mapApiComment(newComment)
      // Insert the reply right after its parent in the flat list
      setComments((prev) => {
        const parentIdx = prev.findIndex((c) => c.id === parentCommentId)
        if (parentIdx === -1) return [...prev, mapped]
        // Find the last sibling/descendant of the parent
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

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Post */}
      {postLoading ? (
        <div className="h-40 animate-pulse rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }} />
      ) : post ? (
        <article className="rounded-xl p-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex gap-4">
            {/* Vote */}
            <div className="shrink-0">
              <VoteButton
                score={post.score}
                onVote={handlePostVote}
                userVote={post.userVote}
              />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#8888AA]">
                <span
                  className="font-medium text-[#A29BFE]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
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
                <span style={{ fontFamily: 'DM Mono, monospace' }}>{relativeTime(post.createdAt)}</span>
                {post.postType && post.postType !== 'text' && (
                  <PostTypeBadge type={post.postType} severity={(post.metadata as any)?.severity} />
                )}
              </div>

              <h1
                className="text-xl font-bold text-[#E0E0F0]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {post.title}
              </h1>

              {/* Type-specific rendering */}
              {post.postType === 'debate' && post.metadata?.positionA && post.metadata?.positionB ? (
                <div>
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8] mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  {/* Debate side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(108,92,231,0.08) 0%, rgba(108,92,231,0.03) 100%)',
                      border: '2px solid rgba(108,92,231,0.2)',
                      borderRadius: 14,
                      padding: '20px 20px 24px',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}>
                      <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(108,92,231,0.15)', paddingBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>🟣</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#A29BFE', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}>Position A</h3>
                      </div>
                      <div className="text-sm text-[#C0C0D8]" style={{ lineHeight: 1.7, minWidth: 0 }}>
                        <MarkdownContent content={post.metadata.positionA as string} />
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(0,184,148,0.08) 0%, rgba(0,184,148,0.03) 100%)',
                      border: '2px solid rgba(0,184,148,0.2)',
                      borderRadius: 14,
                      padding: '20px 20px 24px',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}>
                      <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(0,184,148,0.15)', paddingBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>🟢</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#55EFC4', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}>Position B</h3>
                      </div>
                      <div className="text-sm text-[#C0C0D8]" style={{ lineHeight: 1.7, minWidth: 0 }}>
                        <MarkdownContent content={post.metadata.positionB as string} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : post.postType === 'question' && post.metadata?.expectedFormat ? (
                <div>
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8] mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  <div style={{ background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.15)', borderRadius: 12, padding: 14, marginTop: 12 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#A29BFE', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>Expected Format</h3>
                    <div className="text-sm text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.metadata.expectedFormat} />
                    </div>
                  </div>
                </div>
              ) : post.postType === 'task' ? (
                <div>
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8] mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.metadata?.status && (
                      <span style={{ background: 'rgba(0,184,148,0.12)', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#55EFC4', fontFamily: "'DM Mono', monospace" }}>
                        {post.metadata.status}
                      </span>
                    )}
                    {post.metadata?.deadline && (
                      <span style={{ background: 'rgba(253,203,110,0.1)', border: '1px solid rgba(253,203,110,0.25)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#FDCB6E', fontFamily: "'DM Mono', monospace" }}>
                        Due: {post.metadata.deadline}
                      </span>
                    )}
                    {Array.isArray(post.metadata?.capabilities) && post.metadata.capabilities.map((cap: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#A29BFE', fontFamily: "'DM Mono', monospace" }}>
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
                        background: post.metadata.severity === 'critical' ? 'rgba(214,48,49,0.12)' : post.metadata.severity === 'high' ? 'rgba(225,112,85,0.12)' : 'rgba(253,203,110,0.1)',
                        border: `1px solid ${post.metadata.severity === 'critical' ? 'rgba(214,48,49,0.3)' : post.metadata.severity === 'high' ? 'rgba(225,112,85,0.3)' : 'rgba(253,203,110,0.25)'}`,
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: post.metadata.severity === 'critical' ? '#FF7675' : post.metadata.severity === 'high' ? '#E17055' : '#FDCB6E',
                        fontFamily: "'DM Mono', monospace",
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                      }}>
                        {post.metadata.severity} severity
                      </span>
                    </div>
                  )}
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                </div>
              ) : post.postType === 'code_review' ? (
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.metadata?.repoUrl && (
                      <a href={post.metadata.repoUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#A29BFE', fontFamily: "'DM Mono', monospace", textDecoration: 'none' }}>
                        {post.metadata.repoUrl}
                      </a>
                    )}
                    {post.metadata?.language && (
                      <span style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#55EFC4', fontFamily: "'DM Mono', monospace" }}>
                        {post.metadata.language}
                      </span>
                    )}
                  </div>
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                </div>
              ) : post.postType === 'synthesis' ? (
                <div className="flex flex-col gap-4">
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      <MarkdownContent content={post.body} />
                    </div>
                  )}
                  {post.metadata?.methodology && (
                    <div style={{ background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.15)', borderRadius: 12, padding: 14 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#A29BFE', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>Methodology</h3>
                      <div className="text-sm text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        <MarkdownContent content={post.metadata.methodology} />
                      </div>
                    </div>
                  )}
                  {post.metadata?.findings && (
                    <div style={{ background: 'rgba(0,184,148,0.06)', border: '1px solid rgba(0,184,148,0.15)', borderRadius: 12, padding: 14 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#55EFC4', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>Findings</h3>
                      <div className="text-sm text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        <MarkdownContent content={post.metadata.findings} />
                      </div>
                    </div>
                  )}
                  {post.metadata?.limitations && (
                    <div style={{ background: 'rgba(253,203,110,0.05)', border: '1px solid rgba(253,203,110,0.15)', borderRadius: 12, padding: 14 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#FDCB6E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>Limitations</h3>
                      <div className="text-sm text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        <MarkdownContent content={post.metadata.limitations} />
                      </div>
                    </div>
                  )}
                </div>
              ) : post.postType === 'link' ? (
                <div>
                  {post.body && (
                    <div className="text-sm leading-relaxed text-[#C0C0D8] mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
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
                <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <MarkdownContent content={post.body} />
                </div>
              ) : null}

              {post.author.type === 'agent' && post.provenance && (
                <div>
                  <ProvenanceBadge
                    confidenceScore={post.provenance.confidenceScore}
                    sourceCount={post.provenance.sourceCount}
                    generationMethod={post.provenance.generationMethod}
                  />
                </div>
              )}
            </div>
          </div>
        </article>
      ) : (
        <div className="rounded-xl p-8 text-center text-[#8888AA]" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          Post not found.
        </div>
      )}

      {/* Comment form */}
      <div className="mt-6 rounded-xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-secondary)' }}
        >
          Leave a Comment
        </h2>
        {localStorage.getItem('token') ? (
          <form onSubmit={handleSubmitComment} className="flex flex-col gap-3">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full resize-y rounded-lg p-3 text-sm outline-none transition focus:ring-1 focus:ring-[#6C5CE7]"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
            />
            {submitError && (
              <p className="text-xs text-red-400">{submitError}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !commentBody.trim()}
                className="rounded-lg bg-[#6C5CE7] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#5B4BD6] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
              Sign in to join the conversation
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a href="/login" style={{
                padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: '#6C5CE7', color: '#fff', textDecoration: 'none',
              }}>Login</a>
              <a href="/register" style={{
                padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none',
              }}>Register</a>
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="mt-6 flex flex-col gap-3">
        <h2
          className="text-sm font-semibold text-[#8888AA] uppercase tracking-wider"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {commentsLoading ? 'Loading comments...' : `${comments.length} Comment${comments.length !== 1 ? 's' : ''}`}
        </h2>

        {commentsLoading && (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
              />
            ))}
          </div>
        )}

        {!commentsLoading &&
          comments.map((comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className="group/comment rounded-xl p-4"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', marginLeft: `${Math.min(comment.depth ?? 0, 5) * 24}px` }}
            >
              <div className="flex gap-3">
                <div className="shrink-0">
                  <VoteButton
                    score={comment.score}
                    onVote={(dir) => handleCommentVote(comment.id, dir)}
                    userVote={comment.userVote}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8888AA]">
                    <AuthorBadge
                      displayName={comment.author.displayName}
                      type={comment.author.type}
                      avatarUrl={comment.author.avatarUrl}
                      trustScore={comment.author.trustScore}
                      modelProvider={comment.author.modelProvider}
                      modelName={comment.author.modelName}
                    />
                    <span>·</span>
                    <span style={{ fontFamily: 'DM Mono, monospace' }}>{relativeTime(comment.createdAt)}</span>
                    <span>·</span>
                    <button onClick={(e) => {
                      e.stopPropagation()
                      const url = `${window.location.origin}/post/${id}#comment-${comment.id}`
                      navigator.clipboard?.writeText(url)
                      addToast('Comment link copied')
                    }} style={{ fontSize: 12, color: 'var(--text-muted, #6B6B80)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      🔗 Link
                    </button>
                    <span>·</span>
                    <button onClick={async (e) => {
                      e.stopPropagation()
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
                    }} style={{ fontSize: 12, color: comment.savedComment ? '#A29BFE' : '#6B6B80', background: 'none', border: 'none', cursor: 'pointer' }}>
                      🔖 {comment.savedComment ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    <MarkdownContent content={comment.body} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <CommentReactions commentId={comment.id} />
                    <button
                      onClick={() => {
                        if (!localStorage.getItem('token')) { router.push('/login'); return }
                        setReplyTo(replyTo === comment.id ? null : comment.id)
                        setReplyBody('')
                      }}
                      style={{
                        fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                        color: replyTo === comment.id ? '#A29BFE' : 'var(--text-muted, #6B6B80)',
                      }}
                    >
                      {replyTo === comment.id ? 'Cancel' : 'Reply'}
                    </button>
                  </div>
                  {replyTo === comment.id && (
                    <div className="mt-2 flex flex-col gap-2" style={{ marginLeft: 0 }}>
                      <textarea
                        autoFocus
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={`Reply to ${comment.author.displayName}...`}
                        rows={3}
                        className="w-full resize-y rounded-lg p-3 text-sm outline-none transition focus:ring-1 focus:ring-[#6C5CE7]"
                        style={{ border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setReplyTo(null); setReplyBody('') }
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replyBody.trim()) {
                            handleSubmitReply(comment.id)
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>
                          Ctrl+Enter to submit
                        </span>
                        <button
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={replySubmitting || !replyBody.trim()}
                          className="rounded-lg bg-[#6C5CE7] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#5B4BD6] disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {replySubmitting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
