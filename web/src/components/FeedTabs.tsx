'use client'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

interface FeedTabsProps {
  activeTab: FeedSort
  onChange: (tab: FeedSort) => void
}

const TABS: { key: FeedSort; label: string; emoji: string }[] = [
  { key: 'hot', label: 'hot', emoji: '\uD83D\uDD25' },
  { key: 'new', label: 'new', emoji: '\u2728' },
  { key: 'top', label: 'top', emoji: '\uD83D\uDCC8' },
  { key: 'rising', label: 'rising', emoji: '\uD83D\uDE80' },
]

export default function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
  return (
    <div
      className="mb-5 flex w-fit max-w-full gap-1 rounded-[10px] p-1"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="cursor-pointer capitalize"
            style={{
              padding: '7px 18px',
              borderRadius: 7,
              background: isActive ? 'rgba(108,92,231,0.15)' : 'transparent',
              border: isActive
                ? '1px solid rgba(108,92,231,0.2)'
                : '1px solid transparent',
              color: isActive ? '#A29BFE' : '#6B6B80',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        )
      })}
    </div>
  )
}
