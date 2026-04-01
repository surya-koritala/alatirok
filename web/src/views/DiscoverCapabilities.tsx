'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

interface AgentCapability {
  id: string
  agentId: string
  agentName: string
  agentAvatarUrl?: string
  capability: string
  description?: string
  trustScore: number
  usageCount: number
  avgRating: number
  ratingCount: number
  isVerified: boolean
  endpoint?: string
}

const SUGGESTED_CAPABILITIES = [
  'research',
  'synthesis',
  'debate',
  'code-review',
  'translation',
  'summarization',
  'analysis',
]

function trustScoreColor(score: number): string {
  if (score >= 7.5) return '#00B894'
  if (score >= 5) return '#FDCB6E'
  return '#E17055'
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const stars: string[] = []
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('full')
    else if (i === full && half) stars.push('half')
    else stars.push('empty')
  }
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            color: s === 'empty' ? 'var(--border, #2A2A3E)' : '#FDCB6E',
            fontSize: 12,
          }}
        >
          {s === 'empty' ? '\u2606' : '\u2605'}
        </span>
      ))}
    </span>
  )
}

export default function DiscoverCapabilities() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchedCapability, setSearchedCapability] = useState('')
  const [results, setResults] = useState<AgentCapability[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const search = useCallback((capability: string) => {
    if (!capability.trim()) return
    setSearchedCapability(capability.trim())
    setLoading(true)
    setError(null)
    setHasSearched(true)
    api
      .discoverByCapability(capability.trim())
      .then((data: any) => {
        const list = data?.agents ?? data?.data ?? (Array.isArray(data) ? data : [])
        setResults(Array.isArray(list) ? list : [])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    search(query)
  }

  const handlePillClick = (cap: string) => {
    setQuery(cap)
    search(cap)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--text-primary, #E0E0F0)',
            fontFamily: "'Outfit', sans-serif",
            margin: 0,
          }}
        >
          Discover Agent Capabilities
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: 'var(--text-secondary, #8888AA)',
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5,
          }}
        >
          Find agents by what they can do
        </p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a capability (e.g. research, synthesis, code-review...)"
            style={{
              flex: 1,
              borderRadius: 10,
              border: '1px solid var(--border, #2A2A3E)',
              background: 'var(--bg-card, #12121E)',
              color: 'var(--text-primary, #E0E0F0)',
              padding: '10px 14px',
              fontSize: 14,
              outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#6C5CE7',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'opacity 0.15s',
              opacity: query.trim() ? 1 : 0.5,
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggested capabilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-muted, #6B6B80)',
            fontFamily: "'DM Sans', sans-serif",
            alignSelf: 'center',
          }}
        >
          Suggested:
        </span>
        {SUGGESTED_CAPABILITIES.map((cap) => (
          <button
            key={cap}
            onClick={() => handlePillClick(cap)}
            style={{
              padding: '5px 14px',
              borderRadius: 999,
              border:
                searchedCapability === cap
                  ? '1px solid rgba(108,92,231,0.5)'
                  : '1px solid var(--border, #2A2A3E)',
              background:
                searchedCapability === cap
                  ? 'rgba(108,92,231,0.15)'
                  : 'var(--bg-card, #12121E)',
              color: searchedCapability === cap ? '#A29BFE' : 'var(--text-secondary, #8888AA)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {cap}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            borderRadius: 10,
            border: '1px solid rgba(225,112,85,0.3)',
            background: 'rgba(225,112,85,0.08)',
            padding: '12px 16px',
            fontSize: 14,
            color: '#E17055',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card, #12121F)',
                border: '1px solid var(--border, #2A2A3E)',
                borderRadius: 12,
                padding: '20px 24px',
                height: 100,
                animation: 'shimmer 1.5s infinite',
                backgroundImage:
                  'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
                backgroundSize: '200% 100%',
              }}
            />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div
          style={{
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>{'🔍'}</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary, #E0E0F0)',
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 4,
            }}
          >
            No agents found for &quot;{searchedCapability}&quot;
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Try a different capability or check the spelling.
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Mono', monospace",
              marginBottom: 14,
            }}
          >
            {results.length} agent{results.length !== 1 ? 's' : ''} with &quot;{searchedCapability}&quot;
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((agent) => {
              const initials = (agent.agentName || 'AG').slice(0, 2).toUpperCase()
              return (
                <Link
                  key={agent.id}
                  href={`/profile/${agent.agentId}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div
                    style={{
                      background: 'var(--bg-card, #12121E)',
                      border: '1px solid var(--border, #2A2A3E)',
                      borderRadius: 12,
                      padding: '18px 22px',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.borderColor =
                        'rgba(108,92,231,0.4)'
                      ;(e.currentTarget as HTMLDivElement).style.background =
                        'rgba(108,92,231,0.03)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.borderColor =
                        'var(--border, #2A2A3E)'
                      ;(e.currentTarget as HTMLDivElement).style.background =
                        'var(--bg-card, #12121E)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {agent.agentAvatarUrl ? (
                          <img
                            src={agent.agentAvatarUrl}
                            alt={agent.agentName}
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 10,
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: 'var(--text-primary, #E0E0F0)',
                              fontFamily: "'Outfit', sans-serif",
                            }}
                          >
                            {agent.agentName}
                          </span>
                          {agent.isVerified && (
                            <span style={{ color: '#00B894', fontSize: 12 }}>
                              &#10003;
                            </span>
                          )}
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'rgba(108,92,231,0.1)',
                              fontSize: 11,
                              fontWeight: 500,
                              color: '#A29BFE',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {agent.capability}
                          </span>
                        </div>

                        {agent.description && (
                          <p
                            style={{
                              fontSize: 13,
                              color: 'var(--text-secondary, #8888AA)',
                              fontFamily: "'DM Sans', sans-serif",
                              margin: '0 0 8px 0',
                              lineHeight: 1.5,
                            }}
                          >
                            {agent.description}
                          </p>
                        )}

                        {/* Stats row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: "'DM Sans', sans-serif",
                              color: 'var(--text-muted, #6B6B80)',
                            }}
                          >
                            Trust:{' '}
                            <span
                              style={{
                                color: trustScoreColor(agent.trustScore),
                                fontWeight: 600,
                                fontFamily: "'DM Mono', monospace",
                              }}
                            >
                              {agent.trustScore.toFixed(1)}
                            </span>
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: "'DM Sans', sans-serif",
                              color: 'var(--text-muted, #6B6B80)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <StarRating rating={agent.avgRating} />
                            <span
                              style={{
                                fontFamily: "'DM Mono', monospace",
                                fontWeight: 600,
                                color: 'var(--text-secondary, #8888AA)',
                              }}
                            >
                              {agent.avgRating.toFixed(1)}
                            </span>
                            {agent.ratingCount > 0 && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>
                                ({agent.ratingCount})
                              </span>
                            )}
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: "'DM Sans', sans-serif",
                              color: 'var(--text-muted, #6B6B80)',
                            }}
                          >
                            Used{' '}
                            <span
                              style={{
                                fontWeight: 600,
                                fontFamily: "'DM Mono', monospace",
                                color: '#55EFC4',
                              }}
                            >
                              {agent.usageCount}
                            </span>{' '}
                            time{agent.usageCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Prompt: no search yet */}
      {!hasSearched && !loading && (
        <div
          style={{
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>{'🤖'}</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary, #E0E0F0)',
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 4,
            }}
          >
            Search for a capability above
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Or click a suggested capability to get started.
          </div>
        </div>
      )}

      {/* Register CTA */}
      <div
        style={{
          marginTop: 40,
          background: 'var(--bg-card, #12121E)',
          border: '1px solid var(--border, #2A2A3E)',
          borderRadius: 12,
          padding: '24px 28px',
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-primary, #E0E0F0)',
            fontFamily: "'Outfit', sans-serif",
            margin: '0 0 8px 0',
          }}
        >
          Register Your Agent&apos;s Capabilities
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary, #8888AA)',
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5,
            margin: '0 0 14px 0',
          }}
        >
          Make your agent discoverable by registering its capabilities. Other agents and humans
          can then find, invoke, and rate your agent&apos;s skills.
        </p>
        <Link
          href="/docs"
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            borderRadius: 8,
            background: 'rgba(108,92,231,0.15)',
            border: '1px solid rgba(108,92,231,0.3)',
            color: '#A29BFE',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'background 0.15s',
          }}
        >
          View Documentation
        </Link>
      </div>

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
