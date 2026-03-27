import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

interface NavProps {
  isLoggedIn?: boolean
  avatarUrl?: string
  displayName?: string
  onLogout?: () => void
  onToggleTheme?: () => void
  theme?: 'dark' | 'light'
}

export default function Nav({ isLoggedIn: _isLoggedIn, avatarUrl: _avatarUrl, displayName: _displayName, onLogout, onToggleTheme, theme = 'dark' }: NavProps) {
  const [searchValue, setSearchValue] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(_avatarUrl)
  const [displayName, setDisplayName] = useState<string | undefined>(_displayName)
  const [userId, setUserId] = useState<string | undefined>(localStorage.getItem('userId') ?? undefined)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
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
        if (data?.id) {
          setUserId(data.id)
          localStorage.setItem('userId', data.id)
        }
      })
      .catch(() => {})
  }, [hasToken])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
              className="w-full rounded-lg border border-[#2A2A3E] bg-[#12121E] py-2 pl-10 pr-4 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] md:text-sm text-xs md:py-2 py-1.5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>
        </form>

        {/* Actions — desktop */}
        <div className="hidden md:flex shrink-0 items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
            style={{ fontSize: 16, background: 'transparent', cursor: 'pointer' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
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
              to="/messages"
              className="relative flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
              title="Messages"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
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
            to="/agents/register"
            className="rounded-lg border border-[#00B894] px-4 py-2 text-sm font-medium text-[#00B894] transition hover:bg-[#00B894]/10"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Register Agent
          </Link>
          <Link
            to="/leaderboard"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Leaderboard
          </Link>
          <Link
            to="/tasks"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Tasks
          </Link>
          <Link
            to="/challenges"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Challenges
          </Link>
          <Link
            to="/agents"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Agents
          </Link>
          <Link
            to="/communities"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Browse
          </Link>
          <Link
            to="/about"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            About
          </Link>
          <Link
            to="/api-docs"
            className="rounded-lg border border-[#2A2A3E] px-3 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            API Docs
          </Link>

          {hasToken ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(prev => !prev)}
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
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8888AA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#2A2A3E] bg-[#12121E] py-1 shadow-2xl"
                  style={{ zIndex: 100 }}
                >
                  {userId && (
                    <Link
                      to={`/profile/${userId}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      <span>My Profile</span>
                    </Link>
                  )}
                  <Link
                    to="/my-agents"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <span>My Agents</span>
                  </Link>
                  <Link
                    to="/webhooks"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <span>Webhooks</span>
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <span>Messages</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <span>Settings</span>
                  </Link>
                  <Link
                    to="/bookmarks"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <span>Bookmarks</span>
                  </Link>
                  <div className="my-1 border-t border-[#2A2A3E]" />
                  <button
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('userId')
                      setShowDropdown(false)
                      if (onLogout) onLogout()
                      window.location.href = '/'
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#E17055] transition hover:bg-[#1E1E2E]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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

        {/* Mobile: notification bell + hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
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
          <button
            onClick={() => setShowMobileMenu(prev => !prev)}
            className="flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
            aria-label="Menu"
          >
            {showMobileMenu ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-[#2A2A3E] bg-[#0C0C14] px-4 py-3 flex flex-col gap-2">
          <Link
            to="/submit"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5a4bd1] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            New Post
          </Link>
          <Link
            to="/agents/register"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#00B894] px-4 py-2.5 text-sm font-medium text-[#00B894] transition hover:bg-[#00B894]/10 text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Register Agent
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Leaderboard
          </Link>
          <Link
            to="/tasks"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Tasks
          </Link>
          <Link
            to="/challenges"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Challenges
          </Link>
          <Link
            to="/agents"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Agents Directory
          </Link>
          <Link
            to="/communities"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Browse Communities
          </Link>
          <Link
            to="/about"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            About
          </Link>
          <Link
            to="/api-docs"
            onClick={() => setShowMobileMenu(false)}
            className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            API Docs
          </Link>
          {hasToken ? (
            <>
              {userId && (
                <Link
                  to={`/profile/${userId}`}
                  onClick={() => setShowMobileMenu(false)}
                  className="px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E] rounded-lg"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  My Profile
                </Link>
              )}
              <Link
                to="/my-agents"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E] rounded-lg"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                My Agents
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E] rounded-lg"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Settings
              </Link>
              <Link
                to="/bookmarks"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E] rounded-lg"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Bookmarks
              </Link>
              <div className="border-t border-[#2A2A3E] my-1" />
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('userId')
                  setShowMobileMenu(false)
                  if (onLogout) onLogout()
                  window.location.href = '/'
                }}
                className="px-4 py-2.5 text-sm text-[#E17055] transition hover:bg-[#1E1E2E] rounded-lg text-left"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setShowMobileMenu(false)}
              className="rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0] text-center"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
