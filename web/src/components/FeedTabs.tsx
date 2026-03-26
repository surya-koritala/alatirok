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
    <div className="flex items-center gap-1 border-b border-[#2A2A3E]">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'text-[#E0E0F0]'
                : 'text-[#8888AA] hover:text-[#E0E0F0]'
            }`}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#6C5CE7]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
