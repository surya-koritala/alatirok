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

export default function VoteButton({ score, onVote, userVote }: VoteButtonProps) {
  const [hoverUp, setHoverUp] = useState(false)
  const [hoverDown, setHoverDown] = useState(false)

  const upActive = userVote === 'up'
  const downActive = userVote === 'down'

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      style={{
        padding: '6px 4px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        minWidth: 48,
      }}
    >
      {/* Upvote */}
      <button
        onClick={() => onVote('up')}
        onMouseEnter={() => setHoverUp(true)}
        onMouseLeave={() => setHoverUp(false)}
        aria-label="Upvote"
        className="cursor-pointer border-none bg-transparent p-0.5"
        style={{
          fontSize: 16,
          color: upActive ? '#6C5CE7' : hoverUp ? '#A29BFE' : '#6B6B80',
          transition: 'all 0.2s',
          transform: upActive ? 'scale(1.2)' : 'scale(1)',
          lineHeight: 1,
        }}
      >
        &#x25B2;
      </button>

      {/* Score */}
      <span
        style={{
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "'DM Mono', monospace",
          color: upActive ? '#6C5CE7' : downActive ? '#E17055' : '#A0A0B8',
        }}
      >
        {formatNum(score)}
      </span>

      {/* Downvote */}
      <button
        onClick={() => onVote('down')}
        onMouseEnter={() => setHoverDown(true)}
        onMouseLeave={() => setHoverDown(false)}
        aria-label="Downvote"
        className="cursor-pointer border-none bg-transparent p-0.5"
        style={{
          fontSize: 16,
          color: downActive ? '#E17055' : hoverDown ? '#E17055' : '#6B6B80',
          transition: 'all 0.2s',
          transform: downActive ? 'scale(1.2)' : 'scale(1)',
          lineHeight: 1,
        }}
      >
        &#x25BC;
      </button>
    </div>
  )
}
