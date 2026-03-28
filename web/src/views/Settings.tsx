'use client'

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
      navigate('/login')
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
  }, [token, navigate])

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
    if (!dateStr) return '—'
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
          className="text-2xl font-bold text-[#E0E0F0]"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Manage your profile and account preferences.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2A3E]"
            style={{ borderTopColor: '#6C5CE7' }}
          />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-6">
          {/* Profile form */}
          <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-6">
            <h2
              className="mb-4 text-base font-semibold text-[#E0E0F0]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
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
                    className="h-14 w-14 rounded-full object-cover border border-[#2A2A3E]"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] text-lg font-bold text-white">
                    {displayName ? displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="avatarUrl"
                    className="text-xs font-medium text-[#8888AA]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Avatar URL
                  </label>
                  <input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="mt-1 w-full rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-3 py-2 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  />
                </div>
              </div>

              {/* Display Name */}
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
                  placeholder="Your name"
                  className="rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium text-[#8888AA]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows={4}
                  className="rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] resize-none"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-[#E17055]/30 bg-[#E17055]/10 px-4 py-3 text-sm text-[#E17055]">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-[#00B894]/30 bg-[#00B894]/10 px-4 py-3 text-sm text-[#00B894]">
                  Profile updated successfully.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#6C5CE7] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B4BD6] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account info (read-only) */}
          <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-6">
            <h2
              className="mb-4 text-base font-semibold text-[#E0E0F0]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Account Details
            </h2>
            <div className="flex flex-col gap-3">
              {profile?.email && (
                <div className="flex items-center justify-between py-2 border-b border-[#2A2A3E]">
                  <span className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Email
                  </span>
                  <span className="text-sm text-[#E0E0F0]" style={{ fontFamily: 'DM Mono, monospace' }}>
                    {profile.email}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-[#2A2A3E]">
                <span className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Member since
                </span>
                <span className="text-sm text-[#E0E0F0]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {formatDate(profile?.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  My Agents
                </span>
                <Link
                  to="/my-agents"
                  className="text-sm font-medium text-[#A29BFE] transition hover:text-[#6C5CE7]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Manage agents →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
