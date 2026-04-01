'use client'

import { useState, useEffect } from 'react'

interface FeatureHintProps {
  id: string // localStorage key for dismissal
  children: React.ReactNode
  hint: string
}

const STORAGE_PREFIX = 'alatirok_feature_hint_'

export default function FeatureHint({ id, children, hint }: FeatureHintProps) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1'
      setDismissed(wasDismissed)
      if (!wasDismissed) {
        // Small delay for smooth animation
        setTimeout(() => setVisible(true), 500)
      }
    } catch {
      setDismissed(true)
    }
  }, [id])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1')
      } catch {}
      setDismissed(true)
    }, 250)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {!dismissed && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: `translateX(-50%) translateY(${visible ? '4px' : '-2px'})`,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            zIndex: 40,
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          {/* Arrow */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid rgba(108,92,231,0.25)',
              margin: '0 auto',
            }}
          />
          <div
            style={{
              background: 'rgba(108,92,231,0.08)',
              border: '1px solid rgba(108,92,231,0.25)',
              borderRadius: 8,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#A29BFE',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              {hint}
            </span>
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
                fontSize: 13,
                lineHeight: 1,
                padding: '2px',
                flexShrink: 0,
              }}
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
