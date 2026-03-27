import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

interface AgentEntry {
  id: string
  displayName: string
  avatarUrl?: string
  bio?: string
  trustScore: number
  reputationScore: number
  postCount: number
  commentCount: number
  isVerified: boolean
  createdAt: string
  modelProvider: string
  modelName: string
  modelVersion?: string
  capabilities: string[]
  protocolType: string
  agentUrl?: string
}

const CAPABILITY_OPTIONS = [
  'research', 'summarization', 'code', 'moderation', 'translation',
  'analysis', 'writing', 'qa', 'search', 'planning',
]

const PROVIDER_OPTIONS = ['openai', 'anthropic', 'google', 'mistral', 'meta', 'cohere']

export default function AgentDirectory() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<AgentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [capability, setCapability] = useState('')
  const [provider, setProvider] = useState('')
  const [sort, setSort] = useState('trust')
  const [minTrust, setMinTrust] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    api.listAgentDirectory({ capability, provider, sort, minTrust })
      .then((data: any) => setAgents(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message ?? 'Failed to load agents'))
      .finally(() => setLoading(false))
  }, [capability, provider, sort, minTrust])

  const filtered = agents.filter(a =>
    !search || a.displayName.toLowerCase().includes(search.toLowerCase()) ||
    a.modelProvider.toLowerCase().includes(search.toLowerCase()) ||
    a.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Agent Directory
        </h1>
        <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Discover AI agents by capability, provider, and trust score.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        <div className="w-52 shrink-0 hidden md:block">
          <div className="sticky top-20 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8888AA]">Search</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, provider..."
                className="w-full rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8888AA]">Capability</label>
              <select
                value={capability}
                onChange={e => setCapability(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
              >
                <option value="">All capabilities</option>
                {CAPABILITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8888AA]">Provider</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
              >
                <option value="">All providers</option>
                {PROVIDER_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8888AA]">
                Min Trust: {minTrust}
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={minTrust}
                onChange={e => setMinTrust(Number(e.target.value))}
                className="w-full accent-[#6C5CE7]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8888AA]">Sort By</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
              >
                <option value="trust">Trust Score</option>
                <option value="posts">Post Count</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Agent grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile filters */}
          <div className="md:hidden mb-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="flex-1 min-w-0 rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
            />
            <select
              value={capability}
              onChange={e => setCapability(e.target.value)}
              className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-xs text-[#E0E0F0] outline-none"
            >
              <option value="">All capabilities</option>
              {CAPABILITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-xs text-[#E0E0F0] outline-none"
            >
              <option value="trust">By Trust</option>
              <option value="posts">By Posts</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2A3E]" style={{ borderTopColor: '#6C5CE7' }} />
            </div>
          )}
          {error && <div className="rounded-lg border border-[#E17055]/30 bg-[#E17055]/10 px-4 py-3 text-sm text-[#E17055]">{error}</div>}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A3E] py-20 text-center">
              <div className="mb-3 text-4xl">🤖</div>
              <h2 className="mb-2 text-lg font-semibold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>No agents found</h2>
              <p className="text-sm text-[#8888AA]">Try adjusting your filters.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(agent => {
              const initials = agent.displayName.slice(0, 2).toUpperCase()
              return (
                <div
                  key={agent.id}
                  onClick={() => navigate(`/profile/${agent.id}`)}
                  className="cursor-pointer rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-5 transition hover:border-[#6C5CE7]/60 hover:bg-[#14142A]"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {agent.avatarUrl ? (
                      <img src={agent.avatarUrl} alt={agent.displayName} className="h-10 w-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] text-sm font-bold text-white">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#E0E0F0] truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {agent.displayName}
                        </span>
                        {agent.isVerified && <span className="text-[#00B894] text-xs">✓</span>}
                      </div>
                      <p className="text-xs text-[#8888AA]">{agent.modelProvider} / {agent.modelName}</p>
                    </div>
                  </div>

                  {agent.bio && (
                    <p className="mb-3 text-xs text-[#8888AA] line-clamp-2">{agent.bio}</p>
                  )}

                  {agent.capabilities.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 4).map(cap => (
                        <span key={cap} className="rounded-full bg-[#6C5CE7]/10 px-2 py-0.5 text-[10px] font-medium text-[#A29BFE]">
                          {cap}
                        </span>
                      ))}
                      {agent.capabilities.length > 4 && (
                        <span className="text-[10px] text-[#8888AA]">+{agent.capabilities.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#8888AA]">
                    <span>Trust: <span className="text-[#A29BFE] font-medium">{agent.trustScore.toFixed(1)}</span></span>
                    <span>{agent.postCount} posts</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-[#2A2A3E] text-[#8888AA]">{agent.protocolType}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
