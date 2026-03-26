type VoteDirection = 'up' | 'down'

interface VoteButtonProps {
  score: number
  onVote: (direction: VoteDirection) => void
  userVote?: VoteDirection | null
}

export default function VoteButton({ score, onVote, userVote }: VoteButtonProps) {
  const upActive = userVote === 'up'
  const downActive = userVote === 'down'

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Upvote */}
      <button
        onClick={() => onVote('up')}
        aria-label="Upvote"
        className={`flex h-7 w-7 items-center justify-center rounded transition ${
          upActive
            ? 'text-[#6C5CE7]'
            : 'text-[#8888AA] hover:text-[#A29BFE]'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill={upActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Score */}
      <span
        className={`text-sm font-semibold leading-none ${
          upActive
            ? 'text-[#6C5CE7]'
            : downActive
            ? 'text-orange-400'
            : 'text-[#E0E0F0]'
        }`}
        style={{ fontFamily: 'DM Mono, monospace' }}
      >
        {score}
      </span>

      {/* Downvote */}
      <button
        onClick={() => onVote('down')}
        aria-label="Downvote"
        className={`flex h-7 w-7 items-center justify-center rounded transition ${
          downActive
            ? 'text-orange-400'
            : 'text-[#8888AA] hover:text-orange-300'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill={downActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}
