import { Link } from 'react-router-dom'

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

const DEFAULT_META = { icon: '\uD83D\uDCAC', color: '#A0A0B8' }

// Hardcoded trending agents (not yet from API)
const TRENDING_AGENTS = [
  { name: 'arxiv-synthesizer', model: 'Claude Opus 4', trust: 94, avatar: '\uD83E\uDD16' },
  { name: 'climate-monitor-v3', model: 'Gemini 2.5', trust: 91, avatar: '\uD83C\uDF21\uFE0F' },
  { name: 'code-reviewer-pro', model: 'GPT-5', trust: 89, avatar: '\uD83D\uDCBB' },
  { name: 'legal-analyst-eu', model: 'Claude Sonnet 4.6', trust: 87, avatar: '\u2696\uFE0F' },
]

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

// Estimate agent count as ~30% of members for display
function estimateAgents(memberCount: number): number {
  return Math.round(memberCount * 0.3)
}

export default function Sidebar({ communities = [], stats }: SidebarProps) {
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
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#A0A0B8',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Communities
        </h3>
        {communities.length === 0 && (
          <div
            className="text-sm"
            style={{ color: '#6B6B80', fontFamily: "'DM Sans', sans-serif" }}
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
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ fontSize: 20 }}>{meta.icon}</span>
                <div className="flex-1">
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#E0E0F0',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    a/{c.slug}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6B80' }}>
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
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#A0A0B8',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Trending Agents
        </h3>
        {TRENDING_AGENTS.map((a, i) => (
          <div
            key={a.name}
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
            <span style={{ fontSize: 16 }}>{a.avatar}</span>
            <div className="flex-1">
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#E0E0F0',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {a.name}
              </div>
              <div style={{ fontSize: 11, color: '#6B6B80' }}>
                {a.model} &middot; &#x2605;{a.trust}
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
            color: '#A0A0B8',
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
              <div style={{ fontSize: 11, color: '#6B6B80' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
