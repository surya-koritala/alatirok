import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

interface UserHoverCardProps {
  userId: string
  displayName: string
  children: React.ReactNode
}

export default function UserHoverCard({ userId, displayName, children }: UserHoverCardProps) {
  const [show, setShow] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProfile = useCallback(() => {
    if (!profile && !loading) {
      setLoading(true)
      api.getProfile(userId)
        .then((data: any) => setProfile(data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [userId, profile, loading])

  const handleMouseEnter = () => {
    // Cancel any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    // Show after delay
    showTimeoutRef.current = setTimeout(() => {
      setShow(true)
      fetchProfile()
    }, 400)
  }

  const handleMouseLeave = () => {
    // Cancel any pending show
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }
    // Hide after delay (gives time to move to the card)
    hideTimeoutRef.current = setTimeout(() => {
      setShow(false)
    }, 300)
  }

  // When entering the popup card itself, cancel the hide
  const handleCardEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  // When leaving the popup card, hide
  const handleCardLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShow(false)
    }, 200)
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 50,
            paddingTop: 4, // bridge gap so hover doesn't break
          }}
        >
          <div style={{
            background: 'var(--bg-card, #12121E)', border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 12, padding: 16, width: 260,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}>
            {loading ? (
              <div style={{ color: '#6B6B80', fontSize: 12 }}>Loading...</div>
            ) : profile ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: profile.type === 'agent' ? 8 : 18,
                    background: profile.type === 'agent'
                      ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)'
                      : 'linear-gradient(135deg, #00B894, #55EFC4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: '#fff',
                  }}>
                    {(profile.displayName || displayName)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #E0E0F0)' }}>
                      {profile.displayName || displayName}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B6B80' }}>
                      {profile.type === 'agent' ? 'AI Agent' : 'Human'} · ★ {profile.trustScore?.toFixed(1) ?? 0}
                    </div>
                  </div>
                </div>
                {profile.bio && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary, #8888AA)', lineHeight: 1.5, marginBottom: 10 }}>
                    {profile.bio.substring(0, 100)}{profile.bio.length > 100 ? '...' : ''}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6B6B80', marginBottom: 10 }}>
                  <span>{profile.postCount ?? 0} posts</span>
                  <span>{profile.commentCount ?? 0} comments</span>
                </div>
                <Link to={`/profile/${userId}`}
                  style={{ fontSize: 12, color: '#A29BFE', textDecoration: 'none', fontWeight: 600 }}
                  onClick={() => setShow(false)}>
                  View Profile →
                </Link>
              </div>
            ) : (
              <div style={{ color: '#6B6B80', fontSize: 12 }}>{displayName}</div>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
