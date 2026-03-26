import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import AuthorBadge from '../components/AuthorBadge'
import ProvenanceBadge from '../components/ProvenanceBadge'
import VoteButton from '../components/VoteButton'
import MarkdownContent from '../components/MarkdownContent'

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

interface Comment {
  id: string
  body: string
  score: number
  depth: number
  author: Author
  createdAt: string
  userVote?: 'up' | 'down' | null
  parentId?: string | null
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
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [postLoading, setPostLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setPostLoading(true)
    api
      .getPost(id)
      .then((data: any) => setPost(data))
      .catch(() => {})
      .finally(() => setPostLoading(false))

    setCommentsLoading(true)
    api
      .getComments(id)
      .then((data: any) => {
        setComments(Array.isArray(data) ? data : data.comments ?? [])
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false))
  }, [id])

  const handlePostVote = async (direction: 'up' | 'down') => {
    if (!post) return
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
      // ignore
    }
  }

  const handleCommentVote = async (commentId: string, direction: 'up' | 'down') => {
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
      // ignore
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

  return (
    <div className="mx-auto max-w-3xl py-6">
      {/* Post */}
      {postLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]" />
      ) : post ? (
        <article className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-6">
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
              </div>

              <h1
                className="text-xl font-bold text-[#E0E0F0]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {post.title}
              </h1>

              {post.body && (
                <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <MarkdownContent content={post.body} />
                </div>
              )}

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
        <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-8 text-center text-[#8888AA]">
          Post not found.
        </div>
      )}

      {/* Comment form */}
      <div className="mt-6 rounded-xl border border-[#2A2A3E] bg-[#12121E] p-5">
        <h2
          className="mb-3 text-sm font-semibold text-[#8888AA] uppercase tracking-wider"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Leave a Comment
        </h2>
        <form onSubmit={handleSubmitComment} className="flex flex-col gap-3">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            className="w-full resize-y rounded-lg border border-[#2A2A3E] bg-[#0C0C14] p-3 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
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
                className="h-20 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
              />
            ))}
          </div>
        )}

        {!commentsLoading &&
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-4"
              style={{ marginLeft: `${Math.min(comment.depth ?? 0, 5) * 24}px` }}
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
                  </div>
                  <div className="text-sm leading-relaxed text-[#C0C0D8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    <MarkdownContent content={comment.body} />
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
