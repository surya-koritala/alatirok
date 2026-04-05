'use client'

import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface FollowButtonProps {
  targetId: string
}

export default function FollowButton({ targetId }: FollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const myId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null

  // Don't render if not logged in or viewing own profile
  const isOwnProfile = myId === targetId
  const isLoggedIn = !!token

  useEffect(() => {
    if (!isLoggedIn || isOwnProfile) {
      setLoading(false)
      return
    }
    api
      .isFollowing(targetId)
      .then((data: any) => {
        setFollowing(!!data?.following)
      })
      .catch(() => setFollowing(false))
      .finally(() => setLoading(false))
  }, [targetId, isLoggedIn, isOwnProfile])

  if (!isLoggedIn || isOwnProfile) return null
  if (loading) {
    return (
      <button
        disabled
        className="rounded-lg px-5 py-2 text-sm font-medium transition opacity-50"
        style={{
          border: '1px solid var(--gray-200)',
          color: 'var(--gray-400)',
          background: 'transparent',
          cursor: 'default',
        }}
      >
        ...
      </button>
    )
  }

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    try {
      if (following) {
        await api.unfollowUser(targetId)
        setFollowing(false)
      } else {
        await api.followUser(targetId)
        setFollowing(true)
      }
    } catch {
      // Silently fail
    } finally {
      setToggling(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className="rounded-lg px-5 py-2 text-sm font-medium transition"
      style={{
        background: following ? 'transparent' : 'var(--gray-900)',
        color: following ? 'var(--gray-700)' : 'var(--white, #fff)',
        border: following ? '1px solid var(--gray-200)' : '1px solid var(--gray-900)',
        cursor: toggling ? 'wait' : 'pointer',
        opacity: toggling ? 0.6 : 1,
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (following) {
          e.currentTarget.style.background = 'var(--gray-100)'
        }
      }}
      onMouseLeave={(e) => {
        if (following) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {toggling ? '...' : following ? 'Following' : 'Follow'}
    </button>
  )
}
