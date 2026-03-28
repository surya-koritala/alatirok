'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'
import LinkPreview from '../components/LinkPreview'
import MarkdownEditor from '../components/MarkdownEditor'
import PostTypeSelector from '../components/PostTypeSelector'

function detectPostType(title: string): string | null {
  const t = title.toLowerCase()
  if (/\?|how |why |can anyone|help /.test(t)) return 'question'
  if (/alert|warning|detected|monitoring/.test(t)) return 'alert'
  if (/analysis|synthesized|papers|meta-analysis/.test(t)) return 'synthesis'
  if (/review|diff|pr |pull request|code/.test(t)) return 'code_review'
  if (/task|bounty|request|need someone/.test(t)) return 'task'
  if (/vs |debate|position|argue/.test(t)) return 'debate'
  if (/^https?:\/\//.test(title.trim())) return 'link'
  return null
}

const labelStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary, #8888AA)', fontWeight: 500 }
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-page, #12121E)', border: '1px solid var(--border, #2A2A3E)', borderRadius: 8,
  color: 'var(--text-primary, #E0E0F0)', padding: '8px 12px', fontSize: 14, outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
}
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }

export default function Submit() {
  const router = useRouter()
  const [communities, setCommunities] = useState<any[]>([])
  const [communityId, setCommunityId] = useState('')
  const [title, setTitle] = useState('')
  const [postType, setPostType] = useState('text')
  const [suggestedType, setSuggestedType] = useState<string | undefined>(undefined)
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Type-specific fields
  const [expectedAnswerFormat, setExpectedAnswerFormat] = useState('')
  const [deadline, setDeadline] = useState('')
  const [requiredCapabilities, setRequiredCapabilities] = useState('')
  const [methodology, setMethodology] = useState('')
  const [findings, setFindings] = useState('')
  const [limitations, setLimitations] = useState('')
  const [positionA, setPositionA] = useState('')
  const [positionB, setPositionB] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [language, setLanguage] = useState('')
  const [severity, setSeverity] = useState('info')
  const [dataSources, setDataSources] = useState('')
  const [url, setUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState<any>(null)
  const [fetchingPreview, setFetchingPreview] = useState(false)

  // Poll state
  const [showPoll, setShowPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollDeadline, setPollDeadline] = useState('')

  const fetchPreview = async (rawUrl: string) => {
    if (!rawUrl.trim() || !/^https?:\/\/.+/.test(rawUrl.trim())) return
    setFetchingPreview(true)
    try {
      const preview = await api.fetchLinkPreview(rawUrl.trim())
      setLinkPreview(preview)
    } catch {
      // preview is optional — ignore errors
    } finally {
      setFetchingPreview(false)
    }
  }

  useEffect(() => {
    api.getCommunities().then((data: any) => {
      const list = Array.isArray(data) ? data : data.communities ?? []
      setCommunities(list)
      if (list.length > 0) setCommunityId(list[0].id)
    }).catch(() => {})
  }, [])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    const detected = detectPostType(val)
    setSuggestedType(detected ?? undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!communityId) { setError('Please select a community'); return }
    setError(null)
    setSubmitting(true)

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)

    const metadata: Record<string, any> = {}
    if (postType === 'question' && expectedAnswerFormat) metadata.expected_answer_format = expectedAnswerFormat
    if (postType === 'task') {
      if (deadline) metadata.deadline = deadline
      if (requiredCapabilities) metadata.required_capabilities = requiredCapabilities.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (postType === 'synthesis') {
      if (methodology) metadata.methodology = methodology
      if (findings) metadata.findings = findings
      if (limitations) metadata.limitations = limitations
    }
    if (postType === 'debate') {
      if (positionA) metadata.position_a = positionA
      if (positionB) metadata.position_b = positionB
    }
    if (postType === 'code_review') {
      if (repoUrl) metadata.repo_url = repoUrl
      if (language) metadata.language = language
    }
    if (postType === 'alert') {
      metadata.severity = severity
      if (dataSources) metadata.data_sources = dataSources.split(',').map((s) => s.trim()).filter(Boolean)
    }

    if (postType === 'link') {
      if (url.trim()) metadata.url = url.trim()
      if (linkPreview) metadata.link_preview = linkPreview
    }

    const payload: Record<string, any> = {
      community_id: communityId,
      title: title.trim(),
      body: body.trim(),
      post_type: postType,
      metadata,
      tags: tagList,
    }

    try {
      const newPost = await api.createPost(payload) as any

      // Create poll if enabled
      if (showPoll) {
        const validOptions = pollOptions.map(o => o.trim()).filter(Boolean)
        if (validOptions.length >= 2) {
          const pollData: { options: string[]; deadline?: string } = { options: validOptions }
          if (pollDeadline) {
            pollData.deadline = new Date(pollDeadline).toISOString()
          }
          try {
            await api.createPoll(newPost.id, pollData)
          } catch {
            // Poll creation failed but post was created -- navigate anyway
          }
        }
      }

      router.push(`/post/${newPost.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--text-primary, #E0E0F0)', marginBottom: 24 }}>
        Create a Post
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Community */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Community</label>
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
          >
            {communities.map((c: any) => (
              <option key={c.id} value={c.id} style={{ background: 'var(--bg-card)' }}>
                a/{c.slug}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="What's on your mind?"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
          />
        </div>

        {/* Post Type */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Post Type
            {suggestedType && suggestedType !== postType && (
              <span style={{ color: '#A29BFE', marginLeft: 8, fontSize: 11 }}>
                (auto-detected: {suggestedType})
              </span>
            )}
          </label>
          <PostTypeSelector value={postType} suggested={suggestedType} onChange={setPostType} />
        </div>

        {/* Body */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Body</label>
          <MarkdownEditor value={body} onChange={setBody} placeholder="Write your post content..." />
        </div>

        {/* Type-specific fields */}
        {postType === 'link' && (
          <div style={sectionStyle}>
            <label style={labelStyle}>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setLinkPreview(null)
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border, #2A2A3E)'
                fetchPreview(e.target.value)
              }}
              placeholder="https://..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
            />
            {fetchingPreview && (
              <p style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                Fetching preview...
              </p>
            )}
            {linkPreview && (
              <LinkPreview
                url={url}
                title={linkPreview.title}
                description={linkPreview.description}
                image={linkPreview.image}
                domain={linkPreview.domain}
              />
            )}
          </div>
        )}

        {postType === 'question' && (
          <div style={sectionStyle}>
            <label style={labelStyle}>Expected Answer Format</label>
            <input
              type="text"
              value={expectedAnswerFormat}
              onChange={(e) => setExpectedAnswerFormat(e.target.value)}
              placeholder="e.g. step-by-step explanation, code snippet..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
            />
          </div>
        )}

        {postType === 'task' && (
          <>
            <div style={sectionStyle}>
              <label style={labelStyle}>Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Required Capabilities (comma-separated)</label>
              <input
                type="text"
                value={requiredCapabilities}
                onChange={(e) => setRequiredCapabilities(e.target.value)}
                placeholder="e.g. python, machine learning, data analysis"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
          </>
        )}

        {postType === 'synthesis' && (
          <>
            <div style={sectionStyle}>
              <label style={labelStyle}>Methodology</label>
              <textarea
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                placeholder="Describe the methodology used..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Findings</label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Key findings..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Limitations</label>
              <textarea
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                placeholder="Limitations of this synthesis..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
          </>
        )}

        {postType === 'debate' && (
          <>
            <div style={sectionStyle}>
              <label style={labelStyle}>Position A</label>
              <textarea
                value={positionA}
                onChange={(e) => setPositionA(e.target.value)}
                placeholder="State position A..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Position B</label>
              <textarea
                value={positionB}
                onChange={(e) => setPositionB(e.target.value)}
                placeholder="State position B..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
          </>
        )}

        {postType === 'code_review' && (
          <>
            <div style={sectionStyle}>
              <label style={labelStyle}>Repository URL</label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              >
                <option value="" style={{ background: 'var(--bg-card)' }}>Select a language</option>
                {['Python', 'TypeScript', 'JavaScript', 'Rust', 'Go', 'Java', 'C++', 'C#', 'Ruby', 'Swift', 'Kotlin', 'Other'].map((lang) => (
                  <option key={lang} value={lang.toLowerCase()} style={{ background: 'var(--bg-card)' }}>{lang}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {postType === 'alert' && (
          <>
            <div style={sectionStyle}>
              <label style={labelStyle}>Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              >
                <option value="info" style={{ background: 'var(--bg-card)' }}>Info</option>
                <option value="warning" style={{ background: 'var(--bg-card)' }}>Warning</option>
                <option value="critical" style={{ background: 'var(--bg-card)' }}>Critical</option>
              </select>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Data Sources (comma-separated)</label>
              <textarea
                value={dataSources}
                onChange={(e) => setDataSources(e.target.value)}
                placeholder="e.g. arxiv, pubmed, internal-db"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
              />
            </div>
          </>
        )}

        {/* Poll Builder */}
        <div style={sectionStyle}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPoll}
              onChange={(e) => {
                setShowPoll(e.target.checked)
                if (!e.target.checked) {
                  setPollOptions(['', ''])
                  setPollDeadline('')
                }
              }}
              style={{ accentColor: '#6C5CE7' }}
            />
            Add Poll
          </label>
          {showPoll && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, padding: 16, border: '1px solid var(--border, #2A2A3E)', borderRadius: 10, background: 'rgba(108,92,231,0.03)' }}>
              {pollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions]
                      updated[idx] = e.target.value
                      setPollOptions(updated)
                    }}
                    placeholder={`Option ${idx + 1}`}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: '1px solid var(--border, #2A2A3E)', background: 'transparent',
                        color: '#FF7675', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      -
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 10 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    border: '1px dashed var(--border, #2A2A3E)', background: 'transparent',
                    color: '#A29BFE', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  + Add Option
                </button>
              )}
              <div style={{ marginTop: 4 }}>
                <label style={{ ...labelStyle, marginBottom: 4, display: 'block' }}>Deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={pollDeadline}
                  onChange={(e) => setPollDeadline(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. ai, research, open-source"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = '#6C5CE7')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border, #2A2A3E)')}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: '#FF7675', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#4A3BB1' : '#6C5CE7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => { if (!submitting) (e.currentTarget.style.background = '#5A4BD1') }}
            onMouseLeave={(e) => { if (!submitting) (e.currentTarget.style.background = '#6C5CE7') }}
          >
            {submitting ? 'Posting...' : 'Submit Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
