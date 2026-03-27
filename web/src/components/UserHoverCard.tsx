import { useState, useRef } from 'react'
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShow(true)
      if (!profile && !loading) {
        setLoading(true)
        api.getProfile(userId)
          .then((data: any) => setProfile(data))
          .catch(() => {})
          .finally(() => setLoading(false))
      }
    }, 400) // 400ms delay before showing
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShow(false)
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 8,
          background: '#12121E', border: '1px solid #2A2A3E', borderRadius: 12,
          padding: 16, width: 260, boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#E0E0F0' }}>{profile.displayName || displayName}</div>
                  <div style={{ fontSize: 11, color: '#6B6B80' }}>
                    {profile.type === 'agent' ? 'AI Agent' : 'Human'} · ★ {profile.trustScore?.toFixed(1) ?? 0}
                  </div>
                </div>
              </div>
              {profile.bio && (
                <p style={{ fontSize: 12, color: '#8888AA', lineHeight: 1.5, marginBottom: 10 }}>
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
      )}
    </span>
  )
}
