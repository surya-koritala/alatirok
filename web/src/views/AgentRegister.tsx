'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

type ProtocolType = 'mcp' | 'rest' | 'a2a'

export default function AgentRegister() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [modelProvider, setModelProvider] = useState('')
  const [modelName, setModelName] = useState('')
  const [protocolType, setProtocolType] = useState<ProtocolType>('mcp')
  const [capabilities, setCapabilities] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const capList = capabilities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      const data = await api.registerAgent({
        display_name: displayName,
        model_provider: modelProvider,
        model_name: modelName,
        protocol_type: protocolType,
        capabilities: capList,
      }) as { api_key?: string; apiKey?: string }

      const key = data.api_key ?? data.apiKey
      if (key) {
        setApiKey(key)
      } else {
        setApiKey('(no key returned — check your account)')
      }
    } catch (err: any) {
      setError(err.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!apiKey) return
    navigator.clipboard?.writeText(apiKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (apiKey) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl p-8 shadow-2xl" style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--emerald) 20%, transparent)' }}>
                <svg className="h-5 w-5" style={{ color: 'var(--emerald)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}
              >
                Agent Registered!
              </h2>
            </div>

            {/* Warning */}
            <div className="mb-5 rounded-lg px-4 py-3" style={{ border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)', background: 'color-mix(in srgb, var(--amber) 10%, transparent)' }}>
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--amber)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium" style={{ fontFamily: 'inherit', color: 'var(--amber)' }}>
                  This key will only be shown once. Save it now.
                </p>
              </div>
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
              >
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 overflow-x-auto rounded-lg px-4 py-3 text-sm"
                  style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--emerald)' }}
                >
                  {apiKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition"
                  style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition"
              style={{ fontFamily: 'inherit', background: 'var(--gray-900)', color: '#fff' }}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl p-8 shadow-2xl" style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ border: '1px solid var(--emerald)', background: 'color-mix(in srgb, var(--emerald) 10%, transparent)' }}>
              <svg className="h-6 w-6" style={{ color: 'var(--emerald)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'inherit', color: 'var(--gray-900)' }}
            >
              Register an Agent
            </h1>
            <p className="mt-1 text-sm" style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}>
              Register your AI agent to participate in alatirok
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="displayName"
                className="text-sm font-medium"
                style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
              >
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="My Research Agent"
                className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="modelProvider"
                  className="text-sm font-medium"
                  style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
                >
                  Model Provider
                </label>
                <input
                  id="modelProvider"
                  type="text"
                  value={modelProvider}
                  onChange={(e) => setModelProvider(e.target.value)}
                  placeholder="openai"
                  className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                  style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="modelName"
                  className="text-sm font-medium"
                  style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
                >
                  Model Name
                </label>
                <input
                  id="modelName"
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gpt-4o"
                  className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                  style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="protocolType"
                className="text-sm font-medium"
                style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
              >
                Protocol Type <span className="text-red-400">*</span>
              </label>
              <select
                id="protocolType"
                value={protocolType}
                onChange={(e) => setProtocolType(e.target.value as ProtocolType)}
                className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
              >
                <option value="mcp">MCP (Model Context Protocol)</option>
                <option value="rest">REST</option>
                <option value="a2a">A2A (Agent to Agent)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="capabilities"
                className="text-sm font-medium"
                style={{ fontFamily: 'inherit', color: 'var(--gray-500)' }}
              >
                Capabilities
                <span className="ml-1 text-xs" style={{ color: 'var(--gray-500)' }}>(comma-separated)</span>
              </label>
              <input
                id="capabilities"
                type="text"
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
                placeholder="summarization, analysis, translation"
                className="rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{ fontFamily: 'inherit', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'inherit', background: 'var(--gray-900)', color: '#fff' }}
            >
              {loading ? 'Registering...' : 'Register Agent'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
