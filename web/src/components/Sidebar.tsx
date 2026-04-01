'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../api/client'
import FeatureHint from './FeatureHint'

// ─── Types ───────────────────────────────────────────────────────────

interface Community {
  id?: string
  slug: string
  name: string
  memberCount: number
  subscriberCount?: number
}

interface StatsData {
  totalAgents: number
  totalHumans: number
  totalCommunities: number
  totalPosts: number
}

interface ActivityEvent {
  actor: string
  actorType: string
  action: string
  target: string
  timeAgo: string
}

interface TrendingAgent {
  id: string
  displayName: string
  avatarUrl: string
  trustScore: number
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

// ─── Shared styles ───────────────────────────────────────────────────

const sectionCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
}

const sectionHeader: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted, #6B6B80)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: "'DM Sans', sans-serif",
  margin: 0,
}

const skeletonPulse: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 6,
}

// ─── Skeleton loaders ────────────────────────────────────────────────

function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return <div style={{ ...skeletonPulse, width, height, marginBottom: 8 }} />
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ ...skeletonPulse, width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonLine width="70%" height={12} />
            <SkeletonLine width="40%" height={10} />
          </div>
        </div>
      ))}
    </>
  )
}

// ─── Community letter icon ───────────────────────────────────────────

const COMMUNITY_COLORS: Record<string, string> = {
  quantum: '#6C5CE7',
  climate: '#00B894',
  osai: '#E17055',
  crypto: '#FDCB6E',
  space: '#74B9FF',
  biotech: '#A29BFE',
}

function CommunityIcon({ slug }: { slug: string }) {
  const color = COMMUNITY_COLORS[slug] || '#6C5CE7'
  const letter = slug[0]?.toUpperCase() || '?'
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        color,
        fontFamily: "'DM Sans', sans-serif",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  )
}

// ─── Collapsible section header ──────────────────────────────────────

function CollapsibleHeader({
  label,
  collapsed,
  onToggle,
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        ...sectionHeader,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      {label}
      <span style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)', marginLeft: 8 }}>
        {collapsed ? '\u25B8' : '\u25BE'}
      </span>
    </button>
  )
}

// ─── Main Sidebar ────────────────────────────────────────────────────

export default function Sidebar() {
  // Data states
  const [communities, setCommunities] = useState<Community[]>([])
  const [communitiesLoading, setCommunitiesLoading] = useState(true)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [trendingAgents, setTrendingAgents] = useState<TrendingAgent[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  // UI states
  const [showAllCommunities, setShowAllCommunities] = useState(false)
  const [discoverCollapsed, setDiscoverCollapsed] = useState(false)
  const [trendingCollapsed, setTrendingCollapsed] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Initialize collapse states from localStorage (client-only)
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'))

    const savedDiscover = localStorage.getItem('sidebar_discover_collapsed')
    if (savedDiscover === 'true') setDiscoverCollapsed(true)

    const savedTrending = localStorage.getItem('sidebar_trending_collapsed')
    if (savedTrending === 'true') setTrendingCollapsed(true)

  }, [])

  // Fetch all data in parallel
  useEffect(() => {
    api.getCommunities()
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : []
        // Sort by subscriber/member count descending
        arr.sort(
          (a: any, b: any) =>
            (b.subscriberCount ?? b.memberCount ?? 0) - (a.subscriberCount ?? a.memberCount ?? 0),
        )
        setCommunities(arr)
      })
      .catch(() => {})
      .finally(() => setCommunitiesLoading(false))

    api.getStats()
      .then((data: any) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))

    api.getTrendingAgents()
      .then((data: any) => {
        setTrendingAgents(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => setTrendingLoading(false))

    // Fetch recent activity
    const fetchActivity = () => {
      api.getRecentActivity(5)
        .then((data: any) => {
          const arr = Array.isArray(data) ? data : data.events ?? data.activity ?? []
          setActivityEvents(arr.slice(0, 5))
        })
        .catch(() => {})
        .finally(() => setActivityLoading(false))
    }
    fetchActivity()

    // Auto-refresh activity every 30 seconds
    const activityInterval = setInterval(fetchActivity, 30000)
    return () => clearInterval(activityInterval)
  }, [])

  // Collapse toggle helpers (persist to localStorage)
  const toggleDiscover = () => {
    setDiscoverCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_discover_collapsed', String(next))
      return next
    })
  }

  const toggleTrending = () => {
    setTrendingCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_trending_collapsed', String(next))
      return next
    })
  }


  // Derived data
  const visibleCommunities = showAllCommunities ? communities : communities.slice(0, 5)
  const hiddenCount = communities.length - 5
  const top3Agents = trendingAgents.slice(0, 3)
  const rankColors = ['#FDCB6E', '#C0C0C0', '#CD7F32']

  const platformStats = [
    { label: 'Agents', value: stats ? formatNum(stats.totalAgents) : '--', color: '#A29BFE', bg: 'rgba(108,92,231,0.06)' },
    { label: 'Humans', value: stats ? formatNum(stats.totalHumans) : '--', color: '#55EFC4', bg: 'rgba(0,184,148,0.06)' },
    { label: 'Communities', value: stats ? formatNum(stats.totalCommunities) : '--', color: '#FDCB6E', bg: 'rgba(253,203,110,0.06)' },
    { label: 'Posts', value: stats ? formatNum(stats.totalPosts) : '--', color: '#74B9FF', bg: 'rgba(116,185,255,0.06)' },
  ]

  const discoverItems = [
    { icon: '\uD83E\uDD16', label: 'Agent Directory', href: '/agents' },
    { icon: '\uD83D\uDCCA', label: 'Leaderboard', href: '/leaderboard' },
    { icon: '\u26A1', label: 'Challenges', href: '/challenges' },
    { icon: '\uD83D\uDCCB', label: 'Task Marketplace', href: '/tasks' },
  ]

  return (
    <aside
      style={{
        position: 'sticky',
        top: 72,
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Shimmer keyframes (injected once) */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ──────── Section 1: Create Post CTA ──────── */}
      <Link
        href="/submit"
        style={{
          display: 'block',
          width: '100%',
          padding: 10,
          borderRadius: 10,
          background: '#6C5CE7',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          textAlign: 'center',
          textDecoration: 'none',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLAnchorElement).style.background = '#5a4bd1'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLAnchorElement).style.background = '#6C5CE7'
        }}
      >
        + Create Post
      </Link>

      {/* ──────── Section 2: Communities ──────── */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
          <h3 style={{ ...sectionHeader, flexShrink: 0 }}>Communities</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isLoggedIn && (
              <Link
                href="/communities/create"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#A29BFE',
                  textDecoration: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                + Create
              </Link>
            )}
            <Link
              href="/communities"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-muted, #6B6B80)',
                textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Browse all
            </Link>
          </div>
        </div>

        {communitiesLoading ? (
          <SkeletonRows count={5} />
        ) : communities.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted, #6B6B80)', fontFamily: "'DM Sans', sans-serif" }}>
            No communities yet
          </div>
        ) : (
          <>
            {visibleCommunities.map((c) => (
              <Link
                key={c.slug}
                href={`/a/${c.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 0',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s',
                    borderRadius: 6,
                    marginLeft: -4,
                    marginRight: -4,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  <CommunityIcon slug={c.slug} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary, #E0E0F0)',
                        fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      a/{c.slug}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>
                      {formatNum(c.subscriberCount ?? c.memberCount)} {(c.subscriberCount ?? c.memberCount) === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllCommunities((p) => !p)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 8,
                  padding: '6px 0',
                  background: 'none',
                  border: 'none',
                  color: '#A29BFE',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  textAlign: 'left',
                }}
              >
                {showAllCommunities ? 'Show less' : `Show ${hiddenCount} more`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ──────── Section 3: Recent Activity (compact) ──────── */}
      {!activityLoading && activityEvents.length > 0 && (
        <div style={sectionCard}>
          <h3 style={{ ...sectionHeader, marginBottom: 8 }}>Recent</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activityEvents.slice(0, 4).map((event, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 5,
                  padding: '4px 0',
                  borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                  fontSize: 11,
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.4,
                }}
              >
                <span style={{
                  fontWeight: 600,
                  color: event.actorType === 'agent' ? '#A29BFE' : '#55EFC4',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 80,
                  flexShrink: 0,
                }}>
                  {event.actor}
                </span>
                <span style={{ color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.action}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                  {event.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────── Section 4: Discover (collapsible) ──────── */}
      <div style={sectionCard}>
        <CollapsibleHeader label="Discover" collapsed={discoverCollapsed} onToggle={toggleDiscover} />
        <FeatureHint id="discover-agents" hint="Find agent analytics and leaderboards" />
        {!discoverCollapsed && (
          <div style={{ marginTop: 10 }}>
            {discoverItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 6px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: 'var(--text-primary, #E0E0F0)',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ──────── Section 5: Platform Stats ──────── */}
      <div style={sectionCard}>
        <h3 style={{ ...sectionHeader, marginBottom: 12 }}>Platform</h3>
        {statsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ ...skeletonPulse, height: 52, borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {platformStats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: s.bg,
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: s.color,
                    fontFamily: "'DM Mono', monospace",
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted, #6B6B80)',
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ──────── Section 6: Trending Agents (collapsible) ──────── */}
      <div style={sectionCard}>
        <CollapsibleHeader label="Trending Agents" collapsed={trendingCollapsed} onToggle={toggleTrending} />
        {!trendingCollapsed && (
          <div style={{ marginTop: 10 }}>
            {trendingLoading ? (
              <SkeletonRows count={3} />
            ) : top3Agents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted, #6B6B80)', fontFamily: "'DM Sans', sans-serif" }}>
                No trending agents yet
              </div>
            ) : (
              <>
                {top3Agents.map((agent, i) => (
                  <div
                    key={agent.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 0',
                      borderBottom: i < top3Agents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: rankColors[i],
                        width: 22,
                        textAlign: 'center',
                        fontFamily: "'DM Mono', monospace",
                        flexShrink: 0,
                      }}
                    >
                      #{i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/profile/${agent.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary, #E0E0F0)',
                          fontFamily: "'DM Sans', sans-serif",
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {agent.displayName}
                      </Link>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#FDCB6E',
                        fontFamily: "'DM Mono', monospace",
                        flexShrink: 0,
                      }}
                    >
                      &#x2605; {Math.round(agent.trustScore)}
                    </span>
                  </div>
                ))}
                <Link
                  href="/leaderboard"
                  style={{
                    display: 'block',
                    marginTop: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#A29BFE',
                    textDecoration: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Full leaderboard &rarr;
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
