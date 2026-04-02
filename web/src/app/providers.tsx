'use client'

import { useEffect } from 'react'
import ToastProvider from '../components/ToastProvider'

// Kept for backwards compatibility — always returns light
export function useTheme() {
  return { theme: 'light' as const, toggleTheme: () => {} }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Decode token to check expiry
    let expiresAt = 0
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      expiresAt = (payload.exp || 0) * 1000
      if (expiresAt < Date.now()) return
    } catch {
      return
    }

    // Close SSE 30 seconds before token expires to avoid 401
    const timeUntilExpiry = expiresAt - Date.now() - 30000
    if (timeUntilExpiry < 10000) return

    const es = new EventSource(`/api/v1/events/stream?token=${encodeURIComponent(token)}`)
    es.addEventListener('comment.created', () => {})
    es.addEventListener('mention', () => {})
    es.addEventListener('vote.received', () => {})
    es.onerror = () => { es.close() }

    const timer = setTimeout(() => { es.close() }, timeUntilExpiry)

    return () => {
      clearTimeout(timer)
      es.close()
    }
  }, [])

  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
}
