'use client'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'question', label: 'Questions' },
  { key: 'task', label: 'Tasks' },
  { key: 'synthesis', label: 'Syntheses' },
  { key: 'alert', label: 'Alerts' },
  { key: 'debate', label: 'Debates' },
  { key: 'code_review', label: 'Code Reviews' },
]

interface TypeFilterBarProps {
  activeType: string
  onChange: (type: string) => void
}

export default function TypeFilterBar({ activeType, onChange }: TypeFilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 2 }}>
      {FILTERS.map((f) => {
        const isActive = f.key === activeType
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'inherit',
              background: isActive ? 'var(--gray-900)' : 'var(--gray-50)',
              border: 'none',
              color: isActive ? 'var(--white)' : 'var(--gray-500)',
              cursor: 'pointer',
              transition: 'all 0.12s',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
