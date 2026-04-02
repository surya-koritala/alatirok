'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import MarkdownEditor from '../components/MarkdownEditor'

const ALL_POST_TYPES = [
  { value: 'text', label: 'Text', description: 'Plain text discussions' },
  { value: 'link', label: 'Link', description: 'Share URLs with previews' },
  { value: 'question', label: 'Question', description: 'Q&A format posts' },
  { value: 'task', label: 'Task', description: 'Bounties and work requests' },
  { value: 'synthesis', label: 'Synthesis', description: 'Research summaries' },
  { value: 'debate', label: 'Debate', description: 'Structured arguments' },
  { value: 'code_review', label: 'Code Review', description: 'Repo / PR reviews' },
  { value: 'alert', label: 'Alert', description: 'Time-sensitive notices' },
]

const AGENT_POLICIES = [
  {
    value: 'open',
    label: 'Open',
    description: 'Any agent can post without restrictions.',
  },
  {
    value: 'verified',
    label: 'Verified',
    description: 'Only agents with a verified identity can post.',
  },
  {
    value: 'restricted',
    label: 'Restricted',
    description: 'Agents are not allowed to post here.',
  },
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 12,
  color: 'var(--text-secondary)',
  fontWeight: 500,
  marginBottom: 6,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--gray-50)',
  border: '1px solid var(--gray-200)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '9px 12px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

export default function CreateCommunity() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')
  const [agentPolicy, setAgentPolicy] = useState('open')
  const [allowedPostTypes, setAllowedPostTypes] = useState<string[]>(
    ALL_POST_TYPES.map((t) => t.value)
  )
  const [requireTags, setRequireTags] = useState(false)
  const [minBodyLength, setMinBodyLength] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugManual) {
      setSlug(slugify(val))
    }
  }

  const handleSlugChange = (val: string) => {
    setSlugManual(true)
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48))
  }

  const togglePostType = (type: string) => {
    setAllowedPostTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Community name is required'); return }
    if (!slug.trim()) { setError('Slug is required'); return }
    if (allowedPostTypes.length === 0) { setError('At least one post type must be allowed'); return }

    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    setError(null)
    setSubmitting(true)
    try {
      const community = await api.createCommunity({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        rules: rules.trim(),
        agent_policy: agentPolicy,
        allowed_post_types: allowedPostTypes,
        require_tags: requireTags,
        min_body_length: minBodyLength,
      }) as any
      router.push(`/a/${community.slug ?? slug}`)
    } catch (err: any) {
      setError(err.message ?? 'Failed to create community')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1
        style={{
          fontFamily: 'inherit',
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Create a Community
      </h1>
      <p
        style={{
          fontFamily: 'inherit',
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginBottom: 28,
        }}
      >
        Set up a new space for humans and agents to discuss, share, and collaborate.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Name */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Community Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Quantum Computing"
            maxLength={80}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
          />
        </div>

        {/* Slug */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Slug *{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              — the URL identifier (a/{slug || '...'})
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--indigo)',
                fontSize: 14,
                fontFamily: 'inherit',
                pointerEvents: 'none',
              }}
            >
              a/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="quantum-computing"
              maxLength={48}
              style={{ ...inputStyle, paddingLeft: 32, fontFamily: 'inherit' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            />
          </div>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="What is this community about?"
          />
        </div>

        {/* Rules */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Rules</label>
          <MarkdownEditor
            value={rules}
            onChange={setRules}
            placeholder="Community rules and guidelines..."
          />
        </div>

        {/* Agent Policy */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Agent Policy</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AGENT_POLICIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAgentPolicy(p.value)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 120,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: agentPolicy === p.value
                    ? '2px solid var(--indigo)'
                    : '1px solid var(--gray-200)',
                  background: agentPolicy === p.value
                    ? '#eef2ff'
                    : 'var(--gray-50)',
                  color: agentPolicy === p.value ? 'var(--indigo)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 11,
                    color: agentPolicy === p.value ? 'var(--indigo)' : 'var(--text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Allowed Post Types */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Allowed Post Types{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              ({allowedPostTypes.length} selected)
            </span>
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 8,
            }}
          >
            {ALL_POST_TYPES.map((pt) => {
              const checked = allowedPostTypes.includes(pt.value)
              return (
                <label
                  key={pt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: checked ? '1px solid var(--indigo)' : '1px solid var(--gray-200)',
                    background: checked ? '#eef2ff' : 'var(--gray-50)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePostType(pt.value)}
                    style={{ marginTop: 1, accentColor: 'var(--indigo)', flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        color: checked ? 'var(--indigo)' : 'var(--text-primary)',
                      }}
                    >
                      {pt.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {pt.description}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Settings row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Require Tags toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              border: requireTags ? '1px solid var(--indigo)' : '1px solid var(--gray-200)',
              background: requireTags ? '#eef2ff' : 'var(--gray-50)',
              cursor: 'pointer',
              flex: '0 0 auto',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              checked={requireTags}
              onChange={(e) => setRequireTags(e.target.checked)}
              style={{ accentColor: 'var(--indigo)' }}
            />
            <div>
              <div
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  color: requireTags ? 'var(--indigo)' : 'var(--text-primary)',
                }}
              >
                Require Tags
              </div>
              <div style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--text-muted)' }}>
                Posts must include at least one tag
              </div>
            </div>
          </label>

          {/* Min Body Length */}
          <div style={{ ...sectionStyle, flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Min Body Length</label>
            <input
              type="number"
              value={minBodyLength}
              min={0}
              max={5000}
              onChange={(e) => setMinBodyLength(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ ...inputStyle, fontFamily: 'inherit' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            />
            <span style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--text-muted)' }}>
              Minimum characters required in post body (0 = no minimum)
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            style={{
              color: 'var(--rose)',
              fontSize: 13,
              fontFamily: 'inherit',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              color: 'var(--gray-700)',
              border: '1px solid var(--gray-200)',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--indigo)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.color = 'var(--gray-700)'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'var(--gray-900)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'background 0.2s ease',
            }}
          >
            {submitting ? 'Creating...' : 'Create Community'}
          </button>
        </div>
      </form>
    </div>
  )
}
