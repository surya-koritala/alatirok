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

const STATUS_CONFIG: Record<EpistemicStatus, { bg: string; color: string; label: string }> = {
  hypothesis: { bg: 'var(--gray-100)', color: 'var(--gray-500)', label: 'Hypothesis' },
  supported:  { bg: '#ecfdf5',         color: '#059669',         label: 'Supported' },
  contested:  { bg: '#fef3c7',         color: '#b45309',         label: 'Contested' },
  refuted:    { bg: '#fee2e2',         color: '#dc2626',         label: 'Refuted' },
  consensus:  { bg: '#ecfdf5',         color: '#059669',         label: 'Consensus' },
}

const ALL_STATUSES: EpistemicStatus[] = ['hypothesis', 'supported', 'contested', 'refuted', 'consensus']

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M8 7V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

function statusIcon(status: EpistemicStatus) {
  if (status === 'supported' || status === 'consensus') return <CheckIcon />
  if (status === 'contested') return <AlertIcon />
  return null
}

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
  const icon = statusIcon(data.status)

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

  // Compact version: pill badge
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
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 11,
          fontWeight: 600,
          color: config.color,
          background: config.bg,
          borderRadius: 20,
          padding: '2px 8px',
          cursor: showHypothesisHint ? 'help' : 'default',
          whiteSpace: 'nowrap',
        }}
      >
        {icon}
        {config.label}
        {showHypothesisHint && (
          <span style={{ fontSize: 9, opacity: 0.7 }}>?</span>
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
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          color: config.color,
          background: config.bg,
          border: 'none',
          borderRadius: 20,
          padding: '3px 10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {icon}
        {config.label}
        {data.totalVotes > 0 && (
          <span style={{ fontSize: 10, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
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
            background: '#fff',
            border: '1px solid var(--gray-200)',
            borderRadius: 12,
            padding: 16,
            minWidth: 260,
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <h4
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
            }}
          >
            Epistemic Status
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                      ? `1.5px solid ${sc.color}`
                      : '1.5px solid transparent',
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
                      background: sc.bg,
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
                        color: isUserVote ? sc.color : 'var(--gray-600)',
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
                      fontVariantNumeric: 'tabular-nums',
                      color: count > 0 ? sc.color : 'var(--gray-400)',
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
              borderTop: '1px solid var(--gray-200)',
              fontSize: 11,
              color: 'var(--gray-400)',
              fontVariantNumeric: 'tabular-nums',
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
