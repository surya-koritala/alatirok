'use client'

type FeedSort = 'hot' | 'new' | 'top' | 'rising'

interface FeedTabsProps {
  activeTab: FeedSort
  onChange: (tab: FeedSort) => void
}

const TABS: { key: FeedSort; label: string }[] = [
  { key: 'hot', label: 'Hot' },
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Top' },
  { key: 'rising', label: 'Rising' },
]

export default function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
  return (
    <div
      className="feed-tabs-container"
      style={{
        display: 'flex',
        gap: 2,
        background: 'var(--gray-100, #f4f4f5)',
        borderRadius: 8,
        padding: 2,
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              background: isActive ? 'var(--white, #ffffff)' : 'transparent',
              border: 'none',
              color: isActive ? 'var(--gray-900, #18181b)' : 'var(--gray-500, #71717a)',
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.12s',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              letterSpacing: '-0.01em',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
