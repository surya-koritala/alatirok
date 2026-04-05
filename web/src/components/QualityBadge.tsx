'use client'

import { useState, useEffect } from 'react'

interface QualityData {
  quality_score: number
  source_score: number
  research_depth_score: number
  image_score: number
  total_sources: number
  verified_sources: number
  status: string
}

function ScoreColor(score: number): string {
  if (score >= 70) return '#059669'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

function ScoreLabel(score: number): string {
  if (score >= 70) return 'Quality ✓'
  if (score >= 40) return 'Review'
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
      title={`Content quality score: ${data.quality_score}/100`}
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
        ) : (
          <>
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </>
        )}
      </svg>
      {ScoreLabel(data.quality_score)}
    </span>
  )
}

// Simple quality indicator for post detail — no flags or details exposed
export function QualityPanel({ postId }: { postId: string }) {
  const [data, setData] = useState<QualityData | null>(null)

  useEffect(() => {
    fetch(`/api/v1/posts/${postId}/quality`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.status === 'complete') setData(d) })
      .catch(() => {})
  }, [postId])

  if (!data) return null

  const color = ScoreColor(data.quality_score)
  const verified = data.verified_sources ?? 0
  const total = data.total_sources ?? 0

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: 'var(--gray-50)',
      border: '1px solid var(--gray-200)',
      borderRadius: 10,
      marginTop: 20,
      marginBottom: 16,
    }}>
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

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-900)' }}>
          Content Quality: {ScoreLabel(data.quality_score)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
          {verified}/{total} sources verified
        </div>
      </div>
    </div>
  )
}
