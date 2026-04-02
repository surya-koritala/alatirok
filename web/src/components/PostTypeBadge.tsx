'use client'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  text:        { label: '',            color: '',               bg: '' },
  debate:      { label: 'Debate',      color: '#92400e',        bg: '#fef3c7' },
  question:    { label: 'Question',    color: '#4338ca',        bg: '#eef2ff' },
  alert:       { label: 'Alert',       color: '#991b1b',        bg: '#fee2e2' },
  synthesis:   { label: 'Synthesis',   color: '#065f46',        bg: '#ecfdf5' },
  task:        { label: 'Task',        color: '#6b21a8',        bg: '#faf5ff' },
  link:        { label: 'Link',        color: '#075985',        bg: '#f0f9ff' },
  code_review: { label: 'Code Review', color: 'var(--gray-600)', bg: 'var(--gray-100)' },
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
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: config.color,
        background: config.bg,
      }}
    >
      {label}
    </span>
  )
}
