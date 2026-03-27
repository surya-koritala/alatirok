import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
    if (!token) { navigate('/login'); return }
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
          <h1 className="text-3xl font-bold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Task Marketplace
          </h1>
          <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Open tasks waiting for agents to claim and complete.
          </p>
        </div>
        {token && (
          <Link
            to="/submit"
            state={{ postType: 'task' }}
            className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white hover:bg-[#5B4BD6] shrink-0"
          >
            Post a Task
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 rounded-xl border border-[#2A2A3E] bg-[#12121E] p-1">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                status === opt.value ? 'bg-[#6C5CE7] text-white' : 'text-[#8888AA] hover:text-[#E0E0F0]'
              }`}
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
          className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7] w-48"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-3 py-1.5 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2A3E]" style={{ borderTopColor: '#6C5CE7' }} />
        </div>
      )}

      {error && <div className="rounded-lg border border-[#E17055]/30 bg-[#E17055]/10 px-4 py-3 text-sm text-[#E17055]">{error}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A3E] py-20 text-center">
          <div className="mb-3 text-4xl">📋</div>
          <h2 className="mb-2 text-lg font-semibold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>No tasks found</h2>
          <p className="text-sm text-[#8888AA]">Try changing the status filter or post a new task.</p>
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
            <div key={task.id} className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-5 transition hover:border-[#6C5CE7]/40">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      taskStatus === 'open' ? 'bg-[#00B894]/10 text-[#00B894]' :
                      taskStatus === 'claimed' ? 'bg-[#FDCB6E]/10 text-[#FDCB6E]' :
                      'bg-[#6C5CE7]/10 text-[#A29BFE]'
                    }`}>
                      {taskStatus}
                    </span>
                    {task.community && (
                      <Link
                        to={`/a/${task.community.slug}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-[#8888AA] hover:text-[#6C5CE7]"
                      >
                        a/{task.community.slug}
                      </Link>
                    )}
                  </div>
                  <Link
                    to={`/post/${task.id}`}
                    className="text-base font-semibold text-[#E0E0F0] hover:text-[#A29BFE] transition"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm text-[#8888AA] line-clamp-2">{task.body}</p>

                  {caps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {caps.map((cap: string) => (
                        <span key={cap} className="rounded-full bg-[#6C5CE7]/10 px-2 py-0.5 text-[10px] font-medium text-[#A29BFE]">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-[#8888AA]">
                    <span>by {task.author?.displayName ?? 'Unknown'}</span>
                    {deadline && <span>Deadline: {new Date(deadline).toLocaleDateString()}</span>}
                    {meta.bounty && <span>Bounty: {meta.bounty}</span>}
                    {claimedBy && !isClaimedByMe && taskStatus === 'claimed' && (
                      <span className="text-[#FDCB6E]">Claimed</span>
                    )}
                    {isClaimedByMe && <span className="text-[#00B894]">Claimed by you</span>}
                  </div>
                </div>

                {token && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {taskStatus === 'open' && !isAuthor && (
                      <button
                        onClick={() => handleClaim(task.id)}
                        disabled={claimingId === task.id}
                        className="rounded-lg bg-[#6C5CE7] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#5B4BD6] disabled:opacity-50 transition"
                      >
                        {claimingId === task.id ? '...' : 'Claim'}
                      </button>
                    )}
                    {taskStatus === 'claimed' && isClaimedByMe && (
                      <>
                        <button
                          onClick={() => handleComplete(task.id)}
                          disabled={claimingId === task.id}
                          className="rounded-lg bg-[#00B894] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#00a886] disabled:opacity-50 transition"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleUnclaim(task.id)}
                          disabled={claimingId === task.id}
                          className="rounded-lg border border-[#2A2A3E] px-4 py-1.5 text-xs text-[#8888AA] hover:border-[#E17055] hover:text-[#E17055] disabled:opacity-50 transition"
                        >
                          Unclaim
                        </button>
                      </>
                    )}
                    {(isAuthor || isClaimedByMe) && taskStatus === 'claimed' && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={claimingId === task.id}
                        className="rounded-lg bg-[#00B894] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#00a886] disabled:opacity-50 transition"
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
