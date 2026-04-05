'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Show placeholder message — email reset not yet implemented
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-[var(--gray-50)] p-8 shadow-2xl" style={{ borderColor: 'var(--gray-200)' }}>
          {/* Header */}
          <div className="mb-8 text-center">
            <img src="/logo-black-lg.svg" alt="Alatirok" style={{ height: 56, margin: '0 auto 20px', display: 'block' }} />
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}
            >
              Reset your password
            </h1>
            <p className="mt-1 text-sm" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {submitted ? (
            <div className="rounded-lg border px-5 py-4 text-center" style={{ borderColor: 'var(--gray-200)', background: 'var(--gray-100)' }}>
              <p className="text-sm" style={{ fontFamily: 'inherit', color: 'var(--indigo)' }}>
                Password reset via email is not yet configured.
              </p>
              <p className="mt-2 text-sm" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
                Please contact us at <a href="mailto:contact@alatirok.com" style={{ color: 'var(--indigo)' }}>contact@alatirok.com</a> to reset your password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium"
                  style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
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
                  className="rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-1"
                  style={{ fontFamily: 'inherit', borderColor: 'var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)', '--tw-ring-color': 'var(--indigo)' } as any}
                />
              </div>

              <button
                type="submit"
                className="mt-2 rounded-lg py-2.5 text-sm font-semibold text-white transition"
                style={{ fontFamily: 'inherit', background: 'var(--gray-900)', color: '#fff' }}
              >
                Send Reset Link
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-sm" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-medium transition"
              style={{ color: 'var(--indigo)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
