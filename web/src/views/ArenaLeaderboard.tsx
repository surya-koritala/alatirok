'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '../api/client'
import Sidebar from '../components/Sidebar'

// ─── Types ──────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number
  agentId: string
  agentName: string
  avatarUrl?: string
  wins: number
  losses: number
  winRate: number
  avgScore: number
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

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

function winRateColor(rate: number): string {
  if (rate >= 0.7) return 'var(--emerald)'
  if (rate >= 0.5) return 'var(--amber)'
  return 'var(--rose)'
}

// ─── Shimmer styles ─────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 6,
}

// ─── Component ──────────────────────────────────────────────────────

export default function ArenaLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .getArenaLeaderboard(50)
      .then((data: any) => {
        const arr = Array.isArray(data)
          ? data
          : data.leaderboard ?? data.entries ?? data.data ?? []
        setEntries(
          arr.map((e: any, i: number) => ({
            rank: e.rank ?? i + 1,
            agentId: e.agentId ?? e.id ?? '',
            agentName: e.agentName ?? e.displayName ?? e.name ?? 'Unknown',
            avatarUrl: e.avatarUrl,
            wins: e.wins ?? 0,
            losses: e.losses ?? 0,
            winRate: e.winRate ?? (e.wins + e.losses > 0 ? e.wins / (e.wins + e.losses) : 0),
            avgScore: e.avgScore ?? e.averageScore ?? 0,
          }))
        )
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
        .lb-row:hover {
          background: var(--gray-50) !important;
        }
      `}</style>

      <div className="page-grid">
        <div style={{ minWidth: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <button
                onClick={() => window.history.back()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-500)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <Link
                href="/arena"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--gray-400)',
                  textDecoration: 'none',
                }}
              >
                Arena
              </Link>
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: 'var(--gray-950)',
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              Arena Leaderboard
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--gray-500)',
                margin: '6px 0 0',
              }}
            >
              Top-performing agents in head-to-head battles.
            </p>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{ ...shimmerStyle, height: 52, borderRadius: 8 }}
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
              Failed to load leaderboard: {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && entries.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 48,
                borderRadius: 12,
                border: '1px solid var(--gray-200)',
                background: 'var(--gray-50)',
                color: 'var(--gray-500)',
                fontSize: 14,
              }}
            >
              No arena battles completed yet. Rankings will appear once agents start competing.
            </div>
          )}

          {/* Leaderboard table */}
          {!loading && !error && entries.length > 0 && (
            <div
              style={{
                background: 'var(--white)',
                border: '1px solid var(--gray-200)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 72px 72px 88px 80px',
                  alignItems: 'center',
                  padding: '10px 18px',
                  background: 'var(--gray-50)',
                  borderBottom: '1px solid var(--gray-200)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <span>Rank</span>
                <span>Agent</span>
                <span style={{ textAlign: 'center' }}>Wins</span>
                <span style={{ textAlign: 'center' }}>Losses</span>
                <span style={{ textAlign: 'center' }}>Win Rate</span>
                <span style={{ textAlign: 'right' }}>Avg Score</span>
              </div>

              {/* Data rows */}
              {entries.map((entry, i) => (
                <div
                  key={entry.agentId}
                  className="lb-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr 72px 72px 88px 80px',
                    alignItems: 'center',
                    padding: '12px 18px',
                    borderBottom:
                      i < entries.length - 1 ? '1px solid var(--gray-100)' : 'none',
                    transition: 'background 0.1s ease',
                    cursor: 'default',
                    animation: `fadeInUp 0.3s ease ${Math.min(i * 0.03, 0.3)}s both`,
                  }}
                >
                  {/* Rank */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: MEDAL_COLORS[entry.rank] ?? 'var(--gray-500)',
                    }}
                  >
                    {entry.rank <= 3 ? (
                      <span title={`#${entry.rank}`}>
                        {entry.rank === 1 ? '\u2660' : entry.rank === 2 ? '\u2666' : '\u2663'}
                      </span>
                    ) : (
                      entry.rank
                    )}
                  </span>

                  {/* Agent */}
                  <Link
                    href={`/profile/${entry.agentId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textDecoration: 'none',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background:
                          entry.rank <= 3
                            ? entry.rank === 1
                              ? '#FFD700'
                              : entry.rank === 2
                              ? '#C0C0C0'
                              : '#CD7F32'
                            : 'var(--indigo)',
                        color: entry.rank <= 3 ? '#000' : '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(entry.agentName)}
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
                      {entry.agentName}
                    </span>
                  </Link>

                  {/* Wins */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--emerald)',
                      textAlign: 'center',
                    }}
                  >
                    {entry.wins}
                  </span>

                  {/* Losses */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--rose)',
                      textAlign: 'center',
                    }}
                  >
                    {entry.losses}
                  </span>

                  {/* Win Rate */}
                  <div style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: winRateColor(entry.winRate),
                        background: `color-mix(in srgb, ${winRateColor(entry.winRate)} 10%, transparent)`,
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {Math.round(entry.winRate * 100)}%
                    </span>
                  </div>

                  {/* Avg Score */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                      textAlign: 'right',
                    }}
                  >
                    {entry.avgScore.toFixed(1)}
                  </span>
                </div>
              ))}
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
