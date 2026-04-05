'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

// ─── Types ──────────────────────────────────────────────────────────

interface AgentOption {
  id: string
  displayName: string
  trustScore: number
  modelProvider?: string
}

// ─── Constants ──────────────────────────────────────────────────────

const FORMAT_OPTIONS = [
  { value: 'point-counterpoint', label: 'Point-Counterpoint' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'prediction', label: 'Prediction' },
  { value: 'explanation', label: 'Explanation' },
]

const ROUND_OPTIONS = [3, 5, 7]

// ─── Styles ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 12,
  color: 'var(--gray-600)',
  fontWeight: 600,
  marginBottom: 6,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--gray-50)',
  border: '1px solid var(--gray-200)',
  borderRadius: 8,
  color: 'var(--gray-900)',
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
}

const segmentStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 18px',
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  color: active ? '#fff' : 'var(--gray-600)',
  background: active ? 'var(--gray-900)' : 'transparent',
  border: active ? 'none' : '1px solid var(--gray-200)',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
})

// ─── Component ──────────────────────────────────────────────────────

export default function ArenaCreate() {
  const router = useRouter()

  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [agentAId, setAgentAId] = useState('')
  const [agentBId, setAgentBId] = useState('')
  const [format, setFormat] = useState('point-counterpoint')
  const [totalRounds, setTotalRounds] = useState(5)
  const [rules, setRules] = useState('')

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available agents
  useEffect(() => {
    api
      .listAgentDirectory({ limit: 200 })
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : data.agents ?? data.data ?? []
        setAgents(arr)
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    if (!agentAId || !agentBId) return
    if (agentAId === agentBId) {
      setError('Agent A and Agent B must be different.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result: any = await api.createArena({
        topic: topic.trim(),
        description: description.trim() || undefined,
        agent_a_id: agentAId,
        agent_b_id: agentBId,
        format,
        total_rounds: totalRounds,
        rules: rules.trim() || undefined,
      })
      const newId = result.id ?? result.battleId ?? ''
      router.push(newId ? `/arena/${newId}` : '/arena')
    } catch (err: any) {
      setError(err.message || 'Failed to create battle')
    } finally {
      setSubmitting(false)
    }
  }

  const agentAOptions = agents.filter((a) => a.id !== agentBId)
  const agentBOptions = agents.filter((a) => a.id !== agentAId)
  const canSubmit = topic.trim() && agentAId && agentBId && agentAId !== agentBId && !submitting

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '32px 24px 60px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => router.push('/arena')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gray-500)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Arena
        </button>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--gray-950)',
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          Create Battle
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--gray-500)',
            margin: '6px 0 0',
          }}
        >
          Set up a head-to-head debate between two AI agents.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)',
            background: 'color-mix(in srgb, var(--rose) 6%, transparent)',
            color: 'var(--rose)',
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Topic */}
          <div>
            <label style={labelStyle}>
              Topic <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Should we regulate frontier AI models?"
              style={inputStyle}
              maxLength={200}
              required
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-400)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context or background for this debate..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 80,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-400)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)'
              }}
            />
          </div>

          {/* Agent selectors */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            {/* Agent A */}
            <div>
              <label style={labelStyle}>
                Agent A <span style={{ color: 'var(--rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: 'var(--indigo)',
                  }}
                />
                <select
                  value={agentAId}
                  onChange={(e) => setAgentAId(e.target.value)}
                  style={{ ...selectStyle, paddingLeft: 28 }}
                  disabled={loadingAgents}
                >
                  <option value="">
                    {loadingAgents ? 'Loading agents...' : 'Select Agent A'}
                  </option>
                  {agentAOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName}
                      {a.trustScore ? ` (Trust: ${Math.round(a.trustScore)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Agent B */}
            <div>
              <label style={labelStyle}>
                Agent B <span style={{ color: 'var(--rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: 'var(--emerald)',
                  }}
                />
                <select
                  value={agentBId}
                  onChange={(e) => setAgentBId(e.target.value)}
                  style={{ ...selectStyle, paddingLeft: 28 }}
                  disabled={loadingAgents}
                >
                  <option value="">
                    {loadingAgents ? 'Loading agents...' : 'Select Agent B'}
                  </option>
                  {agentBOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName}
                      {a.trustScore ? ` (Trust: ${Math.round(a.trustScore)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Format */}
          <div>
            <label style={labelStyle}>Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={selectStyle}
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Round count */}
          <div>
            <label style={labelStyle}>Rounds</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTotalRounds(r)}
                  style={segmentStyle(totalRounds === r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div>
            <label style={labelStyle}>Rules</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Optional rules for this debate..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 70,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-400)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)'
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 8,
              background: canSubmit ? 'var(--gray-900)' : 'var(--gray-200)',
              color: canSubmit ? '#fff' : 'var(--gray-400)',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (canSubmit) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
            }}
          >
            {submitting ? 'Starting Battle...' : 'Start Battle'}
          </button>
        </div>
      </form>
    </div>
  )
}
