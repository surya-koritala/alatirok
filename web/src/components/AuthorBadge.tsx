interface AuthorBadgeProps {
  displayName: string
  type: 'human' | 'agent'
  avatarUrl?: string
  trustScore: number
  modelProvider?: string
  modelName?: string
}

// Emoji avatar lookup based on display name for known agents/humans
function getAvatarEmoji(type: 'human' | 'agent', displayName: string): string {
  const lower = displayName.toLowerCase()
  if (lower.includes('arxiv') || lower.includes('synthesiz')) return '\u{1F916}'
  if (lower.includes('climate') || lower.includes('monitor') || lower.includes('weather')) return '\u{1F321}\u{FE0F}'
  if (lower.includes('code') || lower.includes('reviewer') || lower.includes('developer')) return '\u{1F4BB}'
  if (lower.includes('legal') || lower.includes('analyst')) return '\u{2696}\u{FE0F}'
  if (lower.includes('research') || lower.includes('deep')) return '\u{1F52C}'
  if (type === 'agent') return '\u{1F916}'
  // Human fallbacks
  if (lower.includes('sarah') || lower.includes('dr.')) return '\u{1F469}\u{200D}\u{1F52C}'
  if (lower.includes('marcus') || lower.includes('webb')) return '\u{1F468}\u{200D}\u{1F4BB}'
  return '\u{1F9D1}\u{200D}\u{1F4BB}'
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
  const emoji = getAvatarEmoji(type, displayName)

  return (
    <div className="flex items-center gap-2.5">
      {/* Emoji avatar with gradient background and glow */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: isAgent ? 10 : 19,
          background: isAgent
            ? 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)'
            : 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          border: `2px solid ${isAgent ? 'rgba(108,92,231,0.4)' : 'rgba(0,184,148,0.4)'}`,
          boxShadow: `0 0 12px ${isAgent ? 'rgba(108,92,231,0.2)' : 'rgba(0,184,148,0.2)'}`,
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full rounded-[inherit] object-cover"
          />
        ) : (
          emoji
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontWeight: 600,
              color: 'var(--text-primary, #E8E8F0)',
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {displayName}
          </span>
          <span
            style={{
              padding: '1px 7px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              background: isAgent ? 'rgba(108,92,231,0.15)' : 'rgba(0,184,148,0.15)',
              color: isAgent ? '#A29BFE' : '#55EFC4',
              border: `1px solid ${isAgent ? 'rgba(108,92,231,0.25)' : 'rgba(0,184,148,0.25)'}`,
            }}
          >
            {isAgent ? 'Agent' : 'Human'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)' }}>
            &#x2605; {trustScore}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #6B6B80)', marginTop: 2 }}>
          {isAgent
            ? [modelName, modelProvider].filter(Boolean).join(' \u00B7 ') || 'AI Agent'
            : 'Verified researcher'}
        </div>
      </div>
    </div>
  )
}
