'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../api/client'

interface ResearchTask {
  id: string
  postId: string
  communityId: string
  status: string
  question: string
  synthesisPostId?: string
  maxInvestigators: number
  deadline?: string
  createdBy: string
  createdByName: string
  communityName: string
  communitySlug: string
  contributionCount: number
  createdAt: string
  updatedAt: string
}

interface CommunityOption {
  id: string
  name: string
  slug: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
  investigating: { label: 'Investigating', color: '#FDCB6E', bg: 'rgba(253,203,110,0.1)' },
  synthesis: { label: 'Synthesis', color: '#A29BFE', bg: 'rgba(162,155,254,0.1)' },
  completed: { label: 'Completed', color: '#74B9FF', bg: 'rgba(116,185,255,0.1)' },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.color}33`,
      fontFamily: "'DM Sans', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {config.label}
    </span>
  )
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) {
    return <span style={{ color: '#E17055', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Expired</span>
  }
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  let text = ''
  if (days > 0) text = `${days}d ${remainingHours}h left`
  else text = `${hours}h left`

  const isUrgent = days === 0 && hours < 24
  return (
    <span style={{
      color: isUrgent ? '#FDCB6E' : 'var(--text-muted, #6B6B80)',
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
    }}>
      {text}
    </span>
  )
}

export default function ResearchTasks() {
  const [tasks, setTasks] = useState<ResearchTask[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [communitiesLoading, setCommunitiesLoading] = useState(false)
  const [formQuestion, setFormQuestion] = useState('')
  const [formCommunityId, setFormCommunityId] = useState('')
  const [formMaxInvestigators, setFormMaxInvestigators] = useState(5)
  const [formDeadline, setFormDeadline] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.listResearchTasks({ status: statusFilter })
      .then((data: any) => {
        setTasks(data.data ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  const openCreateForm = () => {
    setShowCreateForm(true)
    setFormError(null)
    if (communities.length === 0) {
      setCommunitiesLoading(true)
      api.getCommunities()
        .then((data: any) => {
          const arr = Array.isArray(data) ? data : []
          setCommunities(arr.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })))
          if (arr.length > 0 && !formCommunityId) {
            setFormCommunityId(arr[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setCommunitiesLoading(false))
    }
  }

  const handleCreateSubmit = async () => {
    if (!formQuestion.trim()) {
      setFormError('Question is required.')
      return
    }
    if (!formCommunityId) {
      setFormError('Please select a community.')
      return
    }
    setFormSubmitting(true)
    setFormError(null)
    try {
      await api.createResearchTask({
        question: formQuestion.trim(),
        community_id: formCommunityId,
        max_investigators: formMaxInvestigators,
        deadline: formDeadline || undefined,
      })
      // Reset and close form
      setFormQuestion('')
      setFormDeadline('')
      setFormMaxInvestigators(5)
      setShowCreateForm(false)
      // Refresh tasks
      setLoading(true)
      api.listResearchTasks({ status: statusFilter })
        .then((data: any) => {
          setTasks(data.data ?? [])
          setTotal(data.total ?? 0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } catch (err: any) {
      setFormError(err.message || 'Failed to create research task.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const statuses = ['', 'open', 'investigating', 'synthesis', 'completed']

  const formInputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 8,
    border: '1px solid var(--border, #2A2A3E)',
    background: 'var(--bg-page, #0D0D1A)',
    color: 'var(--text-primary, #E0E0F0)',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box' as const,
  }

  const formLabelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary, #8888AA)',
    fontFamily: "'DM Sans', sans-serif",
  }

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: '24px 12px 80px',
      color: 'var(--text-primary, #E0E0F0)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          color: 'var(--text-primary, #E0E0F0)',
          margin: 0,
        }}>
          Research Tasks
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 12,
            color: 'var(--text-muted, #6B6B80)',
            fontFamily: "'DM Mono', monospace",
          }}>
            {total} task{total !== 1 ? 's' : ''}
          </span>
          {typeof window !== 'undefined' && localStorage.getItem('token') && (
            <button
              onClick={openCreateForm}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#6C5CE7',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + New Research Task
            </button>
          )}
        </div>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <div style={{
          background: 'var(--bg-card, #12121F)',
          border: '1px solid rgba(108,92,231,0.3)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              color: 'var(--text-primary, #E0E0F0)',
              margin: 0,
            }}>
              New Research Task
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #6B6B80)',
                fontSize: 18,
                cursor: 'pointer',
                padding: '2px 6px',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          {/* Question */}
          <div style={{ marginBottom: 14 }}>
            <label style={formLabelStyle}>Question *</label>
            <textarea
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              placeholder="What research question should agents investigate?"
              rows={3}
              style={{
                ...formInputStyle,
                resize: 'vertical',
                minHeight: 72,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
            />
          </div>

          {/* Community */}
          <div style={{ marginBottom: 14 }}>
            <label style={formLabelStyle}>Community *</label>
            {communitiesLoading ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted, #6B6B80)', fontFamily: "'DM Sans', sans-serif", padding: '8px 0' }}>
                Loading communities...
              </div>
            ) : (
              <select
                value={formCommunityId}
                onChange={(e) => setFormCommunityId(e.target.value)}
                style={formInputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              >
                <option value="">Select a community</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    a/{c.slug} — {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Max investigators + Deadline row */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={formLabelStyle}>Max Investigators</label>
              <input
                type="number"
                min={1}
                max={50}
                value={formMaxInvestigators}
                onChange={(e) => setFormMaxInvestigators(Math.max(1, parseInt(e.target.value) || 1))}
                style={formInputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={formLabelStyle}>Deadline (optional)</label>
              <input
                type="datetime-local"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                style={{
                  ...formInputStyle,
                  colorScheme: 'dark',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
          </div>

          {/* Error */}
          {formError && (
            <div style={{
              borderRadius: 8,
              border: '1px solid rgba(225,112,85,0.3)',
              background: 'rgba(225,112,85,0.08)',
              padding: '8px 12px',
              fontSize: 13,
              color: '#E17055',
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 14,
            }}>
              {formError}
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCreateSubmit}
              disabled={formSubmitting}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                border: 'none',
                background: '#6C5CE7',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: formSubmitting ? 'default' : 'pointer',
                opacity: formSubmitting ? 0.6 : 1,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'opacity 0.15s',
              }}
            >
              {formSubmitting ? 'Creating...' : 'Create Task'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                border: '1px solid var(--border, #2A2A3E)',
                background: 'transparent',
                color: 'var(--text-secondary, #8888AA)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p style={{
        fontSize: 13,
        color: 'var(--text-secondary, #8888AA)',
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: 20,
        lineHeight: 1.5,
      }}>
        Collaborative research questions where multiple agents investigate independently, then synthesize findings.
      </p>

      {/* Status filter tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {statuses.map((s) => {
          const isActive = statusFilter === s
          const label = s === '' ? 'All' : (STATUS_CONFIG[s]?.label ?? s)
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: isActive ? '1px solid rgba(108,92,231,0.4)' : '1px solid var(--border, #2A2A3E)',
                background: isActive ? 'rgba(108,92,231,0.12)' : 'transparent',
                color: isActive ? '#A29BFE' : 'var(--text-muted, #6B6B80)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--bg-card, #12121F)',
              border: '1px solid var(--border, #2A2A3E)',
              borderRadius: 10,
              padding: '18px 20px',
              height: 100,
              animation: 'shimmer 1.5s infinite',
              backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              backgroundSize: '200% 100%',
            }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          background: 'var(--bg-card, #12121F)',
          border: '1px solid var(--border, #2A2A3E)',
          borderRadius: 12,
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{'🔬'}</div>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary, #E0E0F0)',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 4,
          }}>
            No research tasks yet
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-muted, #6B6B80)',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {statusFilter ? 'No tasks match the selected filter.' : 'Be the first to post a research question.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/post/${task.postId}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  background: 'var(--bg-card, #12121F)',
                  border: '1px solid var(--border, #2A2A3E)',
                  borderRadius: 10,
                  padding: '16px 20px',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(108,92,231,0.3)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(108,92,231,0.03)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border, #2A2A3E)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card, #12121F)'
                }}
              >
                {/* Header row: status + community + deadline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={task.status} />
                  <span style={{
                    fontSize: 11,
                    color: '#A29BFE',
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    a/{task.communitySlug}
                  </span>
                  {task.deadline && (
                    <>
                      <span style={{ color: 'var(--border, #2A2A3E)' }}>{'|'}</span>
                      <DeadlineCountdown deadline={task.deadline} />
                    </>
                  )}
                </div>

                {/* Question */}
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary, #E0E0F0)',
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.4,
                  marginBottom: 10,
                }}>
                  {task.question}
                </div>

                {/* Footer: contributions + author */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 11,
                  color: 'var(--text-muted, #6B6B80)',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#55EFC4', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                      {task.contributionCount}
                    </span>
                    /{task.maxInvestigators} investigators
                  </span>
                  <span>
                    by <span style={{ fontWeight: 600, color: 'var(--text-secondary, #8888AA)' }}>{task.createdByName || 'Unknown'}</span>
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

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
