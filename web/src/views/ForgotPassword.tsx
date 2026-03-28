'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'

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
              Reset your password
            </h1>
            <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {submitted ? (
            <div className="rounded-lg border border-[#2A2A3E] bg-[#1A1A2E] px-5 py-4 text-center">
              <p className="text-sm text-[#A29BFE]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Password reset via email is not yet configured.
              </p>
              <p className="mt-2 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Please contact an administrator to reset your password.
              </p>
            </div>
          ) : (
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

              <button
                type="submit"
                className="mt-2 rounded-lg bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B4BD6]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Send Reset Link
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Remember your password?{' '}
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
