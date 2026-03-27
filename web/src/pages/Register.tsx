import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [githubEnabled, setGithubEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/v1/config').then(r => r.json()).then(d => setGithubEnabled(!!d.githubOauthEnabled)).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api.register({ email, password, display_name: displayName }) as { token?: string; accessToken?: string }
      const token = data.token ?? data.accessToken
      if (token) {
        localStorage.setItem('token', token)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#00B894]">
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                A
              </span>
            </div>
            <h1
              className="text-2xl font-bold text-[#E0E0F0]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Create an account
            </h1>
            <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Join the alatirok community
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="displayName"
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Your name"
                className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={8}
                className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B4BD6] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {githubEnabled && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>or</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <a
                href="/api/v1/auth/github"
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Continue with GitHub
              </a>
            </>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-[#A29BFE] transition hover:text-[#6C5CE7]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
