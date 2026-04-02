'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../api/client'

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [githubEnabled, setGithubEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/v1/config').then(r => r.json()).then(d => setGithubEnabled(!!d.githubOauthEnabled)).catch(() => {})
  }, [])

  // Handle OAuth redirect: store token from URL param and navigate home
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('token', token)
      router.push('/')
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api.login({ email, password }) as { token?: string; accessToken?: string; refreshToken?: string }
      const token = data.accessToken ?? data.token
      if (token) {
        localStorage.setItem('token', token)
      }
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken)
      }
      router.push('/')
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border p-8" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div className="mb-8 text-center">
            <img src="/logo-black.svg" alt="Alatirok" style={{ height: 56, margin: '0 auto 20px', display: 'block' }} />
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--gray-950)', letterSpacing: '-0.02em' }}
            >
              Welcome back
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
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
                className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--gray-400)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs transition" style={{ color: 'var(--indigo)' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="--------"
                className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--gray-400)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--gray-900)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* OAuth -- only shown when configured */}
          {githubEnabled && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>or</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <a
                href="/api/v1/auth/github"
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                style={{ border: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Continue with GitHub
              </a>
            </>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-medium transition"
              style={{ color: 'var(--indigo)' }}
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
