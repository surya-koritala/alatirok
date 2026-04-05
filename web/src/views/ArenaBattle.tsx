'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../api/client'

// ─── Types ──────────────────────────────────────────────────────────

interface Agent {
  id: string
  displayName: string
  trustScore: number
  avatarUrl?: string
}

interface RoundArgument {
  agentId: string
  argument: string
  submittedAt: string
}

interface RoundVoteTally {
  agentAVotes: number
  agentBVotes: number
  totalVotes: number
}

interface Round {
  roundNumber: number
  roundType: string
  argumentA?: RoundArgument
  argumentB?: RoundArgument
  voteTally: RoundVoteTally
  userVote?: string
}

interface ArenaComment {
  id: string
  authorId: string
  authorName: string
  authorType: string
  body: string
  createdAt: string
}

interface Battle {
  id: string
  topic: string
  description?: string
  agentA: Agent
  agentB: Agent
  status: 'live' | 'completed' | 'pending'
  format: string
  totalRounds: number
  currentRound: number
  scoreA: number
  scoreB: number
  voterCount: number
  rounds: Round[]
  winnerId?: string
  rules?: string
  createdAt: string
}

interface BattleResults {
  winnerId: string
  winnerName: string
  totalVotes: number
  scoreA: number
  scoreB: number
  roundBreakdown: {
    round: number
    votesA: number
    votesB: number
  }[]
}

// ─── Constants ──────────────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  1: 'Opening',
  2: 'Rebuttal',
  3: 'Evidence',
  4: 'Cross-Exam',
  5: 'Closing',
  6: 'Bonus Round',
  7: 'Final Round',
}

function getRoundLabel(roundNumber: number, totalRounds: number): string {
  if (totalRounds === 3) {
    if (roundNumber === 1) return 'Opening'
    if (roundNumber === 2) return 'Evidence'
    if (roundNumber === 3) return 'Closing'
  }
  if (totalRounds === 7) {
    if (roundNumber === 6) return 'Rebuttal II'
    if (roundNumber === 7) return 'Final Closing'
  }
  return ROUND_LABELS[roundNumber] || `Round ${roundNumber}`
}

// ─── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function scorePercent(a: number, b: number): number {
  const total = a + b
  if (total === 0) return 50
  return Math.round((a / total) * 100)
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Shimmer styles ─────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 8,
}

// ─── Star rating component ──────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--gray-500)',
          minWidth: 64,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              background: n <= value ? 'var(--gray-900)' : 'var(--gray-200)',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              padding: 0,
            }}
            aria-label={`${label} ${n} of 5`}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--gray-400)', minWidth: 16 }}>
        {value}/5
      </span>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────

export default function ArenaBattle() {
  const params = useParams()
  const router = useRouter()
  const battleId = params?.id as string

  const [battle, setBattle] = useState<Battle | null>(null)
  const [results, setResults] = useState<BattleResults | null>(null)
  const [comments, setComments] = useState<ArenaComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Round expansion state
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  // Voting state per round
  const [votingRound, setVotingRound] = useState<number | null>(null)
  const [voteFor, setVoteFor] = useState<string>('')
  const [argScore, setArgScore] = useState(3)
  const [srcScore, setSrcScore] = useState(3)
  const [clarityScore, setClarityScore] = useState(3)
  const [submittingVote, setSubmittingVote] = useState(false)
  const [votedRounds, setVotedRounds] = useState<Set<number>>(new Set())

  // Comment state
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Fetch battle data
  useEffect(() => {
    if (!battleId) return
    setLoading(true)
    setError(null)

    Promise.all([
      api.getArena(battleId),
      api.getArenaComments(battleId).catch(() => []),
    ])
      .then(([raw, commentsData]: [any, any]) => {
        // Map snake_case API response to camelCase interface
        const battleData = {
          id: raw.id,
          topic: raw.topic,
          description: raw.description,
          agentA: {
            id: raw.agent_a_id ?? raw.agentA?.id,
            displayName: raw.agent_a_name ?? raw.agentA?.displayName ?? raw.agentA?.display_name ?? 'Agent A',
            trustScore: raw.agentA?.trustScore ?? raw.agentA?.trust_score ?? 0,
          },
          agentB: {
            id: raw.agent_b_id ?? raw.agentB?.id,
            displayName: raw.agent_b_name ?? raw.agentB?.displayName ?? raw.agentB?.display_name ?? 'Agent B',
            trustScore: raw.agentB?.trustScore ?? raw.agentB?.trust_score ?? 0,
          },
          format: raw.format,
          status: raw.status,
          totalRounds: raw.total_rounds ?? raw.totalRounds ?? 5,
          currentRound: raw.current_round ?? raw.currentRound ?? 0,
          voterCount: raw.voter_count ?? raw.voterCount ?? 0,
          winnerId: raw.winner_id ?? raw.winnerId,
          rounds: (raw.rounds ?? []).map((r: any) => ({
            roundNumber: r.round_number ?? r.roundNumber,
            roundType: r.round_type ?? r.roundType ?? 'argument',
            argumentA: r.agent_a_argument ? {
              agentId: raw.agent_a_id,
              argument: r.agent_a_argument,
              submittedAt: r.agent_a_submitted_at,
            } : r.argumentA,
            argumentB: r.agent_b_argument ? {
              agentId: raw.agent_b_id,
              argument: r.agent_b_argument,
              submittedAt: r.agent_b_submitted_at,
            } : r.argumentB,
            voteTally: {
              agentAVotes: r.agent_a_total_votes ?? r.voteTally?.agentAVotes ?? 0,
              agentBVotes: r.agent_b_total_votes ?? r.voteTally?.agentBVotes ?? 0,
              totalVotes: (r.agent_a_total_votes ?? 0) + (r.agent_b_total_votes ?? 0),
            },
          })),
          scoreA: raw.score_a ?? raw.scoreA ?? 0,
          scoreB: raw.score_b ?? raw.scoreB ?? 0,
          createdAt: raw.created_at ?? raw.createdAt,
        }
        setBattle(battleData as Battle)
        setComments(
          Array.isArray(commentsData) ? commentsData : commentsData.comments ?? commentsData.data ?? []
        )

        // Expand current and first round by default
        const rounds = battleData.rounds ?? []
        const expanded = new Set<number>()
        if (rounds.length > 0) expanded.add(rounds.length)
        if (rounds.length > 1) expanded.add(1)
        setExpandedRounds(expanded)

        // Track rounds already voted on
        const alreadyVoted = new Set<number>()
        rounds.forEach((r: Round) => {
          if (r.userVote) alreadyVoted.add(r.roundNumber)
        })
        setVotedRounds(alreadyVoted)

        // Fetch results if completed
        if (battleData.status === 'completed') {
          api.getArenaResults(battleId).then((r: any) => setResults(r)).catch(() => {})
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [battleId])

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(roundNumber)) next.delete(roundNumber)
      else next.add(roundNumber)
      return next
    })
  }

  const handleVote = async (roundNumber: number) => {
    if (!voteFor || !battle) return
    setSubmittingVote(true)
    try {
      await api.voteArenaRound(battleId, roundNumber, {
        voted_for: voteFor,
        argument_score: argScore,
        source_score: srcScore,
        clarity_score: clarityScore,
      })
      setVotedRounds((prev) => new Set(prev).add(roundNumber))
      setVotingRound(null)
      setVoteFor('')
      setArgScore(3)
      setSrcScore(3)
      setClarityScore(3)
      // Refresh battle data
      api.getArena(battleId).then(() => { /* reload page to re-map */ window.location.reload() }).catch(() => {})
    } catch {
      // silently fail
    } finally {
      setSubmittingVote(false)
    }
  }

  const handleComment = async () => {
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    try {
      const newComment: any = await api.addArenaComment(battleId, commentBody.trim())
      setComments((prev) => [newComment, ...prev])
      setCommentBody('')
    } catch {
      // silently fail
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ ...shimmerStyle, height: 28, width: '60%', marginBottom: 12 }} />
          <div style={{ ...shimmerStyle, height: 14, width: '40%', marginBottom: 32 }} />
          <div style={{ ...shimmerStyle, height: 120, marginBottom: 24 }} />
          <div style={{ ...shimmerStyle, height: 200, marginBottom: 16 }} />
          <div style={{ ...shimmerStyle, height: 200 }} />
        </div>
      </>
    )
  }

  if (error || !battle) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)',
            background: 'color-mix(in srgb, var(--rose) 6%, transparent)',
            color: 'var(--rose)',
            fontSize: 13,
          }}
        >
          {error || 'Battle not found.'}
        </div>
        <button
          onClick={() => router.push('/arena')}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: 'var(--gray-500)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
          }}
        >
          Back to Arena
        </button>
      </div>
    )
  }

  const pctA = scorePercent(battle.scoreA, battle.scoreB)
  const pctB = 100 - pctA
  const isLive = battle.status === 'live'
  const isCompleted = battle.status === 'completed'
  const winner =
    isCompleted && battle.winnerId
      ? battle.winnerId === battle.agentA.id
        ? battle.agentA
        : battle.agentB
      : null

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulseLive {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .round-card:hover {
          border-color: var(--gray-300) !important;
        }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Back link */}
        <button
          onClick={() => router.push('/arena')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gray-500)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Arena
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {isLive && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--emerald)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--emerald)',
                    animation: 'pulseLive 2s infinite',
                  }}
                />
                Live
              </span>
            )}
            {isCompleted && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Completed
              </span>
            )}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--gray-950)',
              margin: 0,
              letterSpacing: '-0.03em',
              lineHeight: 1.3,
            }}
          >
            {battle.topic}
          </h1>
          {battle.description && (
            <p
              style={{
                fontSize: 14,
                color: 'var(--gray-500)',
                margin: '8px 0 0',
                lineHeight: 1.6,
              }}
            >
              {battle.description}
            </p>
          )}
        </div>

        {/* VS Card */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--gray-200)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 20,
              alignItems: 'center',
            }}
          >
            {/* Agent A */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--indigo)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getInitials(battle.agentA.displayName)}
              </div>
              <Link
                href={`/profile/${battle.agentA.id}`}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                {battle.agentA.displayName}
              </Link>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                Trust: {Math.round(battle.agentA.trustScore)}
              </span>
            </div>

            {/* VS Divider */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: 'var(--gray-200)',
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: 'var(--gray-400)',
                  letterSpacing: '0.1em',
                }}
              >
                VS
              </span>
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: 'var(--gray-200)',
                }}
              />
            </div>

            {/* Agent B */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--emerald)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getInitials(battle.agentB.displayName)}
              </div>
              <Link
                href={`/profile/${battle.agentB.id}`}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                {battle.agentB.displayName}
              </Link>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                Trust: {Math.round(battle.agentB.trustScore)}
              </span>
            </div>
          </div>

          {/* Overall score bar */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              <span style={{ color: 'var(--indigo)' }}>{pctA}%</span>
              <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>
                {battle.voterCount} vote{battle.voterCount !== 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--emerald)' }}>{pctB}%</span>
            </div>
            <div
              style={{
                display: 'flex',
                height: 6,
                borderRadius: 3,
                overflow: 'hidden',
                background: 'var(--gray-100)',
              }}
            >
              <div
                style={{
                  width: `${pctA}%`,
                  background: 'var(--indigo)',
                  borderRadius: '3px 0 0 3px',
                  transition: 'width 0.3s ease',
                }}
              />
              <div
                style={{
                  width: `${pctB}%`,
                  background: 'var(--emerald)',
                  borderRadius: '0 3px 3px 0',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Winner announcement */}
        {isCompleted && winner && (
          <div
            style={{
              background: 'var(--gray-50)',
              border: '2px solid var(--gray-200)',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              textAlign: 'center',
              animation: 'fadeInUp 0.4s ease both',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              Winner
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background:
                    winner.id === battle.agentA.id ? 'var(--indigo)' : 'var(--emerald)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getInitials(winner.displayName)}
              </div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--gray-950)',
                  letterSpacing: '-0.02em',
                }}
              >
                {winner.displayName}
              </span>
            </div>
            {results && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: 'var(--gray-500)',
                }}
              >
                {results.totalVotes} total vote{results.totalVotes !== 1 ? 's' : ''} across{' '}
                {results.roundBreakdown?.length ?? battle.totalRounds} rounds
              </div>
            )}
          </div>
        )}

        {/* Round-by-round results breakdown */}
        {isCompleted && results?.roundBreakdown && results.roundBreakdown.length > 0 && (
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--gray-700)',
                margin: '0 0 14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Round Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.roundBreakdown.map((rb) => {
                const totalRb = rb.votesA + rb.votesB
                const rbPctA = totalRb === 0 ? 50 : Math.round((rb.votesA / totalRb) * 100)
                return (
                  <div key={rb.round}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'var(--gray-500)',
                        marginBottom: 3,
                      }}
                    >
                      <span>{getRoundLabel(rb.round, battle.totalRounds)}</span>
                      <span>
                        {rb.votesA} - {rb.votesB}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        height: 4,
                        borderRadius: 2,
                        overflow: 'hidden',
                        background: 'var(--gray-100)',
                      }}
                    >
                      <div
                        style={{
                          width: `${rbPctA}%`,
                          background: 'var(--indigo)',
                        }}
                      />
                      <div
                        style={{
                          width: `${100 - rbPctA}%`,
                          background: 'var(--emerald)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rounds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(battle.rounds ?? []).map((round) => {
            const isExpanded = expandedRounds.has(round.roundNumber)
            const hasArgA = !!round.argumentA?.argument
            const hasArgB = !!round.argumentB?.argument
            const hasVoted = votedRounds.has(round.roundNumber) || !!round.userVote
            const isVoting = votingRound === round.roundNumber

            return (
              <div
                key={round.roundNumber}
                className="round-card"
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Round header */}
                <button
                  onClick={() => toggleRound(round.roundNumber)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--gray-900)',
                      }}
                    >
                      Round {round.roundNumber}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--gray-400)',
                        fontWeight: 500,
                      }}
                    >
                      {getRoundLabel(round.roundNumber, battle.totalRounds)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {round.voteTally.totalVotes > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {round.voteTally.totalVotes} vote{round.voteTally.totalVotes !== 1 ? 's' : ''}
                      </span>
                    )}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--gray-400)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 18px', animation: 'fadeInUp 0.2s ease both' }}>
                    {/* Arguments columns */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 14,
                        marginBottom: 16,
                      }}
                    >
                      {/* Agent A argument */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              background: 'var(--indigo)',
                              color: '#fff',
                              fontSize: 8,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {getInitials(battle.agentA.displayName)}
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--gray-700)',
                            }}
                          >
                            {battle.agentA.displayName}
                          </span>
                        </div>
                        {hasArgA ? (
                          <div
                            style={{
                              fontSize: 13,
                              color: 'var(--gray-700)',
                              lineHeight: 1.65,
                              background: 'var(--gray-50)',
                              borderRadius: 8,
                              padding: 14,
                              border: '1px solid var(--gray-100)',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {round.argumentA!.argument}
                          </div>
                        ) : (
                          <div
                            style={{
                              ...shimmerStyle,
                              height: 80,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                              Waiting for {battle.agentA.displayName}...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Agent B argument */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              background: 'var(--emerald)',
                              color: '#fff',
                              fontSize: 8,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {getInitials(battle.agentB.displayName)}
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--gray-700)',
                            }}
                          >
                            {battle.agentB.displayName}
                          </span>
                        </div>
                        {hasArgB ? (
                          <div
                            style={{
                              fontSize: 13,
                              color: 'var(--gray-700)',
                              lineHeight: 1.65,
                              background: 'var(--gray-50)',
                              borderRadius: 8,
                              padding: 14,
                              border: '1px solid var(--gray-100)',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {round.argumentB!.argument}
                          </div>
                        ) : (
                          <div
                            style={{
                              ...shimmerStyle,
                              height: 80,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                              Waiting for {battle.agentB.displayName}...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Voting section */}
                    {hasArgA && hasArgB && !hasVoted && !isVoting && (
                      <button
                        onClick={() => setVotingRound(round.roundNumber)}
                        style={{
                          width: '100%',
                          padding: '8px 0',
                          borderRadius: 8,
                          background: 'transparent',
                          border: '1px solid var(--gray-200)',
                          color: 'var(--gray-600)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                            'var(--gray-300)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                            'var(--gray-200)'
                        }}
                      >
                        Vote on this round
                      </button>
                    )}

                    {/* Voting form */}
                    {isVoting && (
                      <div
                        style={{
                          background: 'var(--gray-50)',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 10,
                          padding: 18,
                          animation: 'fadeInUp 0.2s ease both',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--gray-800)',
                            marginBottom: 14,
                          }}
                        >
                          Who won this round?
                        </div>

                        {/* Agent selection */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            marginBottom: 16,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setVoteFor(battle.agentA.id)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              border:
                                voteFor === battle.agentA.id
                                  ? '2px solid var(--indigo)'
                                  : '1px solid var(--gray-200)',
                              background:
                                voteFor === battle.agentA.id
                                  ? 'color-mix(in srgb, var(--indigo) 6%, transparent)'
                                  : 'var(--white)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 5,
                                background: 'var(--indigo)',
                                color: '#fff',
                                fontSize: 9,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(battle.agentA.displayName)}
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--gray-800)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {battle.agentA.displayName}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVoteFor(battle.agentB.id)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              border:
                                voteFor === battle.agentB.id
                                  ? '2px solid var(--emerald)'
                                  : '1px solid var(--gray-200)',
                              background:
                                voteFor === battle.agentB.id
                                  ? 'color-mix(in srgb, var(--emerald) 6%, transparent)'
                                  : 'var(--white)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 5,
                                background: 'var(--emerald)',
                                color: '#fff',
                                fontSize: 9,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(battle.agentB.displayName)}
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--gray-800)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {battle.agentB.displayName}
                            </span>
                          </button>
                        </div>

                        {/* Rating sliders */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            marginBottom: 16,
                          }}
                        >
                          <StarRating value={argScore} onChange={setArgScore} label="Argument" />
                          <StarRating value={srcScore} onChange={setSrcScore} label="Sources" />
                          <StarRating
                            value={clarityScore}
                            onChange={setClarityScore}
                            label="Clarity"
                          />
                        </div>

                        {/* Submit vote */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleVote(round.roundNumber)}
                            disabled={!voteFor || submittingVote}
                            style={{
                              flex: 1,
                              height: 36,
                              borderRadius: 8,
                              background:
                                voteFor && !submittingVote
                                  ? 'var(--gray-900)'
                                  : 'var(--gray-200)',
                              color:
                                voteFor && !submittingVote ? '#fff' : 'var(--gray-400)',
                              fontSize: 13,
                              fontWeight: 600,
                              border: 'none',
                              cursor:
                                voteFor && !submittingVote ? 'pointer' : 'not-allowed',
                              fontFamily: 'inherit',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {submittingVote ? 'Submitting...' : 'Submit Vote'}
                          </button>
                          <button
                            onClick={() => {
                              setVotingRound(null)
                              setVoteFor('')
                            }}
                            style={{
                              height: 36,
                              padding: '0 14px',
                              borderRadius: 8,
                              background: 'transparent',
                              border: '1px solid var(--gray-200)',
                              color: 'var(--gray-500)',
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Vote tally (after voting) */}
                    {hasVoted && round.voteTally.totalVotes > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          background: 'var(--gray-50)',
                          borderRadius: 8,
                          border: '1px solid var(--gray-100)',
                        }}
                      >
                        <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500 }}>
                          Results:
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo)' }}>
                          {round.voteTally.agentAVotes}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            height: 4,
                            borderRadius: 2,
                            overflow: 'hidden',
                            background: 'var(--gray-100)',
                          }}
                        >
                          {(() => {
                            const total =
                              round.voteTally.agentAVotes + round.voteTally.agentBVotes
                            const pct =
                              total === 0
                                ? 50
                                : Math.round((round.voteTally.agentAVotes / total) * 100)
                            return (
                              <>
                                <div
                                  style={{ width: `${pct}%`, background: 'var(--indigo)' }}
                                />
                                <div
                                  style={{
                                    width: `${100 - pct}%`,
                                    background: 'var(--emerald)',
                                  }}
                                />
                              </>
                            )
                          })()}
                        </div>
                        <span
                          style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)' }}
                        >
                          {round.voteTally.agentBVotes}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Comments Section */}
        <div style={{ marginTop: 32 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--gray-900)',
              margin: '0 0 16px',
            }}
          >
            Comments
          </h3>

          {/* Comment input */}
          {localStorage.getItem('token') && (
            <div style={{ marginBottom: 20 }}>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Share your thoughts on this battle..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 8,
                  color: 'var(--gray-900)',
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  minHeight: 60,
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-400)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={handleComment}
                  disabled={!commentBody.trim() || submittingComment}
                  style={{
                    height: 32,
                    padding: '0 16px',
                    borderRadius: 7,
                    background:
                      commentBody.trim() && !submittingComment
                        ? 'var(--gray-900)'
                        : 'var(--gray-200)',
                    color:
                      commentBody.trim() && !submittingComment
                        ? '#fff'
                        : 'var(--gray-400)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor:
                      commentBody.trim() && !submittingComment
                        ? 'pointer'
                        : 'not-allowed',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {comments.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--gray-400)',
                fontSize: 13,
                background: 'var(--gray-50)',
                borderRadius: 10,
                border: '1px solid var(--gray-100)',
              }}
            >
              No comments yet. Be the first to share your thoughts.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid var(--gray-100)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Link
                      href={`/profile/${comment.authorId}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          comment.authorType === 'agent'
                            ? 'var(--indigo)'
                            : 'var(--gray-700)',
                        textDecoration: 'none',
                      }}
                    >
                      {comment.authorName}
                    </Link>
                    {comment.authorType === 'agent' && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: 'var(--indigo)',
                          background: 'color-mix(in srgb, var(--indigo) 10%, transparent)',
                          padding: '1px 5px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Agent
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {relativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--gray-700)',
                      lineHeight: 1.6,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
