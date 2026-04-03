'use client'

import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface QualityData {
  quality_score: number
  source_score: number
  research_depth_score: number
  image_score: number
  total_sources: number
  verified_sources: number
  invalid_sources: number
  flags: Array<{ type: string; detail: string; source_url?: string }>
  status: string
}

function ScoreColor(score: number): string {
  if (score >= 70) return '#059669' // green
  if (score >= 40) return '#d97706' // amber
  return '#dc2626' // red
}

function ScoreLabel(score: number): string {
  if (score >= 70) return 'Verified'
  if (score >= 40) return 'Partial'
  return 'Low Quality'
}

// Compact badge for feed cards
export function QualityBadgeCompact({ postId }: { postId: string }) {
  const [data, setData] = useState<QualityData | null>(null)

  useEffect(() => {
    fetch(`/api/v1/posts/${postId}/quality`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.status === 'complete') setData(d) })
      .catch(() => {})
  }, [postId])

  if (!data) return null

  const color = ScoreColor(data.quality_score)

  return (
    <span
      title={`Quality: ${data.quality_score}/100 | Sources: ${data.verified_sources}/${data.total_sources} verified`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        color,
        padding: '1px 6px',
        borderRadius: 4,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        {data.quality_score >= 70 ? (
          <polyline points="20 6 9 17 4 12" />
        ) : data.quality_score >= 40 ? (
          <>
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </>
        )}
      </svg>
      {ScoreLabel(data.quality_score)}
    </span>
  )
}

// Detailed panel for post detail page
export function QualityPanel({ postId }: { postId: string }) {
  const [data, setData] = useState<QualityData | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/posts/${postId}/quality`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.status === 'complete') setData(d) })
      .catch(() => {})
  }, [postId])

  if (!data) return null

  const color = ScoreColor(data.quality_score)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '10px 14px',
          background: 'var(--gray-50)',
          border: 'none',
          borderRadius: expanded ? '8px 8px 0 0' : 8,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {/* Score circle */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color,
          flexShrink: 0,
        }}>
          {data.quality_score}
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-900)' }}>
            Content Quality: {ScoreLabel(data.quality_score)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
            {data.verified_sources}/{data.total_sources} sources verified
            {data.flags.length > 0 && ` · ${data.flags.length} flag${data.flags.length > 1 ? 's' : ''}`}
          </div>
        </div>

        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '12px 14px',
          background: 'var(--gray-50)',
          borderRadius: '0 0 8px 8px',
          borderTop: '1px solid var(--gray-200)',
        }}>
          {/* Score bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <ScoreBar label="Sources" score={data.source_score} />
            <ScoreBar label="Research Depth" score={data.research_depth_score} />
            <ScoreBar label="Images" score={data.image_score} />
          </div>

          {/* Flags */}
          {data.flags.length > 0 && (
            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Flags
              </div>
              {data.flags.map((flag, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  fontSize: 11, color: 'var(--gray-600)', marginBottom: 4,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 9v4" /><path d="M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span>{flag.detail}{flag.source_url && <span style={{ color: 'var(--gray-400)' }}> ({flag.source_url})</span>}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = ScoreColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--gray-500)', width: 100, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--gray-200)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, width: 28, textAlign: 'right' }}>{score}</span>
    </div>
  )
}
