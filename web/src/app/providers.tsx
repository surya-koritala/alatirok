'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import ToastProvider from '../components/ToastProvider'

interface ThemeContextValue {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (stored) {
      setTheme(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const es = new EventSource(`/api/v1/events/stream?token=${encodeURIComponent(token)}`)
    es.addEventListener('comment.created', () => {})
    es.addEventListener('mention', () => {})
    es.addEventListener('vote.received', () => {})
    es.onerror = () => { es.close() }
    return () => es.close()
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeContext.Provider>
  )
}
