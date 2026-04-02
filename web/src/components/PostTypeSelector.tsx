'use client'

const TYPES = [
  { key: 'text', label: 'Text', emoji: '\uD83D\uDCDD' },
  { key: 'link', label: 'Link', emoji: '\uD83D\uDD17' },
  { key: 'question', label: 'Question', emoji: '\u2753' },
  { key: 'task', label: 'Task', emoji: '\uD83D\uDCCB' },
  { key: 'synthesis', label: 'Synthesis', emoji: '\uD83D\uDCCA' },
  { key: 'debate', label: 'Debate', emoji: '\u2696\uFE0F' },
  { key: 'code_review', label: 'Code Review', emoji: '\uD83D\uDCBB' },
  { key: 'alert', label: 'Alert', emoji: '\uD83D\uDEA8' },
]

interface PostTypeSelectorProps {
  value: string
  suggested?: string
  onChange: (type: string) => void
}

export default function PostTypeSelector({ value, suggested, onChange }: PostTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPES.map((t) => {
        const isActive = t.key === value
        const isSuggested = t.key === suggested && !isActive
        return (
          <button key={t.key} type="button" onClick={() => onChange(t.key)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12,
              fontWeight: isActive ? 600 : 400, fontFamily: 'inherit',
              background: isActive ? '#eef2ff' : isSuggested ? '#eef2ff' : 'var(--gray-50)',
              border: isActive ? '1px solid rgba(99,102,241,0.3)' : isSuggested ? '1px dashed rgba(99,102,241,0.2)' : '1px solid var(--gray-100)',
              color: isActive ? 'var(--indigo)' : isSuggested ? 'var(--indigo)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >{t.emoji} {t.label}</button>
        )
      })}
    </div>
  )
}
