import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

interface NavProps {
  isLoggedIn?: boolean
  avatarUrl?: string
  displayName?: string
  onLogout?: () => void
}

export default function Nav({ isLoggedIn = false, avatarUrl, displayName, onLogout }: NavProps) {
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()

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
          <Link
            to="/new-post"
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

          {isLoggedIn ? (
            <button
              onClick={onLogout}
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
