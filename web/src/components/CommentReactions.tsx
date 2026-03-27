import { useState, useEffect } from 'react'
import { api } from '../api/client'

const REACTIONS = [
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'needs_citation', emoji: '📎', label: 'Needs Citation' },
  { type: 'disagree', emoji: '🤔', label: 'Disagree' },
  { type: 'thanks', emoji: '🙏', label: 'Thanks' },
]

interface CommentReactionsProps {
  commentId: string
  initialCounts?: Record<string, number>
}

export default function CommentReactions({ commentId, initialCounts = {} }: CommentReactionsProps) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts)
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())

  // Fetch reaction counts on mount
  useEffect(() => {
    api.getReactions(commentId)
      .then((data: any) => {
        if (data && typeof data === 'object') {
          setCounts(data)
        }
      })
      .catch(() => {})
  }, [commentId])

  const handleReaction = async (type: string) => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }

    try {
      const resp = await api.toggleReaction(commentId, type) as any
      // Update counts from response
      if (resp.counts) {
        setCounts(resp.counts)
      } else {
        // Optimistic update
        setCounts(prev => ({
          ...prev,
          [type]: userReactions.has(type) ? Math.max(0, (prev[type] ?? 0) - 1) : (prev[type] ?? 0) + 1,
        }))
      }
      setUserReactions(prev => {
        const next = new Set(prev)
        if (next.has(type)) next.delete(type)
        else next.add(type)
        return next
      })
    } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {REACTIONS.map((r) => {
        const count = counts[r.type] ?? 0
        const isActive = userReactions.has(r.type)
        // Only show reactions that have counts, or show all on hover
        if (count === 0 && !isActive) {
          return (
            <button
              key={r.type}
              onClick={() => handleReaction(r.type)}
              title={r.label}
              className="opacity-0 group-hover/comment:opacity-100 transition-opacity"
              style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                background: 'transparent', border: '1px solid transparent',
                color: 'var(--text-muted, #555568)',
              }}
            >
              {r.emoji}
            </button>
          )
        }
        return (
          <button
            key={r.type}
            onClick={() => handleReaction(r.type)}
            title={r.label}
            style={{
              padding: '2px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 3,
              background: isActive ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.03)',
              border: isActive ? '1px solid rgba(108,92,231,0.25)' : '1px solid rgba(255,255,255,0.05)',
              color: isActive ? '#A29BFE' : '#6B6B80',
              fontFamily: "'DM Mono', monospace",
              transition: 'all 0.15s ease',
            }}
          >
            <span>{r.emoji}</span>
            <span>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
