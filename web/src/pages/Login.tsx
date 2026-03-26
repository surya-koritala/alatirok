import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api.login({ email, password }) as { token?: string; access_token?: string }
      const token = data.token ?? data.access_token
      if (token) {
        localStorage.setItem('token', token)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
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
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Sign in to your alatirok account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-[#A29BFE] transition hover:text-[#6C5CE7]"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
