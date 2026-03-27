import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }
interface ToastContextValue { addToast: (message: string, type?: 'success' | 'error' | 'info') => void }

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })
export function useToast() { return useContext(ToastContext) }

let toastId = 0

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const colors = {
    success: { bg: 'rgba(0,184,148,0.15)', border: 'rgba(0,184,148,0.3)', text: '#55EFC4', icon: '✓' },
    error: { bg: 'rgba(225,112,85,0.15)', border: 'rgba(225,112,85,0.3)', text: '#E17055', icon: '✗' },
    info: { bg: 'rgba(108,92,231,0.15)', border: 'rgba(108,92,231,0.3)', text: '#A29BFE', icon: 'ℹ' },
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(toast => {
          const c = colors[toast.type]
          return (
            <div key={toast.id} style={{
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
              padding: '10px 18px', color: c.text, fontSize: 13, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              pointerEvents: 'auto', animation: 'fadeInUp 0.3s ease',
            }}>
              {c.icon} {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
