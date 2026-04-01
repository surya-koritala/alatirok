'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

type EpistemicStatus = 'hypothesis' | 'supported' | 'contested' | 'refuted' | 'consensus'

interface EpistemicData {
  postId: string
  status: EpistemicStatus
  counts: Record<string, number>
  totalVotes: number
  userVote?: string
}

const STATUS_CONFIG: Record<EpistemicStatus, { color: string; label: string }> = {
  hypothesis: { color: '#8888AA', label: 'Hypothesis' },
  supported:  { color: '#55EFC4', label: 'Supported' },
  contested:  { color: '#FDCB6E', label: 'Contested' },
  refuted:    { color: '#FF7675', label: 'Refuted' },
  consensus:  { color: '#A29BFE', label: 'Consensus' },
}

const ALL_STATUSES: EpistemicStatus[] = ['hypothesis', 'supported', 'contested', 'refuted', 'consensus']

interface EpistemicBadgeProps {
  postId: string
  compact?: boolean
}

export default function EpistemicBadge({ postId, compact = false }: EpistemicBadgeProps) {
  const [data, setData] = useState<EpistemicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [voting, setVoting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    api
      .getEpistemic(postId)
      .then((result: any) => setData(result))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [postId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (loading || !data) return null

  const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.hypothesis

  const handleVote = async (status: EpistemicStatus) => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }
    setVoting(true)
    try {
      const result = await api.voteEpistemic(postId, status) as any
      setData(result)
      setOpen(false)
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('authorization') || msg.includes('Unauthorized') || msg.includes('login')) {
        window.location.href = '/login'
        return
      }
    } finally {
      setVoting(false)
    }
  }

  // Compact version: just the colored dot + label
  if (compact) {
    const showHypothesisHint = data.status === 'hypothesis' && data.totalVotes === 0
    return (
      <span
        title={
          showHypothesisHint
            ? 'What do you think? Vote on the knowledge status'
            : `Epistemic status: ${config.label} (${data.totalVotes} vote${data.totalVotes !== 1 ? 's' : ''})`
        }
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: config.color,
          background: `${config.color}15`,
          border: `1px solid ${config.color}30`,
          borderRadius: 4,
          padding: '1px 6px',
          letterSpacing: '0.02em',
          fontFamily: "'DM Sans', sans-serif",
          cursor: showHypothesisHint ? 'help' : 'default',
          whiteSpace: 'nowrap',
          animation: showHypothesisHint ? 'subtlePulse 3s ease-in-out infinite' : undefined,
        }}
      >
        {config.label}
        {showHypothesisHint && (
          <span style={{ marginLeft: 3, fontSize: 9, opacity: 0.7 }}>?</span>
        )}
      </span>
    )
  }

  // Full version with dropdown voting
  const maxCount = Math.max(...ALL_STATUSES.map(s => data.counts[s] || 0), 1)

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: config.color,
          background: `${config.color}12`,
          border: `1px solid ${config.color}30`,
          borderRadius: 8,
          padding: '4px 10px',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'all 0.15s ease',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: config.color,
            flexShrink: 0,
          }}
        />
        {config.label}
        {data.totalVotes > 0 && (
          <span style={{ fontSize: 10, opacity: 0.7, fontFamily: "'DM Mono', monospace" }}>
            ({data.totalVotes})
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            background: 'var(--bg-card, #16162A)',
            border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 12,
            padding: 16,
            minWidth: 260,
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <h4
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8888AA',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Epistemic Status
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ALL_STATUSES.map((status) => {
              const sc = STATUS_CONFIG[status]
              const count = data.counts[status] || 0
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
              const isUserVote = data.userVote === status

              return (
                <button
                  key={status}
                  disabled={voting}
                  onClick={() => handleVote(status)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: isUserVote
                      ? `1px solid ${sc.color}60`
                      : '1px solid transparent',
                    background: 'transparent',
                    cursor: voting ? 'not-allowed' : 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden',
                    opacity: voting ? 0.6 : 1,
                  }}
                >
                  {/* Background bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${barWidth}%`,
                      background: `${sc.color}15`,
                      borderRadius: 8,
                      transition: 'width 0.3s ease',
                    }}
                  />

                  <span
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: sc.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isUserVote ? 600 : 400,
                        color: isUserVote ? sc.color : '#C0C0D8',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {sc.label}
                    </span>
                    {isUserVote && (
                      <span style={{ fontSize: 10, color: sc.color, opacity: 0.8 }}>
                        (your vote)
                      </span>
                    )}
                  </span>

                  <span
                    style={{
                      position: 'relative',
                      fontSize: 12,
                      fontWeight: 600,
                      color: count > 0 ? sc.color : '#555568',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--border, #2A2A3E)',
              fontSize: 11,
              color: '#6B6B80',
              fontFamily: "'DM Mono', monospace",
              textAlign: 'center',
            }}
          >
            {data.totalVotes} total vote{data.totalVotes !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
