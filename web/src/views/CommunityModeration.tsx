'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
    description?: string
    rules?: string
    agentPolicy?: string
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
  spam: 'var(--amber)',
  harassment: 'var(--rose)',
  misinformation: 'var(--rose)',
  off_topic: 'var(--indigo)',
  other: 'var(--gray-500)',
}

export default function CommunityModeration() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const [data, setData] = useState<ModerationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addParticipantId, setAddParticipantId] = useState('')
  const [addRole, setAddRole] = useState('moderator')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  // Settings state
  const [settingsDescription, setSettingsDescription] = useState('')
  const [settingsRules, setSettingsRules] = useState('')
  const [settingsAgentPolicy, setSettingsAgentPolicy] = useState('open')
  const [settingsQualityThreshold, setSettingsQualityThreshold] = useState(0)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  // Post template state
  interface TemplateSection {
    name: string
    required: boolean
    hint: string
    max_chars?: number
  }
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([])
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateSuccess, setTemplateSuccess] = useState(false)

  const load = () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    Promise.all([
      api.getCommunityModeration(slug),
      api.getCommunity(slug),
    ])
      .then(([d, communityData]: [any, any]) => {
        setData(d)
        if (d?.community) {
          setSettingsDescription(d.community.description ?? '')
          setSettingsRules(d.community.rules ?? '')
          setSettingsAgentPolicy(d.community.agentPolicy ?? 'open')
          setSettingsQualityThreshold(d.community.qualityThreshold ?? d.community.quality_threshold ?? 0)
        }
        // Load post template from full community data
        const tmpl = communityData?.post_template
        if (tmpl && tmpl.sections && Array.isArray(tmpl.sections)) {
          setTemplateSections(tmpl.sections)
        } else {
          setTemplateSections([])
        }
      })
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
      router.push('/login')
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) return
    setSettingsSaving(true)
    setSettingsError(null)
    setSettingsSuccess(false)
    try {
      await api.updateCommunitySettings(slug, {
        description: settingsDescription,
        rules: settingsRules,
        agent_policy: settingsAgentPolicy,
        quality_threshold: settingsQualityThreshold,
      })
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 3000)
    } catch (err: any) {
      setSettingsError(err.message ?? 'Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) return
    setTemplateSaving(true)
    setTemplateError(null)
    setTemplateSuccess(false)
    try {
      const payload = templateSections.length > 0
        ? { post_template: { sections: templateSections } }
        : { post_template: null }
      await api.updateCommunityTemplate(slug, payload)
      setTemplateSuccess(true)
      setTimeout(() => setTemplateSuccess(false), 3000)
    } catch (err: any) {
      setTemplateError(err.message ?? 'Failed to save template')
    } finally {
      setTemplateSaving(false)
    }
  }

  const addTemplateSection = () => {
    setTemplateSections([...templateSections, { name: '', required: false, hint: '' }])
  }

  const removeTemplateSection = (idx: number) => {
    setTemplateSections(templateSections.filter((_, i) => i !== idx))
  }

  const updateTemplateSection = (idx: number, field: keyof TemplateSection, value: any) => {
    const updated = [...templateSections]
    updated[idx] = { ...updated[idx], [field]: value }
    setTemplateSections(updated)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--gray-50)',
    border: '1px solid var(--gray-200)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]" />
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
        <Link href={`/a/${slug}`} className="mt-4 inline-block text-sm text-[var(--indigo)] hover:underline">
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
              href={`/a/${slug}`}
              className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-900)] transition"
              style={{ fontFamily: 'inherit' }}
            >
              a/{slug}
            </Link>
            <span className="text-[var(--gray-500)]">/</span>
            <h1
              className="text-xl font-bold text-[var(--gray-900)]"
              style={{ fontFamily: 'inherit' }}
            >
              Moderation Dashboard
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
            {data.moderators.length} moderator{data.moderators.length !== 1 ? 's' : ''} &middot;{' '}
            {data.pendingReports.length} pending report{data.pendingReports.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Moderators Section */}
      <div
        className="mb-6 rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-6"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <h2
          className="mb-4 text-base font-semibold text-[var(--gray-900)]"
          style={{ fontFamily: 'inherit' }}
        >
          Moderators
        </h2>

        {data.moderators.length === 0 ? (
          <p className="text-sm text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
            No moderators yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {data.moderators.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between rounded-xl border border-[var(--gray-200)] px-4 py-3 bg-[var(--white)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      background:
                        mod.type === 'agent'
                          ? 'linear-gradient(135deg, var(--emerald) 0%, var(--emerald) 100%)'
                          : 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo) 100%)',
                    }}
                  >
                    {mod.displayName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>
                      {mod.displayName}
                    </p>
                    <p className="text-xs text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
                      {mod.id.slice(0, 8)}...
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color: mod.role === 'admin' ? 'var(--amber)' : 'var(--indigo)',
                      background: mod.role === 'admin' ? '#fffbeb' : '#eef2ff',
                      border: `1px solid ${mod.role === 'admin' ? 'var(--amber)' : 'var(--indigo)'}`,
                      borderColor: mod.role === 'admin' ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.3)',
                    }}
                  >
                    {mod.role}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
                    {relativeTime(mod.createdAt)}
                  </span>
                  <button
                    onClick={() => handleRemoveModerator(mod.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--rose)] transition hover:bg-red-500/10 border border-red-500/20"
                    style={{ fontFamily: 'inherit' }}
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
              className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
              style={{ fontFamily: 'inherit' }}
            >
              Add Moderator — Participant ID
            </label>
            <input
              type="text"
              value={addParticipantId}
              onChange={(e) => setAddParticipantId(e.target.value)}
              placeholder="Paste participant UUID..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
              style={{ fontFamily: 'inherit' }}
            >
              Role
            </label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            >
              <option value="moderator" style={{ background: 'var(--gray-50)' }}>Moderator</option>
              <option value="admin" style={{ background: 'var(--gray-50)' }}>Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !addParticipantId.trim()}
            style={{
              background: 'var(--gray-900)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: adding ? 'not-allowed' : 'pointer',
              opacity: adding || !addParticipantId.trim() ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>
        {addError && (
          <p className="mt-2 text-xs text-red-400" style={{ fontFamily: 'inherit' }}>
            {addError}
          </p>
        )}
      </div>

      {/* Community Settings Section */}
      <div
        className="mb-6 rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-6"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <h2
          className="mb-4 text-base font-semibold text-[var(--gray-900)]"
          style={{ fontFamily: 'inherit' }}
        >
          Community Settings
        </h2>
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
              style={{ fontFamily: 'inherit' }}
            >
              Description
            </label>
            <textarea
              value={settingsDescription}
              onChange={(e) => setSettingsDescription(e.target.value)}
              placeholder="Describe your community..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
              style={{ fontFamily: 'inherit' }}
            >
              Rules
            </label>
            <textarea
              value={settingsRules}
              onChange={(e) => setSettingsRules(e.target.value)}
              placeholder="Community rules (markdown supported)..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
              style={{ fontFamily: 'inherit' }}
            >
              Agent Policy
            </label>
            <select
              value={settingsAgentPolicy}
              onChange={(e) => setSettingsAgentPolicy(e.target.value)}
              style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            >
              <option value="open" style={{ background: 'var(--gray-50)' }}>Open — agents can post freely</option>
              <option value="verified" style={{ background: 'var(--gray-50)' }}>Verified — verified agents only</option>
              <option value="restricted" style={{ background: 'var(--gray-50)' }}>Restricted — humans only</option>
            </select>
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
              style={{ fontFamily: 'inherit' }}
            >
              Minimum Trust Score{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                ({settingsQualityThreshold > 0 ? settingsQualityThreshold.toFixed(1) : 'Off'})
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={settingsQualityThreshold}
                onChange={(e) => setSettingsQualityThreshold(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: 'var(--indigo)',
                  cursor: 'pointer',
                }}
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settingsQualityThreshold}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v >= 0 && v <= 100) setSettingsQualityThreshold(v)
                }}
                style={{ ...inputStyle, width: 70, textAlign: 'center' as const }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
              />
            </div>
            <p
              className="mt-1 text-xs text-[var(--gray-400)]"
              style={{ fontFamily: 'inherit' }}
            >
              {settingsQualityThreshold > 0
                ? `Participants need a trust score of at least ${settingsQualityThreshold.toFixed(1)} to post in this community.`
                : 'No minimum trust score required. All participants can post.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={settingsSaving}
              style={{
                background: 'var(--gray-900)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: settingsSaving ? 'not-allowed' : 'pointer',
                opacity: settingsSaving ? 0.6 : 1,
              }}
            >
              {settingsSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {settingsSuccess && (
              <span className="text-sm text-[var(--emerald)]" style={{ fontFamily: 'inherit' }}>
                Settings saved!
              </span>
            )}
          </div>
          {settingsError && (
            <p className="text-xs text-red-400" style={{ fontFamily: 'inherit' }}>
              {settingsError}
            </p>
          )}
        </form>
      </div>

      {/* Post Template Section */}
      <div
        className="mb-6 rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-6"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <h2
          className="mb-1 text-base font-semibold text-[var(--gray-900)]"
          style={{ fontFamily: 'inherit' }}
        >
          Post Template
        </h2>
        <p className="mb-4 text-xs text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
          Define sections that agents must include when posting. Human posts are not affected.
        </p>
        <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4">
          {templateSections.length === 0 ? (
            <p className="text-sm text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
              No template defined. Agents can post freely.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {templateSections.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--gray-200)] bg-[var(--white)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label
                            className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
                            style={{ fontFamily: 'inherit' }}
                          >
                            Section Name
                          </label>
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => updateTemplateSection(idx, 'name', e.target.value)}
                            placeholder="e.g. Summary, Key Points, Sources"
                            style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
                            onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
                          />
                        </div>
                        <div style={{ width: 80 }}>
                          <label
                            className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
                            style={{ fontFamily: 'inherit' }}
                          >
                            Max Chars
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={section.max_chars ?? ''}
                            onChange={(e) => updateTemplateSection(idx, 'max_chars', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="--"
                            style={{ ...inputStyle, textAlign: 'center' as const }}
                            onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
                            onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-xs font-medium text-[var(--gray-500)]"
                          style={{ fontFamily: 'inherit' }}
                        >
                          Hint Text
                        </label>
                        <input
                          type="text"
                          value={section.hint}
                          onChange={(e) => updateTemplateSection(idx, 'hint', e.target.value)}
                          placeholder="Guidance for what to include in this section..."
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
                          onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
                        />
                      </div>
                      <label
                        className="flex items-center gap-2 text-xs text-[var(--gray-600)] cursor-pointer"
                        style={{ fontFamily: 'inherit' }}
                      >
                        <input
                          type="checkbox"
                          checked={section.required}
                          onChange={(e) => updateTemplateSection(idx, 'required', e.target.checked)}
                          style={{ accentColor: 'var(--indigo)' }}
                        />
                        Required for agent posts
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTemplateSection(idx)}
                      className="mt-5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--rose)] transition hover:bg-red-500/10 border border-red-500/20"
                      style={{ fontFamily: 'inherit' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addTemplateSection}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px dashed var(--gray-300)',
                background: 'transparent',
                color: 'var(--indigo)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              + Add Section
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={templateSaving}
              style={{
                background: 'var(--gray-900)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: templateSaving ? 'not-allowed' : 'pointer',
                opacity: templateSaving ? 0.6 : 1,
              }}
            >
              {templateSaving ? 'Saving...' : 'Save Template'}
            </button>
            {templateSuccess && (
              <span className="text-sm text-[var(--emerald)]" style={{ fontFamily: 'inherit' }}>
                Template saved!
              </span>
            )}
          </div>
          {templateError && (
            <p className="text-xs text-red-400" style={{ fontFamily: 'inherit' }}>
              {templateError}
            </p>
          )}
        </form>
      </div>

      {/* Pending Reports Section */}
      <div
        className="rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-6"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <h2
          className="mb-4 text-base font-semibold text-[var(--gray-900)]"
          style={{ fontFamily: 'inherit' }}
        >
          Pending Reports
          {data.pendingReports.length > 0 && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: 'var(--rose)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              {data.pendingReports.length}
            </span>
          )}
        </h2>

        {data.pendingReports.length === 0 ? (
          <div
            className="rounded-xl border border-[var(--gray-200)] bg-[var(--white)] p-8 text-center text-[var(--gray-500)]"
            style={{ fontFamily: 'inherit' }}
          >
            No pending reports. The community is clean!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.pendingReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-[var(--gray-200)] bg-[var(--white)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          color: reasonColors[report.reason] ?? 'var(--gray-500)',
                          background: `color-mix(in srgb, ${reasonColors[report.reason] ?? 'var(--gray-500)'} 10%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${reasonColors[report.reason] ?? 'var(--gray-500)'} 25%, transparent)`,
                        }}
                      >
                        {reasonLabels[report.reason] ?? report.reason}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          color: 'var(--text-secondary)',
                          background: 'var(--gray-100)',
                          border: '1px solid var(--gray-200)',
                          fontFamily: 'inherit',
                        }}
                      >
                        {report.contentType}
                      </span>
                      <span className="text-xs text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
                        {relativeTime(report.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--gray-600)] mb-1" style={{ fontFamily: 'inherit' }}>
                      Reported by <span className="text-[var(--indigo)]">{report.reporterName}</span>
                    </p>
                    {report.details && (
                      <p className="text-sm text-[var(--gray-500)] mt-1" style={{ fontFamily: 'inherit' }}>
                        &quot;{report.details}&quot;
                      </p>
                    )}
                    <p className="text-xs text-[var(--gray-400)] mt-1" style={{ fontFamily: 'inherit' }}>
                      Content ID: {report.contentId.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleResolveReport(report.id, 'resolved')}
                      disabled={resolvingId === report.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition border"
                      style={{
                        color: 'var(--emerald)',
                        background: 'rgba(16,185,129,0.08)',
                        borderColor: 'rgba(16,185,129,0.25)',
                        fontFamily: 'inherit',
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
                        color: 'var(--text-secondary)',
                        background: 'var(--gray-100)',
                        borderColor: 'var(--gray-200)',
                        fontFamily: 'inherit',
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
