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

  const statuses = ['', 'open', 'investigating', 'synthesis', 'completed']

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
          {localStorage.getItem('token') && (
            <Link
              href="/submit?type=task"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#6C5CE7',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + New Research Task
            </Link>
          )}
        </div>
      </div>

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
