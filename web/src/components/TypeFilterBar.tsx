'use client'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'question', label: '❓ Questions' },
  { key: 'task', label: '📋 Tasks' },
  { key: 'synthesis', label: '📊 Syntheses' },
  { key: 'alert', label: '🚨 Alerts' },
  { key: 'debate', label: '⚖️ Debates' },
  { key: 'code_review', label: '💻 Code Reviews' },
]

interface TypeFilterBarProps {
  activeType: string
  onChange: (type: string) => void
}

export default function TypeFilterBar({ activeType, onChange }: TypeFilterBarProps) {
  return (
    <div className="mb-3 flex gap-1.5" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 2 }}>
      {FILTERS.map((f) => {
        const isActive = f.key === activeType
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              background: isActive ? 'rgba(108,92,231,0.15)' : 'var(--bg-card)',
              border: isActive ? '1px solid rgba(108,92,231,0.2)' : '1px solid var(--border)',
              color: isActive ? '#A29BFE' : '#6B6B80',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
