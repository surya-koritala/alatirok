'use client'

import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface PollOption {
  id: string
  text: string
  voteCount: number
  sortOrder: number
}

interface PollData {
  id: string
  postId: string
  deadline?: string
  createdAt: string
  options: PollOption[]
  totalVotes: number
  userVote?: string | null
}

function timeRemaining(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m remaining`
  }
  if (hours < 24) return `${hours}h remaining`
  const days = Math.floor(hours / 24)
  return `${days}d remaining`
}

export default function PollCard({ postId }: { postId: string }) {
  const [poll, setPoll] = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'))
  }, [])

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    api
      .getPoll(postId)
      .then((data: any) => {
        setPoll(data)
        if (data.userVote) {
          setSelected(data.userVote)
          setHasVoted(true)
        }
      })
      .catch(() => {
        // No poll exists for this post -- render nothing
        setPoll(null)
      })
      .finally(() => setLoading(false))
  }, [postId])

  if (loading || !poll) return null

  const ended = poll.deadline ? new Date(poll.deadline).getTime() <= Date.now() : false

  const handleVote = async () => {
    if (!selected || voting) return
    if (!localStorage.getItem('token')) {
      window.location.href = '/login'
      return
    }
    setVoting(true)
    setError(null)
    try {
      await api.votePoll(postId, selected)
      setHasVoted(true)
      const updated = await api.getPoll(postId) as any
      setPoll(updated)
    } catch (err: any) {
      const msg = err.message ?? 'Failed to vote'
      if (msg.includes('authorization') || msg.includes('Unauthorized') || msg.includes('login')) {
        window.location.href = '/login'
        return
      }
      setError(msg)
    } finally {
      setVoting(false)
    }
  }

  const showResults = hasVoted || ended

  return (
    <div
      className="mt-4 rounded-xl p-5"
      style={{
        border: '1px solid var(--border, #2A2A3E)',
        background: 'var(--bg-card, #16162A)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#A29BFE',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Poll
        </h3>
        {poll.deadline && (
          <span
            style={{
              fontSize: 11,
              color: ended ? '#FF7675' : '#FDCB6E',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {timeRemaining(poll.deadline)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {poll.options.map((opt) => {
          const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0
          const isSelected = selected === opt.id

          if (showResults) {
            // Results view -- horizontal bar chart
            return (
              <div key={opt.id} style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: isSelected
                      ? 'rgba(108,92,231,0.2)'
                      : 'rgba(136,136,170,0.08)',
                    borderRadius: 8,
                    transition: 'width 0.4s ease',
                  }}
                />
                <div
                  className="flex items-center justify-between"
                  style={{
                    position: 'relative',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: isSelected
                      ? '1px solid rgba(108,92,231,0.4)'
                      : '1px solid transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: isSelected ? '#E0E0F0' : '#C0C0D8',
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {opt.text}
                    {isSelected && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#A29BFE' }}>
                        (your vote)
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isSelected ? '#A29BFE' : '#8888AA',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            )
          }

          // Voting view -- clickable options
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              disabled={ended}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                border: isSelected
                  ? '1px solid rgba(108,92,231,0.5)'
                  : '1px solid var(--border, #2A2A3E)',
                background: isSelected
                  ? 'rgba(108,92,231,0.08)'
                  : 'transparent',
                cursor: ended ? 'not-allowed' : 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: isSelected
                    ? '5px solid #6C5CE7'
                    : '2px solid #8888AA',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  color: isSelected ? '#E0E0F0' : '#C0C0D8',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {opt.text}
              </span>
            </button>
          )
        })}
      </div>

      {/* Vote button (pre-vote only) */}
      {!showResults && !ended && (
        <div className="mt-3 flex items-center justify-between">
          <span
            style={{
              fontSize: 12,
              color: '#8888AA',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          </span>
          {isLoggedIn ? (
            <button
              onClick={handleVote}
              disabled={!selected || voting}
              style={{
                background: selected && !voting ? '#6C5CE7' : '#4A3BB1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: !selected || voting ? 'not-allowed' : 'pointer',
                opacity: !selected || voting ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {voting ? 'Voting...' : 'Vote'}
            </button>
          ) : (
            <a
              href="/login"
              style={{
                background: '#6C5CE7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'none',
              }}
            >
              Login to vote
            </a>
          )}
        </div>
      )}

      {/* Total votes (post-vote) */}
      {showResults && (
        <div className="mt-3">
          <span
            style={{
              fontSize: 12,
              color: '#8888AA',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {error && (
        <p
          className="mt-2"
          style={{
            color: '#FF7675',
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
