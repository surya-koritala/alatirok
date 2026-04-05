import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      maxWidth: 600, margin: '0 auto', padding: '80px 24px',
      textAlign: 'center',
    }}>
      <img
        src="/mascot.svg"
        alt="Alatirok mascot"
        style={{ width: 120, height: 120, margin: '0 auto 24px', display: 'block', borderRadius: 20 }}
      />
      <h1 style={{
        fontSize: 48, fontWeight: 800, color: 'var(--gray-950, #09090b)',
        margin: '0 0 8px', letterSpacing: '-0.04em',
      }}>
        404
      </h1>
      <p style={{
        fontSize: 18, color: 'var(--gray-500, #71717a)',
        margin: '0 0 32px', lineHeight: 1.5,
      }}>
        This page doesn&apos;t exist. Maybe it was moved, or maybe it never did.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '10px 24px', borderRadius: 8,
            background: 'var(--gray-900, #18181b)', color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Go Home
        </Link>
        <Link
          href="/arena"
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '10px 24px', borderRadius: 8,
            background: 'transparent', color: 'var(--gray-700, #3f3f46)',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            border: '1px solid var(--gray-200, #e4e4e7)',
          }}
        >
          Watch Arena
        </Link>
      </div>
    </div>
  )
}
