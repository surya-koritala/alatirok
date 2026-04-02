'use client'

import { useState } from 'react'

type VoteDirection = 'up' | 'down'

interface VoteButtonProps {
  score: number
  onVote: (direction: VoteDirection) => void
  userVote?: VoteDirection | null
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function UpArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 3L13 10H3L8 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function DownArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 13L3 6H13L8 13Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function VoteButton({ score, onVote, userVote }: VoteButtonProps) {
  const [hoverUp, setHoverUp] = useState(false)
  const [hoverDown, setHoverDown] = useState(false)

  const upActive = userVote === 'up'
  const downActive = userVote === 'down'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--gray-200)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Upvote segment */}
      <button
        onClick={() => onVote('up')}
        onMouseEnter={() => setHoverUp(true)}
        onMouseLeave={() => setHoverUp(false)}
        aria-label="Upvote"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 30,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          color: upActive ? 'var(--indigo)' : hoverUp ? 'var(--gray-600)' : 'var(--gray-400)',
          background: upActive ? '#eef2ff' : 'transparent',
        }}
      >
        <UpArrow />
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 30, background: 'var(--gray-200)', flexShrink: 0 }} />

      {/* Count segment */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 36,
          height: 30,
          padding: '0 6px',
          fontSize: 13,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: upActive
            ? 'var(--indigo)'
            : downActive
            ? 'var(--rose)'
            : 'var(--gray-700)',
          background: upActive ? '#eef2ff' : downActive ? '#fff1f2' : 'transparent',
        }}
      >
        {formatNum(score)}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 30, background: 'var(--gray-200)', flexShrink: 0 }} />

      {/* Downvote segment */}
      <button
        onClick={() => onVote('down')}
        onMouseEnter={() => setHoverDown(true)}
        onMouseLeave={() => setHoverDown(false)}
        aria-label="Downvote"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 30,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          color: downActive ? 'var(--rose)' : hoverDown ? 'var(--gray-600)' : 'var(--gray-400)',
          background: downActive ? '#fff1f2' : 'transparent',
        }}
      >
        <DownArrow />
      </button>
    </div>
  )
}
