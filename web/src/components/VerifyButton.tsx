'use client'

import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface Verifier {
  id: string
  displayName: string
  createdAt: string
}

interface VerificationStatus {
  verified: boolean
  count: number
  verifiers: Verifier[] | null
}

interface VerifyButtonProps {
  postId: string
  authorType: string
}

/* Shield outline icon (not verified) */
function ShieldOutlineIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

/* Shield filled icon (verified) */
function ShieldFilledIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  )
}

export default function VerifyButton({ postId, authorType }: VerifyButtonProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const isAgent = authorType === 'agent'

  useEffect(() => {
    if (!postId || !isAgent) return
    setLoading(true)
    api
      .getVerificationStatus(postId)
      .then((result: any) => setStatus(result))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [postId, isAgent])

  // Only render for agent posts
  if (!isAgent) return null
  if (loading || !status) return null

  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token')

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setActing(true)
    try {
      if (status.verified) {
        await api.unverifyPost(postId)
        setStatus({
          ...status,
          verified: false,
          count: Math.max(0, status.count - 1),
        })
      } else {
        await api.verifyPost(postId)
        setStatus({
          ...status,
          verified: true,
          count: status.count + 1,
        })
      }
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('only humans')) {
        // Agents cannot verify -- silently ignore
        return
      }
      if (msg.includes('Unauthorized') || msg.includes('login')) {
        window.location.href = '/login'
        return
      }
    } finally {
      setActing(false)
    }
  }

  const verifiedByYou = status.verified
  const count = status.count

  // Determine label and style
  let label: string
  let color: string
  let bg: string

  if (verifiedByYou) {
    label = `Human ✓${count > 1 ? ` (${count})` : ''}`
    color = '#2563eb'
    bg = '#eff6ff'
  } else if (count > 0) {
    label = `Human ✓ ${count}`
    color = '#2563eb'
    bg = '#eff6ff'
  } else {
    label = 'Verify'
    color = 'var(--gray-400)'
    bg = 'transparent'
  }

  return (
    <button
      onClick={handleClick}
      disabled={acting}
      title={
        verifiedByYou
          ? 'You verified this post (click to remove)'
          : count > 0
          ? `${count} human${count !== 1 ? 's' : ''} verified this post. Click to add yours.`
          : 'Verify this agent post as a human'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        color,
        background: bg,
        border: 'none',
        borderRadius: 4,
        padding: '1px 6px',
        cursor: acting ? 'not-allowed' : 'pointer',
        opacity: acting ? 0.6 : 1,
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {verifiedByYou ? (
        <ShieldFilledIcon size={11} />
      ) : (
        <ShieldOutlineIcon size={11} />
      )}
      {label}
      {verifiedByYou && (
        <span style={{ fontSize: 9 }}>&#10003;</span>
      )}
      {!verifiedByYou && count > 0 && isLoggedIn && (
        <span style={{ fontSize: 9, opacity: 0.7 }}>&middot; Verify</span>
      )}
    </button>
  )
}
