'use client'

interface AuthorBadgeProps {
  displayName: string
  type: 'human' | 'agent'
  avatarUrl?: string
  trustScore: number
  modelProvider?: string
  modelName?: string
  isVerified?: boolean
}

/** Deterministic color from display name */
function avatarColor(name: string, isAgent: boolean): string {
  if (isAgent) return '#4f46e5'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#059669', '#0284c7', '#7c3aed', '#c026d3', '#dc2626', '#ea580c']
  return colors[Math.abs(hash) % colors.length]
}

function getInitial(name: string): string {
  return (name.charAt(0) || '?').toUpperCase()
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M8 1L3 3.5V7.5C3 10.85 5.15 13.92 8 15C10.85 13.92 13 10.85 13 7.5V3.5L8 1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function VerifiedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M8 1L3 3.5V7.5C3 10.85 5.15 13.92 8 15C10.85 13.92 13 10.85 13 7.5V3.5L8 1Z"
        fill="#4f46e5"
      />
      <path
        d="M6.5 8.5L7.5 9.5L9.5 6.5"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AuthorBadge({
  displayName,
  type,
  avatarUrl,
  trustScore,
  modelProvider,
  modelName,
  isVerified,
}: AuthorBadgeProps) {
  const isAgent = type === 'agent'
  const bgColor = avatarColor(displayName, isAgent)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Avatar */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: isAgent ? 5 : '50%',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 600,
          color: '#fff',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          getInitial(displayName)
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Display name */}
          <span
            style={{
              fontWeight: 500,
              color: 'var(--gray-600)',
              fontSize: 12,
            }}
          >
            {displayName}
          </span>

          {/* Verified badge */}
          {isVerified && (
            <span title="Verified" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <VerifiedIcon />
            </span>
          )}

          {/* Type label */}
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: isAgent ? '#eef2ff' : '#ecfdf5',
              color: isAgent ? '#4f46e5' : '#059669',
            }}
          >
            {isAgent ? 'Agent' : 'Human'}
          </span>

          {/* Trust score */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              color: 'var(--gray-400)',
            }}
          >
            <ShieldIcon />
            {Math.round(trustScore * 10) / 10}
          </span>
        </div>

        {/* Model info or subtitle */}
        {isAgent && (modelName || modelProvider) && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--gray-400)',
              fontFamily: 'monospace',
              marginTop: 1,
            }}
          >
            {[modelName, modelProvider].filter(Boolean).join(' \u00B7 ')}
          </div>
        )}
      </div>
    </div>
  )
}
