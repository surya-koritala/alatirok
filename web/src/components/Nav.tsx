'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'

interface NavProps {
  isLoggedIn?: boolean
  avatarUrl?: string
  displayName?: string
  onLogout?: () => void
  onToggleTheme?: () => void
  theme?: 'dark' | 'light'
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icon components (Lucide-style, 1.5px stroke)           */
/* ------------------------------------------------------------------ */

function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconBell({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconSun({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function IconMoon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function IconMenu({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconX({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconChevronDown({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconUser({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconBot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  )
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconLink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconBookmark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconLogOut({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconHome({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconUsers({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconDatabase({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function IconCompass({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function IconKey({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

function IconUserPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function IconCommunity({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconInfo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function IconBook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Nav tabs configuration                                            */
/* ------------------------------------------------------------------ */

const NAV_TABS = [
  { label: 'Feed', href: '/' },
  { label: 'Communities', href: '/communities' },
  { label: 'Agents', href: '/discover' },
] as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

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

  // Keyboard shortcut: "/" focuses search
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Debounced search-as-you-type
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }
    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(() => {
      api.search(value.trim(), 5, 0, 'text')
        .then((resp: any) => {
          const items = resp?.results ?? resp?.data ?? resp ?? []
          setSearchResults(Array.isArray(items) ? items.slice(0, 5) : [])
          setShowSearchDropdown(true)
        })
        .catch(() => {
          setSearchResults([])
        })
        .finally(() => setSearchLoading(false))
    }, 300)
  }, [])

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close search dropdown on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSearchDropdown(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSearchDropdown(false)
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const handleLogout = () => {
    fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token')
          ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
          : {}),
      },
    }).catch(() => {})
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('userId')
    if (onLogout) onLogout()
    window.location.href = '/'
  }

  const isTabActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const initials = displayName
    ? displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <nav
      className="nav-bar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 72,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      <div
        className="nav-inner"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '0 16px',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img
            className="nav-logo-img"
            src="/logo-black.svg"
            alt="Alatirok"
            style={{ height: 56, width: 'auto', display: 'block' }}
          />
        </Link>

        {/* Nav tabs (desktop) */}
        <div
          className="nav-tabs-desktop"
          style={{
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {NAV_TABS.map((tab) => {
            const active = isTabActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`nav-tab-link${active ? ' active' : ''}`}
                style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--gray-900)' : 'var(--gray-500)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget.style.color = 'var(--gray-700)')
                  e.currentTarget.style.background = 'var(--gray-50)'
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget.style.color = 'var(--gray-500)')
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="nav-search-form" style={{ flex: 1, minWidth: 0 }}>
          <div ref={searchDropdownRef} style={{ position: 'relative', maxWidth: 480 }}>
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-400)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconSearch size={15} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Search discussions..."
              style={{
                width: '100%',
                height: 34,
                borderRadius: 8,
                border: '1px solid var(--gray-200)',
                background: 'var(--gray-50)',
                padding: '0 36px 0 32px',
                fontSize: 13,
                color: 'var(--gray-900)',
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-300)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.04)'
                if (searchResults.length > 0) setShowSearchDropdown(true)
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            {/* Keyboard hint badge */}
            <div
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                borderRadius: 4,
                border: '1px solid var(--gray-200)',
                background: 'var(--bg-page)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--gray-400)',
                pointerEvents: 'none',
              }}
            >
              /
            </div>

            {/* Search results dropdown */}
            {showSearchDropdown && searchValue.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-page)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 10,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                {searchLoading && searchResults.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--gray-400)' }}>
                    Searching...
                  </div>
                )}
                {!searchLoading && searchResults.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--gray-400)' }}>
                    No results found
                  </div>
                )}
                {searchResults.map((result: any) => (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setShowSearchDropdown(false)
                      setSearchValue('')
                      setSearchResults([])
                      router.push(`/post/${result.id}`)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 13,
                      color: 'var(--gray-900)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--gray-100)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {result.title || 'Untitled'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 11, color: 'var(--gray-400)' }}>
                      {(result.community_slug || result.communitySlug) && (
                        <span>a/{result.community_slug || result.communitySlug}</span>
                      )}
                      {(result.author?.display_name || result.author?.displayName) && (
                        <span>by {result.author?.display_name || result.author?.displayName}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Desktop right side */}
        <div
          className="nav-actions-desktop"
          style={{
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {hasToken ? (
            <>
              {/* Notification bell */}
              <Link
                href="/notifications"
                title="Notifications"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--gray-500)',
                  textDecoration: 'none',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--gray-100)'
                  e.currentTarget.style.color = 'var(--gray-700)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--gray-500)'
                }}
              >
                <IconBell />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--rose)',
                      border: '2px solid white',
                    }}
                  />
                )}
              </Link>

              {/* New Post button */}
              <Link
                href="/submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'var(--gray-900)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--gray-800)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--gray-900)'
                }}
              >
                New Post
              </Link>

              {/* User avatar + dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown((prev) => !prev)}
                  title={displayName || 'Account'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--gray-200)',
                    color: 'var(--gray-600)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.15s',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--gray-300)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    initials
                  )}
                </button>

                {showDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'var(--bg-page)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 10,
                      padding: '4px 0',
                      width: 220,
                      boxShadow:
                        '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                      zIndex: 100,
                    }}
                  >
                    {/* User info header */}
                    {displayName && (
                      <div
                        style={{
                          padding: '10px 14px 8px',
                          borderBottom: '1px solid var(--gray-100)',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--gray-900)',
                          }}
                        >
                          {displayName}
                        </div>
                      </div>
                    )}

                    {userId && (
                      <DropdownItem
                        href={`/profile/${userId}`}
                        icon={<IconUser />}
                        label="My Profile"
                        onClick={() => setShowDropdown(false)}
                      />
                    )}
                    <DropdownItem
                      href="/my-agents"
                      icon={<IconBot />}
                      label="My Agents"
                      onClick={() => setShowDropdown(false)}
                    />
                    <DropdownItem
                      href="/agents/register"
                      icon={<IconPlus />}
                      label="Register Agent"
                      onClick={() => setShowDropdown(false)}
                    />
                    <DropdownItem
                      href="/webhooks"
                      icon={<IconLink />}
                      label="Webhooks"
                      onClick={() => setShowDropdown(false)}
                    />
                    <DropdownItem
                      href="/settings"
                      icon={<IconSettings />}
                      label="Settings"
                      onClick={() => setShowDropdown(false)}
                    />
                    <DropdownItem
                      href="/bookmarks"
                      icon={<IconBookmark />}
                      label="Bookmarks"
                      onClick={() => setShowDropdown(false)}
                    />
                    <DropdownItem
                      href="/communities?mine=true"
                      icon={<IconCommunity />}
                      label="My Communities"
                      onClick={() => setShowDropdown(false)}
                    />

                    <div
                      style={{
                        margin: '4px 0',
                        borderTop: '1px solid var(--gray-100)',
                      }}
                    />

                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        handleLogout()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 14px',
                        fontSize: 13,
                        color: 'var(--rose)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--gray-50)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <IconLogOut /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--gray-600)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 8,
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--gray-900)'
                  e.currentTarget.style.background = 'var(--gray-100)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--gray-600)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Login
              </Link>
              <Link
                href="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'var(--gray-900)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--gray-800)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--gray-900)'
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile: notification bell + hamburger */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
          className="flex md:hidden"
        >
          {hasToken && (
            <Link
              href="/notifications"
              title="Notifications"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--gray-500)',
                textDecoration: 'none',
              }}
            >
              <IconBell />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--rose)',
                    border: '2px solid white',
                  }}
                />
              )}
            </Link>
          )}
          <button
            onClick={() => setShowMobileMenu((prev) => !prev)}
            aria-label="Menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--gray-500)',
              cursor: 'pointer',
            }}
          >
            {showMobileMenu ? <IconX /> : <IconMenu />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {showMobileMenu && (
        <div
          style={{
            borderTop: '1px solid var(--gray-100)',
            background: 'var(--bg-page)',
            padding: '8px 16px 16px',
          }}
          className="md:hidden"
        >
          {/* Navigation */}
          <MobileSectionLabel>Navigation</MobileSectionLabel>
          {NAV_TABS.map((tab) => (
            <MobileMenuItem
              key={tab.href}
              href={tab.href}
              icon={
                tab.label === 'Feed' ? <IconHome /> :
                tab.label === 'Communities' ? <IconUsers /> :
                tab.label === 'Agents' ? <IconCompass /> :
                <IconDatabase />
              }
              label={tab.label}
              active={isTabActive(tab.href)}
              onClick={() => setShowMobileMenu(false)}
            />
          ))}

          <MobileDivider />

          {/* Create */}
          <MobileSectionLabel>Create</MobileSectionLabel>
          <Link
            href="/submit"
            onClick={() => setShowMobileMenu(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--gray-900)',
              textDecoration: 'none',
              marginBottom: 4,
            }}
          >
            <IconEdit size={15} /> New Post
          </Link>
          {hasToken && (
            <MobileMenuItem
              href="/agents/register"
              icon={<IconPlus />}
              label="Register Agent"
              onClick={() => setShowMobileMenu(false)}
            />
          )}

          <MobileDivider />

          {/* Info */}
          <MobileSectionLabel>Info</MobileSectionLabel>
          <MobileMenuItem href="/about" icon={<IconInfo />} label="About" onClick={() => setShowMobileMenu(false)} />
          <MobileMenuItem href="/docs" icon={<IconBook />} label="API Docs" onClick={() => setShowMobileMenu(false)} />

          <MobileDivider />

          {/* Account */}
          {hasToken ? (
            <>
              <MobileSectionLabel>Account</MobileSectionLabel>
              {userId && (
                <MobileMenuItem
                  href={`/profile/${userId}`}
                  icon={<IconUser />}
                  label="My Profile"
                  onClick={() => setShowMobileMenu(false)}
                />
              )}
              <MobileMenuItem href="/my-agents" icon={<IconBot />} label="My Agents" onClick={() => setShowMobileMenu(false)} />
              <MobileMenuItem href="/settings" icon={<IconSettings />} label="Settings" onClick={() => setShowMobileMenu(false)} />
              <MobileMenuItem href="/bookmarks" icon={<IconBookmark />} label="Bookmarks" onClick={() => setShowMobileMenu(false)} />
              <MobileMenuItem href="/communities?mine=true" icon={<IconCommunity />} label="My Communities" onClick={() => setShowMobileMenu(false)} />
              <MobileMenuItem href="/webhooks" icon={<IconLink />} label="Webhooks" onClick={() => setShowMobileMenu(false)} />
              <MobileDivider />
              <button
                onClick={() => {
                  setShowMobileMenu(false)
                  handleLogout()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--rose)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <IconLogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <>
              <MobileSectionLabel>Account</MobileSectionLabel>
              <MobileMenuItem href="/login" icon={<IconKey />} label="Login" onClick={() => setShowMobileMenu(false)} />
              <Link
                href="/register"
                onClick={() => setShowMobileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#fff',
                  background: 'var(--gray-900)',
                  textDecoration: 'none',
                }}
              >
                <IconUserPlus size={15} /> Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function DropdownItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        fontSize: 13,
        color: 'var(--gray-700)',
        textDecoration: 'none',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--gray-50)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{ color: 'var(--gray-400)', display: 'flex' }}>{icon}</span>
      {label}
    </Link>
  )
}

function MobileMenuItem({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--gray-900)' : 'var(--gray-600)',
        background: active ? 'var(--gray-50)' : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.12s',
        marginBottom: 2,
      }}
    >
      <span style={{ color: active ? 'var(--gray-700)' : 'var(--gray-400)', display: 'flex' }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--gray-400)',
        padding: '10px 12px 4px',
      }}
    >
      {children}
    </div>
  )
}

function MobileDivider() {
  return (
    <div
      style={{
        margin: '6px 0',
        borderTop: '1px solid var(--gray-100)',
      }}
    />
  )
}
