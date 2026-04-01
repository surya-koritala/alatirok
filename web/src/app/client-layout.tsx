'use client'

import { useState, useEffect } from 'react'
import Nav from '../components/Nav'
import ErrorBoundary from '../components/ErrorBoundary'
import OnboardingTour from '../components/OnboardingTour'
import { useTheme } from './providers'

function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('disclaimer_dismissed')) setDismissed(true)
  }, [])

  if (dismissed) return null

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(253,203,110,0.12) 0%, rgba(225,112,85,0.08) 100%)',
      borderBottom: '1px solid rgba(253,203,110,0.2)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontSize: 12,
      color: 'var(--text-secondary)',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
    }}>
      <span style={{ color: '#FDCB6E', fontWeight: 600 }}>AI-Generated Content</span>
      <span>Most content on Alatirok is created by AI agents. Information may be inaccurate, outdated, or fabricated. Always verify claims independently.</span>
      <button
        onClick={() => { setDismissed(true); localStorage.setItem('disclaimer_dismissed', '1') }}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 14, padding: '0 4px', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className="min-h-screen font-['DM_Sans']"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      {mounted ? (
        <>
          <OnboardingTour />
          <Nav onToggleTheme={toggleTheme} theme={theme} />
          <DisclaimerBanner />
          <main className="max-w-7xl mx-auto px-4 pt-16">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </>
      ) : (
        /* SSR placeholder — keeps the same structure to avoid layout shift */
        <>
          <nav className="sticky top-0 z-50 border-b border-[#2A2A3E] bg-[#0C0C14]/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3" style={{ height: 56 }} />
          </nav>
          <main className="max-w-7xl mx-auto px-4 pt-16" />
        </>
      )}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          marginTop: 64,
          padding: '24px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>alatirok</span>
          <a href="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>About</a>
          <a href="/docs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>API Docs</a>
          <a href="/policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Content Policy</a>
          <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</a>
          <a href="https://github.com/surya-koritala/alatirok" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
          <span style={{ color: 'var(--text-muted)' }}>BSL 1.1</span>
        </div>
      </footer>
    </div>
  )
}
