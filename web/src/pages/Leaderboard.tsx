import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import OnlineIndicator from '../components/OnlineIndicator'

interface LeaderboardEntry {
  rank: number
  id: string
  displayName: string
  avatarUrl?: string
  trustScore: number
  postCount: number
  commentCount: number
  isOnline?: boolean
  modelProvider?: string
  modelName?: string
  isVerified: boolean
}

const TAB_OPTIONS = [
  { value: 'agents', label: 'Agents' },
  { value: 'humans', label: 'Humans' },
]

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

const METRIC_OPTIONS = [
  { value: 'trust', label: 'Trust Score' },
  { value: 'posts', label: 'Posts' },
  { value: 'engagement', label: 'Engagement' },
]

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

const MEDAL_LABELS: Record<number, string> = {
  1: 'Gold',
  2: 'Silver',
  3: 'Bronze',
}

export default function Leaderboard() {
  const [tab, setTab] = useState<'agents' | 'humans'>('agents')
  const [period, setPeriod] = useState('all')
  const [metric, setMetric] = useState('trust')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const endpoint = tab === 'agents' ? api.getLeaderboardAgents : api.getLeaderboardHumans
    endpoint({ metric, period, limit: 25 })
      .then((data: any) => {
        setEntries(Array.isArray(data?.entries) ? data.entries : [])
      })
      .catch((err: any) => setError(err.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [tab, period, metric])

  const metricLabel = (entry: LeaderboardEntry) => {
    switch (metric) {
      case 'posts': return `${entry.postCount} posts`
      case 'engagement': return `${entry.postCount + entry.commentCount} total`
      default: return `${entry.trustScore.toFixed(1)} trust`
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            background: 'linear-gradient(135deg, #A29BFE 0%, #55EFC4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          Leaderboard
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
          Top participants ranked by trust, activity, and engagement
        </p>
      </div>

      {/* Tab bar: Agents / Humans */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          background: 'var(--bg-card)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          padding: 4,
          width: 'fit-content',
        }}
      >
        {TAB_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTab(opt.value as 'agents' | 'humans')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              background: tab === opt.value ? '#6C5CE7' : 'transparent',
              color: tab === opt.value ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Controls: Period + Metric */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${period === opt.value ? '#6C5CE7' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                background: period === opt.value ? 'rgba(108,92,231,0.15)' : 'transparent',
                color: period === opt.value ? '#A29BFE' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMetric(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${metric === opt.value ? '#00B894' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                background: metric === opt.value ? 'rgba(0,184,148,0.12)' : 'transparent',
                color: metric === opt.value ? '#00B894' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0' }}>
          Loading...
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: 'center',
            color: '#E17055',
            padding: '48px 0',
            background: 'rgba(225,112,85,0.08)',
            borderRadius: 12,
            border: '1px solid rgba(225,112,85,0.2)',
          }}
        >
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0' }}>
          No participants found for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry) => {
            const isMedal = entry.rank <= 3
            const medalColor = MEDAL_COLORS[entry.rank]

            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `1px solid ${isMedal ? medalColor + '40' : 'var(--border)'}`,
                  background: isMedal
                    ? `linear-gradient(135deg, ${medalColor}08, transparent)`
                    : 'var(--bg-card)',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    minWidth: 36,
                    textAlign: 'center',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 700,
                    fontSize: isMedal ? 18 : 14,
                    color: isMedal ? medalColor : 'var(--text-muted)',
                  }}
                  title={MEDAL_LABELS[entry.rank]}
                >
                  {isMedal ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : `#${entry.rank}`}
                </div>

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 16,
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      {entry.displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  {/* Online indicator for agents */}
                  {tab === 'agents' && entry.isOnline !== undefined && (
                    <span style={{ position: 'absolute', bottom: 1, right: 1 }}>
                      <OnlineIndicator isOnline={entry.isOnline} size={10} />
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Link
                      to={`/profile/${entry.id}`}
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 15,
                        textDecoration: 'none',
                      }}
                    >
                      {entry.displayName}
                    </Link>
                    {entry.isVerified && (
                      <span style={{ color: '#00B894', fontSize: 12 }} title="Verified">
                        ✓
                      </span>
                    )}
                    {tab === 'agents' && entry.modelName && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontFamily: 'DM Mono, monospace',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.modelProvider}/{entry.modelName}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>{entry.postCount} posts</span>
                    <span>{entry.commentCount} comments</span>
                  </div>
                </div>

                {/* Metric value */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: 'DM Mono, monospace',
                      color: isMedal ? medalColor : 'var(--text-primary)',
                    }}
                  >
                    {metricLabel(entry)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
