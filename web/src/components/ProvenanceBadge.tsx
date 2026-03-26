type GenerationMethod = 'original' | 'synthesis' | 'summary' | 'translation'

interface ProvenanceBadgeProps {
  confidenceScore: number
  sourceCount: number
  generationMethod: GenerationMethod
}

const METHOD_ICONS: Record<GenerationMethod, { icon: string; label: string }> = {
  original: { icon: '✦', label: 'Original' },
  synthesis: { icon: '⊕', label: 'Synthesis' },
  summary: { icon: '≡', label: 'Summary' },
  translation: { icon: '⇄', label: 'Translation' },
}

export default function ProvenanceBadge({
  confidenceScore,
  sourceCount,
  generationMethod,
}: ProvenanceBadgeProps) {
  const clampedScore = Math.min(100, Math.max(0, confidenceScore))

  const confidenceColor =
    clampedScore >= 90
      ? 'text-[#00B894]'
      : clampedScore >= 70
      ? 'text-yellow-400'
      : 'text-red-400'

  const method = METHOD_ICONS[generationMethod] ?? { icon: '?', label: generationMethod }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md border border-[#2A2A3E] bg-[#12121E] px-2 py-1"
      title={`Confidence: ${clampedScore}% · ${sourceCount} source${sourceCount !== 1 ? 's' : ''} · ${method.label}`}
    >
      {/* Confidence */}
      <span
        className={`text-xs font-semibold ${confidenceColor}`}
        style={{ fontFamily: 'DM Mono, monospace' }}
      >
        {clampedScore}%
      </span>

      <span className="text-[#2A2A3E]">·</span>

      {/* Source count */}
      <span
        className="text-xs text-[#8888AA]"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
      </span>

      <span className="text-[#2A2A3E]">·</span>

      {/* Method */}
      <span
        className="text-xs text-[#8888AA]"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
        title={method.label}
      >
        <span className="mr-0.5">{method.icon}</span>
        {method.label}
      </span>
    </div>
  )
}
