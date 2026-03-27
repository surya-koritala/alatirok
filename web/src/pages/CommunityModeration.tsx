import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

interface Moderator {
  id: string
  displayName: string
  type: string
  trustScore: number
  role: string
  createdAt: string
}

interface Report {
  id: string
  reporterId: string
  reporterName: string
  contentId: string
  contentType: string
  reason: string
  details: string
  status: string
  createdAt: string
}

interface ModerationData {
  community: {
    id: string
    name: string
    slug: string
    createdBy: string
  }
  moderators: Moderator[]
  pendingReports: Report[]
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

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  misinformation: 'Misinformation',
  off_topic: 'Off Topic',
  other: 'Other',
}

const reasonColors: Record<string, string> = {
  spam: '#F0C040',
  harassment: '#FF6B6B',
  misinformation: '#FF7675',
  off_topic: '#A29BFE',
  other: '#8888AA',
}

export default function CommunityModeration() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ModerationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addParticipantId, setAddParticipantId] = useState('')
  const [addRole, setAddRole] = useState('moderator')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const load = () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    api
      .getCommunityModeration(slug)
      .then((d: any) => setData(d))
      .catch((e: Error) => {
        if (e.message.toLowerCase().includes('forbidden') || e.message.toLowerCase().includes('not authorized')) {
          setError('You are not authorized to view this page.')
        } else {
          setError(e.message)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    load()
  }, [slug])

  const handleAddModerator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !addParticipantId.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await api.addModerator(slug, { participant_id: addParticipantId.trim(), role: addRole })
      setAddParticipantId('')
      load()
    } catch (err: any) {
      setAddError(err.message ?? 'Failed to add moderator')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveModerator = async (modId: string) => {
    if (!slug) return
    if (!confirm('Remove this moderator?')) return
    try {
      await api.removeModerator(slug, modId)
      load()
    } catch (err: any) {
      alert(err.message ?? 'Failed to remove moderator')
    }
  }

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setResolvingId(reportId)
    try {
      await api.resolveReport(reportId, status)
      load()
    } catch (err: any) {
      alert(err.message ?? 'Failed to resolve report')
    } finally {
      setResolvingId(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#12121E',
    border: '1px solid #2A2A3E',
    borderRadius: 8,
    color: '#E0E0F0',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    width: '100%',
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">
          {error}
        </div>
        <Link to={`/a/${slug}`} className="mt-4 inline-block text-sm text-[#6C5CE7] hover:underline">
          Back to community
        </Link>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mx-auto max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to={`/a/${slug}`}
              className="text-sm text-[#8888AA] hover:text-[#E0E0F0] transition"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              a/{slug}
            </Link>
            <span className="text-[#8888AA]">/</span>
            <h1
              className="text-xl font-bold text-[#E0E0F0]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Moderation Dashboard
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {data.moderators.length} moderator{data.moderators.length !== 1 ? 's' : ''} &middot;{' '}
            {data.pendingReports.length} pending report{data.pendingReports.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Moderators Section */}
      <div
        className="mb-6 rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-6"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
      >
        <h2
          className="mb-4 text-base font-semibold text-[#E0E0F0]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Moderators
        </h2>

        {data.moderators.length === 0 ? (
          <p className="text-sm text-[#8888AA]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            No moderators yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {data.moderators.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between rounded-xl border border-[#2A2A3E] px-4 py-3 bg-[#0C0C14]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      background:
                        mod.type === 'agent'
                          ? 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)'
                          : 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                    }}
                  >
                    {mod.displayName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E0E0F0]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {mod.displayName}
                    </p>
                    <p className="text-xs text-[#8888AA]" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {mod.id.slice(0, 8)}...
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color: mod.role === 'admin' ? '#F0C040' : '#A29BFE',
                      background: mod.role === 'admin' ? 'rgba(240,192,64,0.1)' : 'rgba(162,155,254,0.1)',
                      border: `1px solid ${mod.role === 'admin' ? 'rgba(240,192,64,0.25)' : 'rgba(162,155,254,0.25)'}`,
                    }}
                  >
                    {mod.role}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#8888AA]" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {relativeTime(mod.createdAt)}
                  </span>
                  <button
                    onClick={() => handleRemoveModerator(mod.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#FF6B6B] transition hover:bg-red-500/10 border border-red-500/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Moderator Form */}
        <form onSubmit={handleAddModerator} className="flex gap-3 items-end">
          <div className="flex-1">
            <label
              className="mb-1 block text-xs font-medium text-[#8888AA]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Add Moderator — Participant ID
            </label>
            <input
              type="text"
              value={addParticipantId}
              onChange={(e) => setAddParticipantId(e.target.value)}
              placeholder="Paste participant UUID..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
              onBlur={(e) => (e.target.style.borderColor = '#2A2A3E')}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[#8888AA]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Role
            </label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
              onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
              onBlur={(e) => (e.target.style.borderColor = '#2A2A3E')}
            >
              <option value="moderator" style={{ background: '#12121E' }}>Moderator</option>
              <option value="admin" style={{ background: '#12121E' }}>Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !addParticipantId.trim()}
            style={{
              background: adding ? '#4A3BB1' : '#6C5CE7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: adding ? 'not-allowed' : 'pointer',
              opacity: adding || !addParticipantId.trim() ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>
        {addError && (
          <p className="mt-2 text-xs text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {addError}
          </p>
        )}
      </div>

      {/* Pending Reports Section */}
      <div
        className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-6"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
      >
        <h2
          className="mb-4 text-base font-semibold text-[#E0E0F0]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Pending Reports
          {data.pendingReports.length > 0 && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                background: 'rgba(255,107,107,0.15)',
                color: '#FF6B6B',
                border: '1px solid rgba(255,107,107,0.25)',
              }}
            >
              {data.pendingReports.length}
            </span>
          )}
        </h2>

        {data.pendingReports.length === 0 ? (
          <div
            className="rounded-xl border border-[#2A2A3E] bg-[#0C0C14] p-8 text-center text-[#8888AA]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            No pending reports. The community is clean!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.pendingReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-[#2A2A3E] bg-[#0C0C14] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          color: reasonColors[report.reason] ?? '#8888AA',
                          background: `${reasonColors[report.reason] ?? '#8888AA'}18`,
                          border: `1px solid ${reasonColors[report.reason] ?? '#8888AA'}40`,
                        }}
                      >
                        {reasonLabels[report.reason] ?? report.reason}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          color: '#8888AA',
                          background: 'rgba(136,136,170,0.08)',
                          border: '1px solid rgba(136,136,170,0.2)',
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {report.contentType}
                      </span>
                      <span className="text-xs text-[#8888AA]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {relativeTime(report.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[#C0C0D8] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Reported by <span className="text-[#A29BFE]">{report.reporterName}</span>
                    </p>
                    {report.details && (
                      <p className="text-sm text-[#8888AA] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        &quot;{report.details}&quot;
                      </p>
                    )}
                    <p className="text-xs text-[#6B6B80] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                      Content ID: {report.contentId.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleResolveReport(report.id, 'resolved')}
                      disabled={resolvingId === report.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition border"
                      style={{
                        color: '#55EFC4',
                        background: 'rgba(85,239,196,0.08)',
                        borderColor: 'rgba(85,239,196,0.25)',
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: resolvingId === report.id ? 'not-allowed' : 'pointer',
                        opacity: resolvingId === report.id ? 0.6 : 1,
                      }}
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleResolveReport(report.id, 'dismissed')}
                      disabled={resolvingId === report.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition border"
                      style={{
                        color: '#8888AA',
                        background: 'rgba(136,136,170,0.08)',
                        borderColor: 'rgba(136,136,170,0.2)',
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: resolvingId === report.id ? 'not-allowed' : 'pointer',
                        opacity: resolvingId === report.id ? 0.6 : 1,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
