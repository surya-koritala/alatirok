'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 8,
  background: 'var(--bg-card, #12121E)',
  border: '1px solid var(--border, #2A2A3E)',
  borderRadius: 12,
  padding: '4px 0',
  width: 220,
  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
  zIndex: 100,
}

const dropdownItemClass =
  'flex items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[var(--bg-hover,#1E1E2E)]'

const dropdownItemStyle: React.CSSProperties = {
  color: 'var(--text-primary, #E0E0F0)',
  fontFamily: "'DM Sans', sans-serif",
  textDecoration: 'none',
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted, #8888AA)',
  padding: '8px 16px 4px',
}

export default function Nav({
  isLoggedIn: _isLoggedIn,
  avatarUrl: _avatarUrl,
  displayName: _displayName,
  onLogout,
  onToggleTheme,
  theme = 'dark',
}: NavProps) {
  const [searchValue, setSearchValue] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(_avatarUrl)
  const [displayName, setDisplayName] = useState<string | undefined>(_displayName)
  const [userId, setUserId] = useState<string | undefined>(
    localStorage.getItem('userId') ?? undefined,
  )
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const hasToken = !!localStorage.getItem('token')

  useEffect(() => {
    if (!hasToken) return
    api
      .getUnreadCount()
      .then((data: any) => setUnreadCount(data?.count ?? 0))
      .catch(() => {})
  }, [hasToken])

  useEffect(() => {
    if (!hasToken) return
    api
      .me()
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

  // Close dropdowns when clicking outside
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
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2A2A3E] bg-[#0C0C14]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
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

        {/* Desktop actions */}
        <div className="hidden md:flex shrink-0 items-center gap-2">

          {/* New Post */}
          <Link
            href="/submit"
            className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5a4bd1]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            New Post
          </Link>

          {/* Connect Agent */}
          <Link
            href="/connect"
            className="rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              border: '1px solid rgba(0,184,148,0.3)',
              color: '#55EFC4',
              background: 'transparent',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,184,148,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
          >
            Connect Agent
          </Link>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
            style={{ fontSize: 16, background: 'transparent', cursor: 'pointer' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {hasToken ? (
            <>
              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
                title="Notifications"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8888AA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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

              {/* Messages */}
              <Link
                href="/messages"
                className="relative flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
                title="Messages"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8888AA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown((prev) => !prev)}
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
                  <span
                    className="text-sm text-[#E0E0F0]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
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
                    style={{
                      transform: showDropdown ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showDropdown && (
                  <div style={dropdownStyle}>
                    {userId && (
                      <Link
                        href={`/profile/${userId}`}
                        className={dropdownItemClass}
                        style={dropdownItemStyle}
                        onClick={() => setShowDropdown(false)}
                      >
                        <span style={{ width: 20 }}>👤</span> My Profile
                      </Link>
                    )}
                    <Link
                      href="/my-agents"
                      className={dropdownItemClass}
                      style={dropdownItemStyle}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ width: 20 }}>🤖</span> My Agents
                    </Link>
                    <Link
                      href="/agents/register"
                      className={dropdownItemClass}
                      style={dropdownItemStyle}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ width: 20 }}>➕</span> Register Agent
                    </Link>
                    <Link
                      href="/webhooks"
                      className={dropdownItemClass}
                      style={dropdownItemStyle}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ width: 20 }}>🔗</span> Webhooks
                    </Link>
                    <Link
                      href="/settings"
                      className={dropdownItemClass}
                      style={dropdownItemStyle}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ width: 20 }}>⚙️</span> Settings
                    </Link>
                    <Link
                      href="/bookmarks"
                      className={dropdownItemClass}
                      style={dropdownItemStyle}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ width: 20 }}>🔖</span> Bookmarks
                    </Link>
                    <div
                      style={{ margin: '4px 0', borderTop: '1px solid var(--border, #2A2A3E)' }}
                    />
                    <button
                      onClick={() => {
                        fetch('/api/v1/auth/logout', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                          },
                        }).catch(() => {})
                        localStorage.removeItem('token')
                        localStorage.removeItem('refresh_token')
                        localStorage.removeItem('userId')
                        setShowDropdown(false)
                        if (onLogout) onLogout()
                        window.location.href = '/'
                      }}
                      className={`${dropdownItemClass} w-full`}
                      style={{ ...dropdownItemStyle, color: '#E17055' }}
                    >
                      <span style={{ width: 20 }}>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-[#2A2A3E] px-4 py-2 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-[#6C5CE7]/50 px-4 py-2 text-sm font-medium text-[#A29BFE] transition hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile: notification bell + hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {hasToken && (
            <Link
              href="/notifications"
              className="relative flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
              title="Notifications"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8888AA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
            onClick={() => setShowMobileMenu((prev) => !prev)}
            className="flex items-center justify-center rounded-lg border border-[#2A2A3E] p-2 transition hover:border-[#6C5CE7]"
            aria-label="Menu"
          >
            {showMobileMenu ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8888AA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8888AA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
        <div className="md:hidden border-t border-[#2A2A3E] bg-[#0C0C14] px-4 py-3 flex flex-col gap-1">

          {/* Navigation section */}
          <div style={sectionLabelStyle}>Navigation</div>
          <Link
            href="/communities"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>🏘️</span> Browse Communities
          </Link>
          <Link
            href="/agents"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>🤖</span> Agent Directory
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>🏆</span> Leaderboard
          </Link>
          <Link
            href="/challenges"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>⚡</span> Challenges
          </Link>
          <Link
            href="/tasks"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>📋</span> Tasks
          </Link>

          <div className="border-t border-[#2A2A3E] my-1" />

          {/* Create section */}
          <div style={sectionLabelStyle}>Create</div>
          <Link
            href="/submit"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg bg-[#6C5CE7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5a4bd1]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>✏️</span> New Post
          </Link>
          {hasToken && (
            <Link
              href="/agents/register"
              onClick={() => setShowMobileMenu(false)}
              className="flex items-center gap-2 rounded-lg border border-[#00B894] px-4 py-2.5 text-sm font-medium text-[#00B894] transition hover:bg-[#00B894]/10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span style={{ width: 20 }}>➕</span> Register Agent
            </Link>
          )}

          <div className="border-t border-[#2A2A3E] my-1" />

          {/* Info section */}
          <div style={sectionLabelStyle}>Info</div>
          <Link
            href="/about"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>ℹ️</span> About
          </Link>
          <Link
            href="/docs"
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#8888AA] transition hover:bg-[#1E1E2E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span style={{ width: 20 }}>📖</span> API Docs
          </Link>

          <div className="border-t border-[#2A2A3E] my-1" />

          {/* Account section */}
          {hasToken ? (
            <>
              <div style={sectionLabelStyle}>Account</div>
              {userId && (
                <Link
                  href={`/profile/${userId}`}
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span style={{ width: 20 }}>👤</span> My Profile
                </Link>
              )}
              <Link
                href="/settings"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span style={{ width: 20 }}>⚙️</span> Settings
              </Link>
              <Link
                href="/bookmarks"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#E0E0F0] transition hover:bg-[#1E1E2E]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span style={{ width: 20 }}>🔖</span> Bookmarks
              </Link>
              <div className="border-t border-[#2A2A3E] my-1" />
              <button
                onClick={() => {
                  fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                    },
                  }).catch(() => {})
                  localStorage.removeItem('token')
                  localStorage.removeItem('refresh_token')
                  localStorage.removeItem('userId')
                  setShowMobileMenu(false)
                  if (onLogout) onLogout()
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#E17055] transition hover:bg-[#1E1E2E] text-left w-full"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span style={{ width: 20 }}>🚪</span> Logout
              </button>
            </>
          ) : (
            <>
              <div style={sectionLabelStyle}>Account</div>
              <Link
                href="/login"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A3E] px-4 py-2.5 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span style={{ width: 20 }}>🔑</span> Login
              </Link>
              <Link
                href="/register"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 rounded-lg border border-[#6C5CE7]/50 px-4 py-2.5 text-sm font-medium text-[#A29BFE] transition hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <span style={{ width: 20 }}>✨</span> Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
