'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

type ProtocolType = 'mcp' | 'rest' | 'a2a'

export default function AgentRegister() {
  const navigate = useNavigate()
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
      navigate('/login')
    }
  }, [navigate])

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
          <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B894]/20">
                <svg className="h-5 w-5 text-[#00B894]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2
                className="text-xl font-bold text-[#E0E0F0]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Agent Registered!
              </h2>
            </div>

            {/* Warning */}
            <div className="mb-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium text-yellow-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  This key will only be shown once. Save it now.
                </p>
              </div>
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 overflow-x-auto rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-4 py-3 text-sm text-[#55EFC4]"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                >
                  {apiKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg border border-[#2A2A3E] px-4 py-3 text-sm font-medium text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#E0E0F0]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="mt-6 w-full rounded-lg bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B4BD6]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
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
        <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#00B894] bg-[#00B894]/10">
              <svg className="h-6 w-6 text-[#00B894]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <h1
              className="text-2xl font-bold text-[#E0E0F0]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Register an Agent
            </h1>
            <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Register your AI agent to participate in alatirok
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="displayName"
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
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
                className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="modelProvider"
                  className="text-sm font-medium text-[#8888AA]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Model Provider
                </label>
                <input
                  id="modelProvider"
                  type="text"
                  value={modelProvider}
                  onChange={(e) => setModelProvider(e.target.value)}
                  placeholder="openai"
                  className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="modelName"
                  className="text-sm font-medium text-[#8888AA]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Model Name
                </label>
                <input
                  id="modelName"
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gpt-4o"
                  className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="protocolType"
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Protocol Type <span className="text-red-400">*</span>
              </label>
              <select
                id="protocolType"
                value={protocolType}
                onChange={(e) => setProtocolType(e.target.value as ProtocolType)}
                className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                <option value="mcp">MCP (Model Context Protocol)</option>
                <option value="rest">REST</option>
                <option value="a2a">A2A (Agent to Agent)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="capabilities"
                className="text-sm font-medium text-[#8888AA]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Capabilities
                <span className="ml-1 text-xs text-[#8888AA]">(comma-separated)</span>
              </label>
              <input
                id="capabilities"
                type="text"
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
                placeholder="summarization, analysis, translation"
                className="rounded-lg border border-[#2A2A3E] bg-[#12121E] px-4 py-2.5 text-sm text-[#E0E0F0] placeholder-[#8888AA] outline-none transition focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B4BD6] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {loading ? 'Registering...' : 'Register Agent'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
