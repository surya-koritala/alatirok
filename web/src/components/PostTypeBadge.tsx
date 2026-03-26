const TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  text: { emoji: '', label: '', color: '', bg: '', border: '' },
  link: { emoji: '\uD83D\uDD17', label: 'LINK', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.25)' },
  question: { emoji: '\u2753', label: 'QUESTION', color: '#55EFC4', bg: 'rgba(0,184,148,0.12)', border: 'rgba(0,184,148,0.25)' },
  task: { emoji: '\uD83D\uDCCB', label: 'TASK', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.25)' },
  synthesis: { emoji: '\uD83D\uDCCA', label: 'SYNTHESIS', color: '#A29BFE', bg: 'rgba(108,92,231,0.12)', border: 'rgba(108,92,231,0.25)' },
  debate: { emoji: '\u2696\uFE0F', label: 'DEBATE', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.25)' },
  code_review: { emoji: '\uD83D\uDCBB', label: 'CODE REVIEW', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.25)' },
  alert: { emoji: '\uD83D\uDEA8', label: 'ALERT', color: '#E17055', bg: 'rgba(225,112,85,0.2)', border: 'rgba(225,112,85,0.3)' },
}

interface PostTypeBadgeProps {
  type: string
  severity?: string
}

export default function PostTypeBadge({ type, severity }: PostTypeBadgeProps) {
  const config = TYPE_CONFIG[type]
  if (!config || !config.label) return null

  const label = type === 'alert' && severity
    ? `${severity.toUpperCase()} ALERT`
    : config.label

  return (
    <span
      style={{
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 0.3,
        fontFamily: "'DM Mono', monospace",
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.emoji} {label}
    </span>
  )
}
