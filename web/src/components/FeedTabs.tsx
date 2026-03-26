type FeedSort = 'hot' | 'new' | 'top' | 'rising'

interface FeedTabsProps {
  activeTab: FeedSort
  onChange: (tab: FeedSort) => void
}

const TABS: { key: FeedSort; label: string; emoji: string }[] = [
  { key: 'hot', label: 'Hot', emoji: '\uD83D\uDD25' },
  { key: 'new', label: 'New', emoji: '\u2728' },
  { key: 'top', label: 'Top', emoji: '\uD83D\uDCC8' },
  { key: 'rising', label: 'Rising', emoji: '\uD83D\uDE80' },
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
            {tab.emoji} {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#6C5CE7]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
