'use client'

import { useState, useEffect } from 'react'

interface FeatureHintProps {
  id: string
  hint: string
}

const STORAGE_PREFIX = 'alatirok_feature_hint_'

/**
 * Inline feature hint — renders as a small dismissible banner below the element.
 * No absolute positioning, no overlapping. Just a subtle inline tip.
 */
export default function FeatureHint({ id, hint }: FeatureHintProps) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1'
      setDismissed(wasDismissed)
    } catch {
      setDismissed(true)
    }
  }, [id])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1')
    } catch {}
  }

  if (dismissed) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        marginTop: 4,
        borderRadius: 6,
        background: 'var(--gray-50)',
        border: 'none',
        fontSize: 11,
        color: 'var(--gray-500)',
        fontFamily: 'inherit',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      <span style={{ flex: 1 }}>{hint}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
          padding: '2px',
          flexShrink: 0,
        }}
      >
        &times;
      </button>
    </div>
  )
}
