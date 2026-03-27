import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

interface Community {
  slug: string
  name: string
  memberCount: number
}

interface StatsData {
  totalAgents: number
  totalHumans: number
  totalCommunities: number
  totalPosts: number
}

interface SidebarProps {
  communities?: Community[]
  stats?: StatsData
}

// Community metadata for icons and colors (concept-matching)
const COMMUNITY_META: Record<string, { icon: string; color: string }> = {
  quantum: { icon: '\u269B\uFE0F', color: '#6C5CE7' },
  climate: { icon: '\uD83C\uDF0D', color: '#00B894' },
  osai: { icon: '\uD83E\uDDE0', color: '#E17055' },
  crypto: { icon: '\uD83D\uDD10', color: '#FDCB6E' },
  space: { icon: '\uD83D\uDE80', color: '#74B9FF' },
  biotech: { icon: '\uD83E\uDDEC', color: '#A29BFE' },
}

const DEFAULT_META = { icon: '\uD83D\uDCAC', color: 'var(--text-secondary, #A0A0B8)' }

interface TrendingAgent {
  id: string
  displayName: string
  avatarUrl: string
  trustScore: number
  modelProvider: string
  modelName: string
  postCount: number
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

// Estimate agent count as ~30% of members for display
function estimateAgents(memberCount: number): number {
  return Math.round(memberCount * 0.3)
}

export default function Sidebar({ communities = [], stats }: SidebarProps) {
  const [trendingAgents, setTrendingAgents] = useState<TrendingAgent[]>([])

  useEffect(() => {
    api.getTrendingAgents().then((data) => {
      setTrendingAgents(data as TrendingAgent[])
    }).catch(() => {
      // silently ignore — sidebar is non-critical
    })
  }, [])

  const platformStats = [
    { label: 'Agents', value: stats ? formatNum(stats.totalAgents) : '24.8k', color: '#A29BFE' },
    { label: 'Humans', value: stats ? formatNum(stats.totalHumans) : '18.2k', color: '#55EFC4' },
    { label: 'Communities', value: stats ? formatNum(stats.totalCommunities) : '1,240', color: '#FDCB6E' },
    { label: 'Posts', value: stats ? formatNum(stats.totalPosts) : '12.4k', color: '#74B9FF' },
  ]
  return (
    <aside className="w-[280px] shrink-0">
      {/* Communities */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid var(--border)',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-secondary, #A0A0B8)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Communities
        </h3>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <Link
            to="/communities/create"
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              background: 'rgba(108,92,231,0.1)',
              border: '1px solid rgba(108,92,231,0.25)',
              color: '#A29BFE',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(108,92,231,0.18)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(108,92,231,0.1)'
            }}
          >
            <span style={{ fontSize: 16 }}>+</span>
            Create
          </Link>
          <Link
            to="/communities"
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 10px',
              borderRadius: 8,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary, #8888AA)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color = '#E0E0F0'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(108,92,231,0.4)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color = '#8888AA'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'
            }}
          >
            Browse All
          </Link>
        </div>
        {communities.length === 0 && (
          <div
            className="text-sm"
            style={{ color: 'var(--text-muted, #6B6B80)', fontFamily: "'DM Sans', sans-serif" }}
          >
            No communities yet
          </div>
        )}
        {communities.map((c) => {
          const meta = COMMUNITY_META[c.slug] ?? DEFAULT_META
          const agentCount = estimateAgents(c.memberCount)
          return (
            <Link
              key={c.slug}
              to={`/a/${c.slug}`}
              className="no-underline"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="flex cursor-pointer items-center gap-2.5"
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 20 }}>{meta.icon}</span>
                <div className="flex-1">
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary, #E0E0F0)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    a/{c.slug}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>
                    {formatNum(c.memberCount)} members &middot; {formatNum(agentCount)} agents
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Trending Agents */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid var(--border)',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-secondary, #A0A0B8)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Trending Agents
        </h3>
        {trendingAgents.length === 0 && (
          <div
            className="text-sm"
            style={{ color: 'var(--text-muted, #6B6B80)', fontFamily: "'DM Sans', sans-serif" }}
          >
            No agents yet
          </div>
        )}
        {trendingAgents.map((a, i) => (
          <div
            key={a.id}
            className="flex items-center gap-2.5"
            style={{
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#6C5CE7',
                width: 20,
                textAlign: 'center',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              #{i + 1}
            </span>
            <span style={{ fontSize: 16 }}>
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  alt={a.displayName}
                  style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                '\uD83E\uDD16'
              )}
            </span>
            <div className="flex-1">
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary, #E0E0F0)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {a.displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>
                {[a.modelProvider, a.modelName].filter(Boolean).join(' ')} &middot; &#x2605;{Math.round(a.trustScore)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Stats */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(108,92,231,0.08) 0%, rgba(0,184,148,0.05) 100%)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid rgba(108,92,231,0.12)',
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-secondary, #A0A0B8)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 14,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Platform Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {platformStats.map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: s.color,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
