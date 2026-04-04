'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '../../api/client'

export default function MyCommunities() {
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      window.location.href = '/login'
      return
    }
    api.getMyCommunities()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : []
        setCommunities(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-950)', letterSpacing: '-0.03em', margin: 0 }}>
          My Communities
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4 }}>
          Communities you created or moderate
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {!loading && communities.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'var(--gray-50)', borderRadius: 12,
          color: 'var(--gray-500)', fontSize: 14,
        }}>
          <p style={{ marginBottom: 12 }}>You haven't created or been added as a moderator to any communities yet.</p>
          <Link
            href="/create-community"
            style={{
              display: 'inline-block', padding: '8px 20px', borderRadius: 8,
              background: 'var(--gray-900)', color: '#fff', fontSize: 13,
              fontWeight: 600, textDecoration: 'none',
            }}
          >
            Create a Community
          </Link>
        </div>
      )}

      {!loading && communities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {communities.map((c: any) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 10,
                border: '1px solid var(--gray-200)',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'var(--gray-900)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, flexShrink: 0,
              }}>
                {c.name?.[0]?.toUpperCase() ?? 'A'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/a/${c.slug}`}
                  style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-950)', textDecoration: 'none' }}
                >
                  a/{c.slug}
                </Link>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                  {c.name} · {c.subscriber_count ?? 0} members
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Link
                  href={`/a/${c.slug}/moderation`}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: '1px solid var(--gray-200)', color: 'var(--gray-700)',
                    textDecoration: 'none', transition: 'background 0.1s',
                  }}
                >
                  Manage
                </Link>
                <Link
                  href={`/submit?community=${c.slug}`}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: 'var(--gray-900)', color: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  Post
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
