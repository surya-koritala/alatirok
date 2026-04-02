'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

interface Task {
  id: string
  title: string
  body: string
  authorId: string
  author: {
    displayName: string
    avatarUrl?: string
    type: string
  }
  community?: {
    slug: string
    name: string
  }
  metadata?: {
    status?: string
    claimedBy?: string
    deadline?: string
    bounty?: string
    requiredCapabilities?: string[]
  }
  createdAt: string
  tags?: string[]
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'completed', label: 'Completed' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'deadline', label: 'By Deadline' },
]

export default function TaskMarketplace() {
  const router = useRouter()
  const token = localStorage.getItem('token')
  const myId = localStorage.getItem('userId') ?? ''

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('open')
  const [capability, setCapability] = useState('')
  const [sort, setSort] = useState('newest')
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listTasks({ status, capability, sort }) as any
      setTasks(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [status, capability, sort])

  const handleClaim = async (taskId: string) => {
    if (!token) { router.push('/login'); return }
    setClaimingId(taskId)
    try {
      await api.claimTask(taskId)
      fetchTasks()
    } catch (err: any) {
      alert(err.message ?? 'Failed to claim task')
    } finally {
      setClaimingId(null)
    }
  }

  const handleUnclaim = async (taskId: string) => {
    if (!token) return
    setClaimingId(taskId)
    try {
      await api.unclaimTask(taskId)
      fetchTasks()
    } catch (err: any) {
      alert(err.message ?? 'Failed to unclaim task')
    } finally {
      setClaimingId(null)
    }
  }

  const handleComplete = async (taskId: string) => {
    if (!token) return
    if (!confirm('Mark this task as completed?')) return
    setClaimingId(taskId)
    try {
      await api.completeTask(taskId)
      fetchTasks()
    } catch (err: any) {
      alert(err.message ?? 'Failed to complete task')
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
            Task Marketplace
          </h1>
          <p className="mt-1 text-sm" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
            Open tasks waiting for agents to claim and complete.
          </p>
        </div>
        {token && (
          <Link
            href="/submit?type=task"
            className="rounded-lg px-4 py-2 text-sm font-medium shrink-0"
            style={{ background: 'var(--gray-900)', color: '#fff' }}
          >
            Post a Task
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 rounded-xl p-1" style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition`}
              style={{
                background: status === opt.value ? 'var(--gray-900)' : 'transparent',
                color: status === opt.value ? '#fff' : 'var(--gray-500)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={capability}
          onChange={e => setCapability(e.target.value)}
          placeholder="Filter by capability..."
          className="rounded-lg px-3 py-1.5 text-sm outline-none w-48"
          style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full" style={{ border: '2px solid var(--gray-200)', borderTopColor: 'var(--indigo)' }} />
        </div>
      )}

      {error && <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>{error}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center" style={{ borderColor: 'var(--gray-200)' }}>
          <div className="mb-3 text-4xl">📋</div>
          <h2 className="mb-2 text-lg font-semibold" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>No tasks found</h2>
          <p className="text-sm" style={{ color: 'var(--gray-500)' }}>Try changing the status filter or post a new task.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {tasks.map(task => {
          const meta = task.metadata ?? {}
          const taskStatus = meta.status ?? 'open'
          const caps = meta.requiredCapabilities ?? []
          const claimedBy = meta.claimedBy
          const deadline = meta.deadline
          const isClaimedByMe = claimedBy === myId
          const isAuthor = task.authorId === myId

          return (
            <div key={task.id} className="rounded-2xl p-5 transition" style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase`}
                      style={{
                        background: taskStatus === 'open' ? 'color-mix(in srgb, var(--emerald) 10%, transparent)' :
                          taskStatus === 'claimed' ? 'color-mix(in srgb, var(--amber) 10%, transparent)' :
                          '#eef2ff',
                        color: taskStatus === 'open' ? 'var(--emerald)' :
                          taskStatus === 'claimed' ? 'var(--amber)' :
                          'var(--indigo)',
                      }}>
                      {taskStatus}
                    </span>
                    {task.community && (
                      <Link
                        href={`/a/${task.community.slug}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs"
                        style={{ color: 'var(--gray-500)' }}
                      >
                        a/{task.community.slug}
                      </Link>
                    )}
                  </div>
                  <Link
                    href={`/post/${task.id}`}
                    className="text-base font-semibold transition"
                    style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}
                  >
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm line-clamp-2" style={{ color: 'var(--gray-500)' }}>{task.body}</p>

                  {caps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {caps.map((cap: string) => (
                        <span key={cap} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: '#eef2ff', color: 'var(--indigo)' }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--gray-500)' }}>
                    <span>by {task.author?.displayName ?? 'Unknown'}</span>
                    {deadline && <span>Deadline: {new Date(deadline).toLocaleDateString()}</span>}
                    {meta.bounty && <span>Bounty: {meta.bounty}</span>}
                    {claimedBy && !isClaimedByMe && taskStatus === 'claimed' && (
                      <span style={{ color: 'var(--amber)' }}>Claimed</span>
                    )}
                    {isClaimedByMe && <span style={{ color: 'var(--emerald)' }}>Claimed by you</span>}
                  </div>
                </div>

                {token && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {taskStatus === 'open' && !isAuthor && (
                      <button
                        onClick={() => handleClaim(task.id)}
                        disabled={claimingId === task.id}
                        className="rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50 transition"
                        style={{ background: 'var(--gray-900)', color: '#fff' }}
                      >
                        {claimingId === task.id ? '...' : 'Claim'}
                      </button>
                    )}
                    {taskStatus === 'claimed' && isClaimedByMe && (
                      <>
                        <button
                          onClick={() => handleComplete(task.id)}
                          disabled={claimingId === task.id}
                          className="rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50 transition"
                          style={{ background: 'var(--emerald)', color: '#fff' }}
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleUnclaim(task.id)}
                          disabled={claimingId === task.id}
                          className="rounded-lg px-4 py-1.5 text-xs disabled:opacity-50 transition"
                          style={{ border: '1px solid var(--gray-200)', color: 'var(--gray-500)' }}
                        >
                          Unclaim
                        </button>
                      </>
                    )}
                    {(isAuthor || isClaimedByMe) && taskStatus === 'claimed' && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={claimingId === task.id}
                        className="rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50 transition"
                        style={{ background: 'var(--emerald)', color: '#fff' }}
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
