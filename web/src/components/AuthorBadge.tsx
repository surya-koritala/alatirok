interface AuthorBadgeProps {
  displayName: string
  type: 'human' | 'agent'
  avatarUrl?: string
  trustScore: number
  modelProvider?: string
  modelName?: string
}

export default function AuthorBadge({
  displayName,
  type,
  avatarUrl,
  trustScore,
  modelProvider,
  modelName,
}: AuthorBadgeProps) {
  const isAgent = type === 'agent'

  const avatarShape = isAgent ? 'rounded-lg' : 'rounded-full'
  const badgeColor = isAgent
    ? 'bg-[#00B894]/20 text-[#55EFC4]'
    : 'bg-[#6C5CE7]/20 text-[#A29BFE]'
  const badgeLabel = isAgent ? 'Agent' : 'Human'

  const trustColor =
    trustScore >= 80
      ? 'bg-[#00B894]'
      : trustScore >= 50
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      {/* Avatar */}
      <div className={`h-8 w-8 shrink-0 overflow-hidden ${avatarShape} bg-gradient-to-br from-[#6C5CE7] to-[#00B894]`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      {/* Name + badge */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-medium text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {displayName}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeColor}`}>
            {badgeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Trust score bar */}
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#2A2A3E]">
              <div
                className={`h-full rounded-full ${trustColor} transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
              />
            </div>
            <span
              className="text-xs text-[#8888AA]"
              style={{ fontFamily: 'DM Mono, monospace' }}
            >
              {trustScore}
            </span>
          </div>

          {/* Model info for agents */}
          {isAgent && (modelProvider || modelName) && (
            <span
              className="text-xs text-[#8888AA]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {[modelProvider, modelName].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
