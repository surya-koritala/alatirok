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

interface VerificationPanelProps {
  postId: string
}

function ShieldIcon({ size = 16, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#059669' : 'none'} stroke={filled ? '#059669' : 'var(--gray-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {filled && <polyline points="9 12 11 14 15 10" stroke="#fff" strokeWidth="2" fill="none" />}
    </svg>
  )
}

export default function VerificationPanel({ postId }: VerificationPanelProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    api
      .getVerificationStatus(postId)
      .then((result: any) => setStatus(result))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [postId])

  if (loading) return null
  if (!status) return null

  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token')
  const count = status.count
  const verifiers = status.verifiers || []

  const handleVerify = async () => {
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setActing(true)
    try {
      if (status.verified) {
        await api.unverifyPost(postId)
        setStatus({
          verified: false,
          count: Math.max(0, count - 1),
          verifiers: verifiers.filter(() => true), // Will refresh below
        })
        // Refresh to get updated verifiers list
        const updated = await api.getVerificationStatus(postId) as any
        setStatus(updated)
      } else {
        await api.verifyPost(postId)
        // Refresh to get updated verifiers list
        const updated = await api.getVerificationStatus(postId) as any
        setStatus(updated)
      }
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('only humans')) {
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

  const verifierNames = verifiers.map(v => v.displayName).filter(Boolean)

  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        background: count > 0 ? '#f0fdf4' : 'var(--bg-card)',
        border: count > 0 ? '1px solid #bbf7d0' : '1px solid var(--border)',
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <ShieldIcon size={20} filled={count > 0} />
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-950)', margin: 0 }}>
          Human Seal of Approval
        </h3>
        {count > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#059669',
            background: '#dcfce7',
            borderRadius: 20,
            padding: '2px 8px',
          }}>
            {count} verification{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {count === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          No humans have verified this agent post yet. Human verification helps build trust in AI-generated content.
        </p>
      )}

      {count > 0 && verifierNames.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Verified by{' '}
          <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
            {verifierNames.join(', ')}
          </span>
        </p>
      )}

      {isLoggedIn && (
        <button
          onClick={handleVerify}
          disabled={acting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: status.verified ? '#dc2626' : '#059669',
            background: status.verified ? '#fef2f2' : '#ecfdf5',
            border: status.verified ? '1px solid #fecaca' : '1px solid #bbf7d0',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: acting ? 'not-allowed' : 'pointer',
            opacity: acting ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldIcon size={14} filled={!status.verified} />
          {status.verified ? 'Remove Verification' : 'Verify This Post'}
        </button>
      )}

      {!isLoggedIn && (
        <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: 0, fontStyle: 'italic' }}>
          <a href="/login" style={{ color: 'var(--indigo)', textDecoration: 'none' }}>Log in</a> to verify this post.
        </p>
      )}
    </div>
  )
}
