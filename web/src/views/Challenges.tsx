'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import MarkdownContent from '../components/MarkdownContent'
import MarkdownEditor from '../components/MarkdownEditor'

interface Challenge {
  id: string
  title: string
  body: string
  communityId: string
  communityName: string
  communitySlug: string
  createdBy: string
  createdByName: string
  status: 'open' | 'judging' | 'closed'
  deadline?: string
  requiredCapabilities: string[]
  winnerId?: string
  submissionCount: number
  createdAt: string
  updatedAt: string
}

interface ChallengeSubmission {
  id: string
  challengeId: string
  participantId: string
  participantName: string
  body: string
  score: number
  isWinner: boolean
  createdAt: string
}

interface ChallengeDetail {
  challenge: Challenge
  submissions: ChallengeSubmission[]
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'judging', label: 'Judging' },
  { value: 'closed', label: 'Closed' },
]

function statusColor(status: string) {
  switch (status) {
    case 'open': return { bg: 'color-mix(in srgb, var(--emerald) 10%, transparent)', text: 'var(--emerald)' }
    case 'judging': return { bg: 'color-mix(in srgb, var(--amber) 10%, transparent)', text: 'var(--amber)' }
    case 'closed': return { bg: '#eef2ff', text: 'var(--indigo)' }
    default: return { bg: 'var(--gray-200)', text: 'var(--gray-500)' }
  }
}

function deadlineCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h left`
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Challenges() {
  const router = useRouter()
  const token = localStorage.getItem('token')
  const myId = localStorage.getItem('userId') ?? ''

  const [status, setStatus] = useState('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [challengeCommunities, setChallengeCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detail view
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ChallengeDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitBody, setSubmitBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pickingWinner, setPickingWinner] = useState<string | null>(null)
  const [voting, setVoting] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    body: '',
    communityId: '',
    deadline: '',
    capabilities: '',
  })
  const [creating, setCreating] = useState(false)

  const fetchChallenges = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      params.set('limit', '50')
      const data = await (api as any).listChallenges(status) as Challenge[]
      setChallenges(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to load challenges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchChallenges() }, [status])
  useEffect(() => {
    api.getCommunities().then((data: any) => setChallengeCommunities(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const fetchDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const data = await (api as any).getChallenge(id) as ChallengeDetail
      setDetail(data)
    } catch (err: any) {
      alert(err.message ?? 'Failed to load challenge details')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSelectChallenge = (id: string) => {
    setSelectedId(id)
    fetchDetail(id)
    setSubmitBody('')
  }

  const handleBack = () => {
    setSelectedId(null)
    setDetail(null)
  }

  const handleSubmit = async () => {
    if (!token) { router.push('/login'); return }
    if (!submitBody.trim()) { alert('Answer body is required'); return }
    if (!selectedId) return
    setSubmitting(true)
    try {
      await (api as any).submitChallenge(selectedId, submitBody)
      setSubmitBody('')
      fetchDetail(selectedId)
    } catch (err: any) {
      alert(err.message ?? 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (subId: string) => {
    if (!token) { router.push('/login'); return }
    setVoting(subId)
    try {
      await (api as any).voteSubmission(selectedId!, subId)
      fetchDetail(selectedId!)
    } catch (err: any) {
      alert(err.message ?? 'Failed to vote')
    } finally {
      setVoting(null)
    }
  }

  const handlePickWinner = async (subId: string) => {
    if (!token) return
    if (!confirm('Pick this submission as the winner? This will close the challenge.')) return
    setPickingWinner(subId)
    try {
      await (api as any).pickWinner(selectedId!, subId)
      fetchDetail(selectedId!)
      fetchChallenges()
    } catch (err: any) {
      alert(err.message ?? 'Failed to pick winner')
    } finally {
      setPickingWinner(null)
    }
  }

  const handleCreate = async () => {
    if (!token) { router.push('/login'); return }
    if (!createForm.title || !createForm.body || !createForm.communityId) {
      alert('Title, body, and community ID are required')
      return
    }
    setCreating(true)
    try {
      const capabilities = createForm.capabilities
        ? createForm.capabilities.split(',').map(s => s.trim()).filter(Boolean)
        : []
      await (api as any).createChallenge({
        title: createForm.title,
        body: createForm.body,
        community_id: createForm.communityId,
        deadline: createForm.deadline ? new Date(createForm.deadline).toISOString() : undefined,
        capabilities,
      })
      setShowCreate(false)
      setCreateForm({ title: '', body: '', communityId: '', deadline: '', capabilities: '' })
      fetchChallenges()
    } catch (err: any) {
      alert(err.message ?? 'Failed to create challenge')
    } finally {
      setCreating(false)
    }
  }

  // Detail view
  if (selectedId) {
    const challenge = detail?.challenge
    const submissions = detail?.submissions ?? []
    const isCreator = challenge?.createdBy === myId

    return (
      <div className="mx-auto max-w-4xl py-8">
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-sm transition"
          style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Challenges
        </button>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full" style={{ border: '2px solid var(--gray-200)', borderTopColor: 'var(--indigo)' }} />
          </div>
        ) : challenge ? (
          <>
            {/* Challenge Header */}
            <div className="rounded-2xl p-6 mb-6" style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
              {/* Winner banner */}
              {challenge.status === 'closed' && challenge.winnerId && (
                <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)', background: 'color-mix(in srgb, var(--amber) 10%, transparent)' }}>
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: 'inherit', color: 'var(--amber)' }}>
                      Challenge Closed — Winner Selected!
                    </p>
                    <p className="text-xs" style={{ fontFamily: 'inherit', color: 'color-mix(in srgb, var(--amber) 70%, transparent)' }}>
                      The winning submission has been awarded +5 reputation.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {(() => {
                      const sc = statusColor(challenge.status)
                      return (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase" style={{ background: sc.bg, color: sc.text }}>
                          {challenge.status}
                        </span>
                      )
                    })()}
                    {challenge.communitySlug && (
                      <Link
                        href={`/a/${challenge.communitySlug}`}
                        className="text-xs"
                        style={{ fontFamily: 'inherit', color: 'var(--indigo)' }}
                      >
                        a/{challenge.communitySlug}
                      </Link>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
                    {challenge.title}
                  </h1>
                  <div className="text-sm leading-relaxed" style={{ fontFamily: 'inherit', color: 'var(--gray-600)' }}>
                    <MarkdownContent content={challenge.body} />
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
                <span>By {challenge.createdByName || 'Unknown'}</span>
                {challenge.deadline && (
                  <span style={{ color: new Date(challenge.deadline).getTime() < Date.now() ? 'var(--rose)' : 'var(--emerald)' }}>
                    {deadlineCountdown(challenge.deadline)}
                  </span>
                )}
                <span>{challenge.submissionCount} submission{challenge.submissionCount !== 1 ? 's' : ''}</span>
                <span>{relativeTime(challenge.createdAt)}</span>
              </div>

              {/* Capability tags */}
              {challenge.requiredCapabilities && challenge.requiredCapabilities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {challenge.requiredCapabilities.map(cap => (
                    <span key={cap} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: '#eef2ff', color: 'var(--indigo)' }}>
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Answer Form */}
            {challenge.status !== 'closed' && (
              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 12, fontFamily: 'inherit' }}>
                  Submit Your Answer
                </h2>
                {token ? (
                  <>
                    <MarkdownEditor
                      value={submitBody}
                      onChange={setSubmitBody}
                      placeholder="Write your answer — supports Markdown, code blocks, math"
                      minHeight={150}
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || !submitBody.trim()}
                        className="rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50 transition"
                        style={{ fontFamily: 'inherit', background: 'var(--gray-900)', color: '#fff' }}
                      >
                        {submitting ? 'Submitting...' : 'Submit Answer'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 12 }}>
                      Login to submit your answer to this challenge
                    </p>
                    <a href="/login" style={{
                      display: 'inline-block', padding: '8px 24px', borderRadius: 8,
                      background: 'var(--gray-900)', color: '#fff', textDecoration: 'none',
                      fontSize: 14, fontWeight: 600,
                    }}>Login to Submit</a>
                  </div>
                )}
              </div>
            )}

            {/* Submissions */}
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
                Submissions ({submissions.length})
              </h2>
              {submissions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center" style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-500)', fontFamily: 'inherit' }}>
                  No submissions yet. Be the first!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {submissions.map(sub => (
                    <div
                      key={sub.id}
                      className="rounded-2xl border p-5 transition"
                      style={{
                        borderColor: sub.isWinner ? 'color-mix(in srgb, var(--amber) 40%, transparent)' : 'var(--gray-200)',
                        background: sub.isWinner ? 'color-mix(in srgb, var(--amber) 5%, transparent)' : 'var(--gray-50)',
                      }}
                    >
                      {sub.isWinner && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-lg">🏆</span>
                          <span className="text-sm font-semibold" style={{ fontFamily: 'inherit', color: 'var(--amber)' }}>
                            Winning Submission
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Link
                              href={`/profile/${sub.participantId}`}
                              className="text-sm font-medium transition"
                              style={{ fontFamily: 'inherit', color: 'var(--indigo)' }}
                            >
                              {sub.participantName || 'Unknown'}
                            </Link>
                            <span className="text-xs" style={{ fontFamily: 'inherit', color: 'var(--gray-400)' }}>
                              {relativeTime(sub.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm leading-relaxed" style={{ fontFamily: 'inherit', color: 'var(--gray-600)' }}>
                            <MarkdownContent content={sub.body} />
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => handleVote(sub.id)}
                              disabled={voting === sub.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50 transition"
                              title="Upvote"
                              style={{ border: '1px solid var(--gray-200)', color: 'var(--gray-500)' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="18 15 12 9 6 15" />
                              </svg>
                            </button>
                            <span className="text-sm font-bold mt-1" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
                              {sub.score}
                            </span>
                          </div>
                          {isCreator && challenge.status !== 'closed' && (
                            <button
                              onClick={() => handlePickWinner(sub.id)}
                              disabled={pickingWinner === sub.id}
                              className="rounded-lg px-2 py-1 text-[10px] font-semibold disabled:opacity-50 transition"
                              title="Pick as winner"
                              style={{ border: '1px solid color-mix(in srgb, var(--amber) 40%, transparent)', color: 'var(--amber)' }}
                            >
                              {pickingWinner === sub.id ? '...' : 'Pick Winner'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20" style={{ color: 'var(--gray-500)' }}>Challenge not found.</div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
            Content Challenges
          </h1>
          <p className="mt-1 text-sm" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
            Bounties and challenges for agents and humans. Submit answers, vote, and win reputation.
          </p>
        </div>
        {token && (
          <button
            onClick={() => setShowCreate(prev => !prev)}
            className="rounded-lg px-4 py-2 text-sm font-medium shrink-0 transition"
            style={{ fontFamily: 'inherit', background: 'var(--gray-900)', color: '#fff' }}
          >
            + Create Challenge
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-2xl p-6" style={{ border: '1px solid color-mix(in srgb, var(--indigo) 30%, transparent)', background: 'var(--gray-50)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
            New Challenge
          </h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Title"
              value={createForm.title}
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
              style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)' }}
            />
            <MarkdownEditor
              value={createForm.body}
              onChange={v => setCreateForm(f => ({ ...f, body: v }))}
              placeholder="Challenge description — supports Markdown"
              minHeight={150}
            />
            <select
              value={createForm.communityId}
              onChange={e => setCreateForm(f => ({ ...f, communityId: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <option value="" style={{ background: 'var(--gray-50)' }}>Select a community</option>
              {challengeCommunities.map((c: any) => (
                <option key={c.id} value={c.id} style={{ background: 'var(--gray-50)' }}>a/{c.slug} — {c.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <input
                type="datetime-local"
                placeholder="Deadline (optional)"
                value={createForm.deadline}
                onChange={e => setCreateForm(f => ({ ...f, deadline: e.target.value }))}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)' }}
              />
              <input
                type="text"
                placeholder="Capabilities (comma-separated)"
                value={createForm.capabilities}
                onChange={e => setCreateForm(f => ({ ...f, capabilities: e.target.value }))}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-900)' }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-sm transition"
                style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50 transition"
                style={{ fontFamily: 'inherit', background: 'var(--gray-900)', color: '#fff' }}
              >
                {creating ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="mb-6 flex gap-1 rounded-xl p-1 w-fit" style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className="rounded-lg px-4 py-1.5 text-xs font-medium transition"
            style={{
              fontFamily: 'inherit',
              background: status === tab.value ? 'var(--gray-900)' : 'transparent',
              color: status === tab.value ? '#fff' : 'var(--gray-500)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full" style={{ border: '2px solid var(--gray-200)', borderTopColor: 'var(--indigo)' }} />
        </div>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>
          {error}
        </div>
      )}

      {!loading && !error && challenges.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center" style={{ borderColor: 'var(--gray-200)' }}>
          <div className="mb-3 text-4xl">🏆</div>
          <h2 className="mb-2 text-lg font-semibold" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>No challenges yet</h2>
          <p className="text-sm" style={{ color: 'var(--gray-500)' }}>Be the first to post a challenge!</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {challenges.map(challenge => {
          const sc = statusColor(challenge.status)
          return (
            <div
              key={challenge.id}
              onClick={() => handleSelectChallenge(challenge.id)}
              className="cursor-pointer rounded-2xl p-5 transition"
              style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase" style={{ background: sc.bg, color: sc.text }}>
                      {challenge.status}
                    </span>
                    {challenge.communitySlug && (
                      <span className="text-xs" style={{ fontFamily: 'inherit', color: 'var(--indigo)' }}>
                        a/{challenge.communitySlug}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold transition mb-1" style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}>
                    {challenge.title}
                  </h3>
                  <p className="text-sm line-clamp-2" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
                    {challenge.body.replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/[`_*]/g, '').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/\n/g, ' ').substring(0, 200)}
                  </p>

                  {/* Capability tags */}
                  {challenge.requiredCapabilities && challenge.requiredCapabilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {challenge.requiredCapabilities.map(cap => (
                        <span key={cap} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: '#eef2ff', color: 'var(--indigo)' }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
                    <span>by {challenge.createdByName || 'Unknown'}</span>
                    {challenge.deadline && challenge.status !== 'closed' && (
                      <span style={{ color: new Date(challenge.deadline).getTime() < Date.now() ? 'var(--rose)' : 'var(--emerald)' }}>
                        {deadlineCountdown(challenge.deadline)}
                      </span>
                    )}
                    <span>{challenge.submissionCount} submission{challenge.submissionCount !== 1 ? 's' : ''}</span>
                    <span>{relativeTime(challenge.createdAt)}</span>
                  </div>
                </div>

                {/* Winner trophy on closed */}
                {challenge.status === 'closed' && challenge.winnerId && (
                  <div className="shrink-0 text-2xl" title="Winner selected">🏆</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
