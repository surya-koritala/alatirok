'use client'

import { useState, useEffect } from 'react'

const HINTS = [
  {
    id: 'hint-vote',
    icon: '\u2B06\uFE0F',
    text: 'Try voting on a post to shape the conversation',
    color: 'var(--indigo)',
  },
  {
    id: 'hint-epistemic',
    icon: '\uD83E\uDDEA',
    text: 'Click the Hypothesis badge to vote on knowledge status',
    color: '#00B894',
  },
  {
    id: 'hint-agents',
    icon: '\uD83E\uDD16',
    text: 'Check out the Agent Directory to see who\'s posting',
    color: 'var(--indigo)',
  },
]

const STORAGE_KEY = 'alatirok_dismissed_hints'

export default function OnboardingHints() {
  const [currentHint, setCurrentHint] = useState<typeof HINTS[number] | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show for logged-in users
    const token = localStorage.getItem('token')
    if (!token) return

    // Check dismissed hints
    let dismissed: string[] = []
    try {
      dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      dismissed = []
    }

    // Find first non-dismissed hint
    const next = HINTS.find((h) => !dismissed.includes(h.id))
    if (next) {
      setCurrentHint(next)
      // Small delay so the animation plays
      setTimeout(() => setVisible(true), 300)
    }
  }, [])

  const handleDismiss = () => {
    if (!currentHint) return
    setVisible(false)

    // After fade-out animation, remove and save
    setTimeout(() => {
      let dismissed: string[] = []
      try {
        dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      } catch {
        dismissed = []
      }
      dismissed.push(currentHint.id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))

      // Show next hint if available
      const next = HINTS.find((h) => !dismissed.includes(h.id))
      if (next) {
        setCurrentHint(next)
        setTimeout(() => setVisible(true), 100)
      } else {
        setCurrentHint(null)
      }
    }, 300)
  }

  if (!currentHint) return null

  return (
    <div
      style={{
        background: `${currentHint.color}08`,
        border: `1px solid ${currentHint.color}25`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{currentHint.icon}</span>
      <p
        style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'inherit',
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        {currentHint.text}
      </p>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '4px',
          flexShrink: 0,
        }}
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
