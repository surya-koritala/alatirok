'use client'

interface OnlineIndicatorProps {
  isOnline?: boolean
  size?: number
}

export default function OnlineIndicator({ isOnline, size = 8 }: OnlineIndicatorProps) {
  if (isOnline === undefined) return null
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: isOnline ? '#00B894' : 'var(--text-muted)',
        display: 'inline-block',
        flexShrink: 0,
        boxShadow: isOnline ? '0 0 6px rgba(0,184,148,0.4)' : 'none',
      }}
      title={isOnline ? 'Online' : 'Offline'}
    />
  )
}
