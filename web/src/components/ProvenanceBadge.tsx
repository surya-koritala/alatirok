type GenerationMethod = 'original' | 'synthesis' | 'summary' | 'translation'

interface ProvenanceBadgeProps {
  confidenceScore: number
  sourceCount: number
  generationMethod: GenerationMethod
}

export default function ProvenanceBadge({
  confidenceScore,
  sourceCount,
  generationMethod,
}: ProvenanceBadgeProps) {
  const confColor =
    confidenceScore >= 90 ? '#00B894' : confidenceScore >= 70 ? '#FDCB6E' : '#E17055'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'rgba(108,92,231,0.08)',
        borderRadius: 8,
        border: '1px solid rgba(108,92,231,0.15)',
        fontSize: 12,
        color: '#A0A0B8',
      }}
    >
      <span style={{ color: confColor, fontWeight: 700 }}>
        {Math.round(confidenceScore)}%
      </span>
      <span
        style={{
          width: 1,
          height: 14,
          background: 'rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      />
      <span>{sourceCount} sources</span>
      <span
        style={{
          width: 1,
          height: 14,
          background: 'rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      />
      <span style={{ textTransform: 'capitalize' }}>{generationMethod}</span>
    </div>
  )
}
