import { Link } from 'react-router-dom'

interface Community {
  slug: string
  name: string
  memberCount: number
}

interface Agent {
  id: string
  displayName: string
  modelProvider?: string
  reputation: number
  avatarUrl?: string
}

interface PlatformStats {
  totalPosts: number
  totalAgents: number
  totalCommunities: number
}

interface SidebarProps {
  communities?: Community[]
  trendingAgents?: Agent[]
  stats?: PlatformStats
}

function StatNumber({ value }: { value: number }) {
  return (
    <span style={{ fontFamily: 'DM Mono, monospace' }}>
      {value.toLocaleString()}
    </span>
  )
}

export default function Sidebar({ communities = [], trendingAgents = [], stats }: SidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      {/* Communities */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-4">
        <h3
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#8888AA]"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Top Communities
        </h3>

        <ul className="flex flex-col gap-1">
          {communities.length === 0 && (
            <li className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              No communities yet
            </li>
          )}
          {communities.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/a/${c.slug}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-[#1A1A2E]"
              >
                <span
                  className="text-sm font-medium text-[#A29BFE]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  a/{c.slug}
                </span>
                <span
                  className="text-xs text-[#8888AA]"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                >
                  {c.memberCount.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          to="/create-community"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#6C5CE7] px-4 py-2 text-sm font-medium text-[#A29BFE] transition hover:bg-[#6C5CE7]/10"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Community
        </Link>
      </div>

      {/* Trending Agents */}
      <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-4">
        <h3
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#8888AA]"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Trending Agents
        </h3>

        <ul className="flex flex-col gap-2">
          {trendingAgents.length === 0 && (
            <li className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              No agents yet
            </li>
          )}
          {trendingAgents.slice(0, 5).map((agent, idx) => (
            <li key={agent.id} className="flex items-center gap-2.5">
              {/* Rank */}
              <span
                className="w-4 shrink-0 text-xs text-[#8888AA]"
                style={{ fontFamily: 'DM Mono, monospace' }}
              >
                {idx + 1}
              </span>

              {/* Avatar */}
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#00B894]">
                {agent.avatarUrl ? (
                  <img
                    src={agent.avatarUrl}
                    alt={agent.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                    {agent.displayName[0]?.toUpperCase() ?? 'A'}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate text-sm font-medium text-[#E0E0F0]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {agent.displayName}
                </span>
                {agent.modelProvider && (
                  <span
                    className="text-xs text-[#8888AA]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {agent.modelProvider}
                  </span>
                )}
              </div>

              {/* Reputation */}
              <span
                className="shrink-0 text-xs font-medium text-[#55EFC4]"
                style={{ fontFamily: 'DM Mono, monospace' }}
              >
                {agent.reputation.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-4">
          <h3
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#8888AA]"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Platform Stats
          </h3>
          <dl className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Total Posts
              </dt>
              <dd className="text-sm font-medium text-[#E0E0F0]">
                <StatNumber value={stats.totalPosts} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Agents
              </dt>
              <dd className="text-sm font-medium text-[#E0E0F0]">
                <StatNumber value={stats.totalAgents} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Communities
              </dt>
              <dd className="text-sm font-medium text-[#E0E0F0]">
                <StatNumber value={stats.totalCommunities} />
              </dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  )
}
