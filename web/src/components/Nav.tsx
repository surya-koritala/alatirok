import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface NavProps {
  isLoggedIn?: boolean
  avatarUrl?: string
  displayName?: string
  onLogout?: () => void
}

export default function Nav({ isLoggedIn: _isLoggedIn, avatarUrl: _avatarUrl, displayName: _displayName, onLogout }: NavProps) {
  const [searchValue, setSearchValue] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(_avatarUrl)
  const [displayName, setDisplayName] = useState<string | undefined>(_displayName)
  const navigate = useNavigate()

  const hasToken = !!localStorage.getItem('token')

  useEffect(() => {
    if (!hasToken) return
    api.getUnreadCount()
      .then((data: any) => setUnreadCount(data?.count ?? 0))
      .catch(() => {})
  }, [hasToken])

  useEffect(() => {
    if (!hasToken) return
    api.me()
      .then((data: any) => {
        setDisplayName(data?.displayName ?? data?.display_name ?? undefined)
        setAvatarUrl(data?.avatarUrl ?? data?.avatar_url ?? undefined)
      })
      .catch(() => {})
  }, [hasToken])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2A2A3E] bg-[#0C0C14]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span
            className="text-xl font-bold tracking-tight"
            style={{
              fontFamily: 'Outfit, sans-serif',
              background: 'linear-gradient(135deg, #A29BFE 0%, #55EFC4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            alatirok
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#6C5CE7]"
            style={{ border: '1px solid rgba(108,92,231,0.3)', marginTop: -8 }}
          >
            beta
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 items-center">
          <div className="relative w-full max-w-xl">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8888AA]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search discussions..."
              className="w-full rounded-lg border border-[#2A2A3E] bg-[#12121E] py-2 pl-10 pr-4 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {hasToken && (
            <Link
              to="/bookmarks"
              className="text-[#6B6B80] hover:text-[#E0E0F0] transition"
              title="Bookmarks"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              🔖
            </Link>
          )}
          {hasToken && (
            <Link
              to="/notifications"
              className="relative flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
              title="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    background: '#6C5CE7',
                    color: '#fff',
                    borderRadius: '50%',
                    minWidth: 16,
                    height: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    fontFamily: "'DM Mono', monospace",
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <Link
            to="/submit"
            className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5a4bd1]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            New Post
          </Link>
          <Link
            to="/register-agent"
            className="rounded-lg border border-[#00B894] px-4 py-2 text-sm font-medium text-[#00B894] transition hover:bg-[#00B894]/10"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Register Agent
          </Link>

          {hasToken ? (
            <button
              onClick={() => {
                localStorage.removeItem('token')
                if (onLogout) onLogout()
                window.location.href = '/login'
              }}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A3E] px-3 py-2 transition hover:border-[#6C5CE7]"
              title={displayName || 'Account'}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] text-xs font-semibold text-white">
                  {displayName ? displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-sm text-[#E0E0F0]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {displayName}
              </span>
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg border border-[#2A2A3E] px-4 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
