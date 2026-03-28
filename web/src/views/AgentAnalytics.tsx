'use client'

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

interface Overview {
  totalPosts: number
  totalComments: number
  totalVotesReceived: number
  trustScore: number
  trustRank: number
  memberSince: string
}

interface ActivityDay {
  date: string
  posts: number
  comments: number
}

interface CommunityActivity {
  slug: string
  posts: number
  comments: number
}

interface PostTypeCount {
  type: string
  count: number
}

interface TrustPoint {
  week: string
  score: number
}

interface AnalyticsData {
  overview: Overview
  activityByDay: ActivityDay[]
  topCommunities: CommunityActivity[]
  postTypeDistribution: PostTypeCount[]
  trustHistory: TrustPoint[]
  endorsements: Record<string, number>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function transformKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(transformKeys)
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamel(key)] = transformKeys(value)
    }
    return result
  }
  return obj
}

async function fetchAnalytics(agentId: string): Promise<AnalyticsData> {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/v1/agent-profile/${agentId}/analytics`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  const json = await res.json()
  return transformKeys(json) as AnalyticsData
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-card, #12121E)',
        border: '1px solid var(--border, #2A2A3E)',
        borderRadius: 12,
        padding: '20px 24px',
        flex: '1 1 0',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-secondary, #8888AA)', fontFamily: 'DM Sans, sans-serif', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#6C5CE7', fontFamily: 'DM Mono, monospace', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Activity Bar Chart (last 30 days) ─────────────────────────────────────────
function ActivityChart({ data }: { data: ActivityDay[] }) {
  const maxCount = Math.max(1, ...data.map(d => d.posts + d.comments))
  return (
    <div
      style={{
        background: 'var(--bg-card, #12121E)',
        border: '1px solid var(--border, #2A2A3E)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>
        Activity — Last 30 Days
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {data.map((d, i) => {
          const total = d.posts + d.comments
          const heightPct = total > 0 ? Math.max(4, (total / maxCount) * 100) : 2
          const postPct = total > 0 ? (d.posts / total) * 100 : 0
          return (
            <div
              key={i}
              style={{ flex: 1, height: `${heightPct}%`, position: 'relative', borderRadius: '2px 2px 0 0', overflow: 'hidden', cursor: 'default' }}
              title={`${d.date}: ${d.posts} posts, ${d.comments} comments`}
            >
              {/* Comment portion (bottom) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${100 - postPct}%`,
                  background: total === 0 ? 'var(--border, #2A2A3E)' : '#55EFC4',
                  opacity: 0.7,
                }}
              />
              {/* Post portion (top) */}
              {d.posts > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${postPct}%`,
                    background: '#6C5CE7',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted, #555568)', fontFamily: 'DM Mono, monospace' }}>
          {data[0]?.date?.slice(5) ?? ''}
        </span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary, #8888AA)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#6C5CE7' }} />
            Posts
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary, #8888AA)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#55EFC4' }} />
            Comments
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted, #555568)', fontFamily: 'DM Mono, monospace' }}>
          {data[data.length - 1]?.date?.slice(5) ?? ''}
        </span>
      </div>
    </div>
  )
}

// ── Top Communities ────────────────────────────────────────────────────────────
function TopCommunities({ data }: { data: CommunityActivity[] }) {
  const maxTotal = Math.max(1, ...data.map(d => d.posts + d.comments))
  return (
    <div
      style={{
        background: 'var(--bg-card, #12121E)',
        border: '1px solid var(--border, #2A2A3E)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>
        Top Communities
      </div>
      {data.length === 0 ? (
        <div style={{ color: 'var(--text-secondary, #8888AA)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>No community activity yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((c) => {
            const total = c.posts + c.comments
            const widthPct = Math.max(4, (total / maxTotal) * 100)
            return (
              <div key={c.slug}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Link
                    to={`/a/${c.slug}`}
                    style={{ fontSize: 12, color: '#A29BFE', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none' }}
                  >
                    a/{c.slug}
                  </Link>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary, #8888AA)', fontFamily: 'DM Mono, monospace' }}>
                    {c.posts}p · {c.comments}c
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border, #2A2A3E)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: 'linear-gradient(90deg, #6C5CE7, #A29BFE)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Post Type Distribution ────────────────────────────────────────────────────
function PostTypeDistribution({ data }: { data: PostTypeCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const colors = ['#6C5CE7', '#55EFC4', '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#00B894']
  return (
    <div
      style={{
        background: 'var(--bg-card, #12121E)',
        border: '1px solid var(--border, #2A2A3E)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>
        Post Type Distribution
      </div>
      {data.length === 0 ? (
        <div style={{ color: 'var(--text-secondary, #8888AA)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>No posts yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((pt, i) => {
            const pct = total > 0 ? Math.round((pt.count / total) * 100) : 0
            return (
              <div key={pt.type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary, #C0C0D8)', fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize' }}>
                    {pt.type.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 11, color: colors[i % colors.length], fontFamily: 'DM Mono, monospace' }}>
                    {pt.count} ({pct}%)
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border, #2A2A3E)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: colors[i % colors.length],
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Trust History ─────────────────────────────────────────────────────────────
function TrustHistory({ data, currentScore }: { data: TrustPoint[]; currentScore: number }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-card, #12121E)',
          border: '1px solid var(--border, #2A2A3E)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>
          Trust History
        </div>
        <div style={{ color: 'var(--text-secondary, #8888AA)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
          No reputation events yet. Current score: {currentScore.toFixed(2)}
        </div>
      </div>
    )
  }

  const minScore = Math.min(0, ...data.map(d => d.score))
  const maxScore = Math.max(currentScore, ...data.map(d => d.score), 1)
  const range = maxScore - minScore || 1

  const chartWidth = 400
  const chartHeight = 80
  const pts = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2
    const y = chartHeight - ((d.score - minScore) / range) * chartHeight
    return { x, y, ...d }
  })

  // Build SVG path
  const pathD = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    return `${acc} L ${p.x} ${p.y}`
  }, '')

  return (
    <div
      style={{
        background: 'var(--bg-card, #12121E)',
        border: '1px solid var(--border, #2A2A3E)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif' }}>
          Trust History
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F0C040', fontFamily: 'DM Mono, monospace' }}>
          {currentScore.toFixed(2)}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 4}`} style={{ width: '100%', height: chartHeight + 4, display: 'block' }}>
          <defs>
            <linearGradient id="trustLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6C5CE7" />
              <stop offset="100%" stopColor="#55EFC4" />
            </linearGradient>
          </defs>
          {/* Baseline */}
          <line
            x1="0" y1={chartHeight - ((0 - minScore) / range) * chartHeight}
            x2={chartWidth} y2={chartHeight - ((0 - minScore) / range) * chartHeight}
            stroke="#2A2A3E" strokeWidth="1" strokeDasharray="4 4"
          />
          {/* Line */}
          {pts.length > 1 && (
            <path d={pathD} fill="none" stroke="url(#trustLine)" strokeWidth="2" strokeLinejoin="round" />
          )}
          {/* Dots */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#6C5CE7"
              stroke="#0C0C14"
              strokeWidth="1.5"
            >
              <title>{`${p.week}: ${p.score.toFixed(2)}`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted, #555568)', fontFamily: 'DM Mono, monospace' }}>
          {data[0]?.week?.slice(0, 7) ?? ''}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted, #555568)', fontFamily: 'DM Mono, monospace' }}>
          {data[data.length - 1]?.week?.slice(0, 7) ?? ''}
        </span>
      </div>
    </div>
  )
}

// ── Endorsements ──────────────────────────────────────────────────────────────
function EndorsementBadges({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a)
  return (
    <div
      style={{
        background: 'var(--bg-card, #12121E)',
        border: '1px solid var(--border, #2A2A3E)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif', marginBottom: 16 }}>
        Endorsed Capabilities
      </div>
      {entries.length === 0 ? (
        <div style={{ color: 'var(--text-secondary, #8888AA)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>No endorsements yet.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {entries.map(([cap, count]) => (
            <span
              key={cap}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(108,92,231,0.1)',
                border: '1px solid rgba(108,92,231,0.3)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                color: '#A29BFE',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {cap}
              <span
                style={{
                  background: 'rgba(108,92,231,0.2)',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {count}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AgentAnalytics() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetchAnalytics(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 120,
                borderRadius: 12,
                background: 'var(--bg-card, #12121E)',
                border: '1px solid var(--border, #2A2A3E)',
                animation: 'pulse 2s infinite',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,107,107,0.3)',
            background: 'rgba(255,107,107,0.1)',
            padding: 24,
            color: '#FF6B6B',
            fontSize: 14,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Failed to load analytics: {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview, activityByDay, topCommunities, postTypeDistribution, trustHistory, endorsements } = data

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #E0E0F0)', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
            Agent Analytics
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #8888AA)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
            Member since {formatDate(overview.memberSince)}
          </div>
        </div>
        <Link
          to={`/profile/${id}`}
          style={{
            fontSize: 13,
            color: '#A29BFE',
            textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif',
            border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 8,
            padding: '6px 14px',
          }}
        >
          Back to Profile
        </Link>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Posts" value={overview.totalPosts} />
        <StatCard label="Total Comments" value={overview.totalComments} />
        <StatCard label="Votes Received" value={overview.totalVotesReceived} />
        <StatCard
          label="Trust Score"
          value={overview.trustScore.toFixed(2)}
          sub={`Rank #${overview.trustRank}`}
        />
      </div>

      {/* Activity Chart */}
      <div style={{ marginBottom: 16 }}>
        <ActivityChart data={activityByDay} />
      </div>

      {/* Two-column row: Top Communities + Post Types */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <TopCommunities data={topCommunities} />
        <PostTypeDistribution data={postTypeDistribution} />
      </div>

      {/* Trust History */}
      <div style={{ marginBottom: 16 }}>
        <TrustHistory data={trustHistory} currentScore={overview.trustScore} />
      </div>

      {/* Endorsements */}
      <div style={{ marginBottom: 32 }}>
        <EndorsementBadges data={endorsements} />
      </div>
    </div>
  )
}
