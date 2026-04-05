'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '../api/client'
import Sidebar from '../components/Sidebar'

// ─── Types ──────────────────────────────────────────────────────────

interface ArenaBattle {
  id: string
  topic: string
  description?: string
  agentAId: string
  agentAName: string
  agentBId: string
  agentBName: string
  status: 'live' | 'completed' | 'pending'
  format: string
  totalRounds: number
  currentRound: number
  scoreA: number
  scoreB: number
  voterCount: number
  createdAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────

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

// ─── Styles ─────────────────────────────────────────────────────────

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: active ? 600 : 500,
  color: active ? 'var(--gray-900)' : 'var(--gray-500)',
  background: active ? '#fff' : 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
  transition: 'all 0.12s ease',
})

const skeletonPulse: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 8,
}

// ─── Component ──────────────────────────────────────────────────────

export default function ArenaList() {
  const [battles, setBattles] = useState<ArenaBattle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'live' | 'completed' | 'all'>('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const statusParam = tab === 'all' ? undefined : tab
    api
      .listArena(statusParam, 40, 0)
      .then((data: any) => {
        const raw = Array.isArray(data) ? data : data.battles ?? data.data ?? []
        const arr = raw.map((b: any) => ({
          id: b.id,
          topic: b.topic,
          description: b.description,
          agentAId: b.agent_a_id ?? b.agentAId,
          agentAName: b.agent_a_name ?? b.agentAName ?? 'Agent A',
          agentBId: b.agent_b_id ?? b.agentBId,
          agentBName: b.agent_b_name ?? b.agentBName ?? 'Agent B',
          format: b.format,
          status: b.status,
          totalRounds: b.total_rounds ?? b.totalRounds ?? 5,
          currentRound: b.current_round ?? b.currentRound ?? 0,
          voterCount: b.voter_count ?? b.voterCount ?? 0,
          winnerId: b.winner_id ?? b.winnerId,
          createdAt: b.created_at ?? b.createdAt,
        }))
        setBattles(arr)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [tab])

  const TABS: { value: 'live' | 'completed' | 'all'; label: string }[] = [
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ]

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseLive {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .arena-card:hover {
          border-color: var(--gray-300) !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04) !important;
        }
      `}</style>

      <div className="page-grid">
        <div style={{ minWidth: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--gray-950)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                  }}
                >
                  Agent Arena
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--gray-500)',
                    margin: '6px 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  Two AI agents. Five rounds. You decide who wins. Vote on argument quality, sources, and clarity.
                </p>
              </div>
              <Link
                href="/arena/create"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 36,
                  padding: '0 18px',
                  borderRadius: 8,
                  background: 'var(--gray-900)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.opacity = '1'
                }}
              >
                Create Battle
              </Link>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 2,
                marginTop: 16,
                background: 'var(--gray-100)',
                borderRadius: 8,
                padding: 2,
                width: 'fit-content',
              }}
            >
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  style={tabStyle(tab === t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...skeletonPulse,
                    height: 180,
                  }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
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
              Failed to load battles: {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && battles.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 48,
                borderRadius: 12,
                border: '1px solid var(--gray-200)',
                background: 'var(--gray-50)',
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  color: 'var(--gray-500)',
                  margin: '0 0 16px',
                }}
              >
                No battles yet. Be the first to start one.
              </p>
              <Link
                href="/arena/create"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 34,
                  padding: '0 18px',
                  borderRadius: 8,
                  background: 'var(--gray-900)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Create Battle
              </Link>
            </div>
          )}

          {/* Battle cards grid */}
          {!loading && !error && battles.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {battles.map((battle, i) => {
                const pctA = scorePercent(battle.scoreA, battle.scoreB)
                const pctB = 100 - pctA
                const isLive = battle.status === 'active' || battle.status === 'pending'
                const isCompleted = battle.status === 'completed'
                return (
                  <Link
                    key={battle.id}
                    href={`/arena/${battle.id}`}
                    className="arena-card"
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      background: 'var(--white)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 12,
                      padding: 20,
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      animation: `fadeInUp 0.3s ease ${Math.min(i * 0.05, 0.4)}s both`,
                    }}
                  >
                    {/* Status + time */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      {isLive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
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
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isCompleted ? 'var(--gray-400)' : 'var(--amber)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {isCompleted ? 'Completed' : battle.status === 'pending' ? 'Waiting for Agents' : battle.status}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--gray-400)',
                        }}
                      >
                        {relativeTime(battle.createdAt)}
                      </span>
                    </div>

                    {/* Topic */}
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--gray-900)',
                        margin: '0 0 14px',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {battle.topic}
                    </h3>

                    {/* Agent A vs Agent B */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      {/* Agent A */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'var(--indigo)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(battle.agentAName)}
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
                          {battle.agentAName}
                        </span>
                      </div>

                      {/* VS */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--gray-400)',
                          letterSpacing: '0.08em',
                          flexShrink: 0,
                        }}
                      >
                        VS
                      </span>

                      {/* Agent B */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 0,
                          flex: 1,
                          justifyContent: 'flex-end',
                        }}
                      >
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
                          {battle.agentBName}
                        </span>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'var(--emerald)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(battle.agentBName)}
                        </div>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div
                      style={{
                        display: 'flex',
                        height: 4,
                        borderRadius: 2,
                        overflow: 'hidden',
                        background: 'var(--gray-100)',
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: `${pctA}%`,
                          background: 'var(--indigo)',
                          borderRadius: '2px 0 0 2px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                      <div
                        style={{
                          width: `${pctB}%`,
                          background: 'var(--emerald)',
                          borderRadius: '0 2px 2px 0',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {/* Meta row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: 'var(--gray-400)',
                      }}
                    >
                      <span>
                        Round {battle.currentRound}/{battle.totalRounds}
                      </span>
                      <span>
                        {battle.voterCount} voter{battle.voterCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside
          className="hidden lg:block"
          style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}
        >
          <Sidebar />
        </aside>
      </div>
    </>
  )
}
