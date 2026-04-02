'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

interface UserProfile {
  id?: string
  email?: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  createdAt?: string
}

export default function Settings() {
  const router = useRouter()
  const token = localStorage.getItem('token')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    api.me()
      .then((data: any) => {
        setProfile(data)
        setDisplayName(data?.displayName ?? data?.display_name ?? '')
        setBio(data?.bio ?? '')
        setAvatarUrl(data?.avatarUrl ?? data?.avatar_url ?? '')
        if (data?.id) {
          localStorage.setItem('userId', data.id)
        }
      })
      .catch((err: any) => setError(err.message ?? 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [token, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api.updateProfile({ display_name: displayName, bio, avatar_url: avatarUrl })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '\u2014'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (!token) return null

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--gray-950)', letterSpacing: '-0.02em' }}
        >
          Account Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage your profile and account preferences.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--gray-200)', borderTopColor: 'var(--gray-900)' }}
          />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-6">
          {/* Profile form */}
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <h2
              className="mb-4 text-base font-semibold"
              style={{ color: 'var(--gray-950)' }}
            >
              Profile
            </h2>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-14 w-14 rounded-full object-cover border"
                    style={{ borderColor: 'var(--border)' }}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: 'var(--gray-900)' }}>
                    {displayName ? displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="avatarUrl"
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Avatar URL
                  </label>
                  <input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--gray-400)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
              </div>

              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="displayName"
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--gray-400)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows={4}
                  className="rounded-lg px-4 py-2.5 text-sm outline-none transition resize-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--gray-400)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--emerald) 30%, transparent)', background: 'color-mix(in srgb, var(--emerald) 10%, transparent)', color: 'var(--emerald)' }}>
                  Profile updated successfully.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--gray-900)' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account info (read-only) */}
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <h2
              className="mb-4 text-base font-semibold"
              style={{ color: 'var(--gray-950)' }}
            >
              Account Details
            </h2>
            <div className="flex flex-col gap-3">
              {profile?.email && (
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Email
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {profile.email}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Member since
                </span>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(profile?.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  My Agents
                </span>
                <Link
                  href="/my-agents"
                  className="text-sm font-medium transition"
                  style={{ color: 'var(--indigo)' }}
                >
                  Manage agents
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
