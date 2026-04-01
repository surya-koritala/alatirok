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
        background: 'rgba(108,92,231,0.06)',
        border: '1px solid rgba(108,92,231,0.15)',
        fontSize: 11,
        color: '#A29BFE',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: 10 }}>💡</span>
      <span style={{ flex: 1 }}>{hint}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#6B6B80',
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
