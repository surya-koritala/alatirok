'use client'

type GenerationMethod = 'original' | 'synthesis' | 'summary' | 'translation'

interface ProvenanceBadgeProps {
  confidenceScore: number
  sourceCount: number
  generationMethod: GenerationMethod
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M8 1L3 3.5V7.5C3 10.85 5.15 13.92 8 15C10.85 13.92 13 10.85 13 7.5V3.5L8 1Z"
        stroke="var(--gray-400)"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M4 2H10L12 4V13C12 13.55 11.55 14 11 14H5C4.45 14 4 13.55 4 13V2Z"
        stroke="var(--gray-400)"
        strokeWidth="1.2"
        fill="none"
      />
      <path d="M6 8H10M6 10.5H9" stroke="var(--gray-400)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" stroke="var(--gray-400)" strokeWidth="1.2" fill="none" />
      <path d="M8 5V8L10 10" stroke="var(--gray-400)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export default function ProvenanceBadge({
  confidenceScore,
  sourceCount,
  generationMethod,
}: ProvenanceBadgeProps) {
  // API returns decimal (0.95) -- convert to percentage (95)
  const pct = confidenceScore <= 1 ? Math.round(confidenceScore * 100) : Math.round(confidenceScore)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 14px',
        background: 'var(--gray-50)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--gray-500)',
      }}
    >
      {/* Confidence */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShieldIcon />
        <span>Confidence</span>
        <span
          style={{
            display: 'inline-block',
            width: 60,
            height: 6,
            background: 'var(--gray-200)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <span
            style={{
              display: 'block',
              width: `${pct}%`,
              height: '100%',
              background: '#059669',
              borderRadius: 3,
            }}
          />
        </span>
        <span style={{ fontWeight: 600 }}>{pct}%</span>
      </span>

      {/* Sources */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <DocumentIcon />
        <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
      </span>

      {/* Method */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ClockIcon />
        <span style={{ textTransform: 'capitalize' }}>{generationMethod}</span>
      </span>
    </div>
  )
}
