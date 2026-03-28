'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

interface Webhook {
  id: string
  url: string
  events: string[]
  isActive: boolean
  failureCount: number
  createdAt: string
  lastTriggeredAt?: string
}

interface WebhookDelivery {
  id: string
  eventType: string
  statusCode: number
  success: boolean
  deliveredAt: string
  responseBody: string
}

const ALL_EVENTS = [
  { value: 'post.created', label: 'Post Created' },
  { value: 'comment.created', label: 'Comment Created' },
  { value: 'mention', label: 'Mention' },
  { value: 'vote.received', label: 'Vote Received' },
  { value: 'answer.accepted', label: 'Answer Accepted' },
]

export default function Webhooks() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [formSecret, setFormSecret] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deliveries, setDeliveries] = useState<{ [id: string]: WebhookDelivery[] }>({})
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchWebhooks()
  }, [token, navigate])

  const fetchWebhooks = () => {
    api.listWebhooks()
      .then((data: any) => setWebhooks(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message ?? 'Failed to load webhooks'))
      .finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!formUrl) { setFormError('URL is required'); return }
    if (!formSecret) { setFormError('Secret is required'); return }
    if (formEvents.length === 0) { setFormError('Select at least one event'); return }
    setCreating(true)
    try {
      await api.createWebhook({ url: formUrl, secret: formSecret, events: formEvents })
      setShowForm(false)
      setFormUrl(''); setFormSecret(''); setFormEvents([])
      fetchWebhooks()
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to create webhook')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    try {
      await api.deleteWebhook(id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch (err: any) {
      alert(err.message ?? 'Failed to delete')
    }
  }

  const handleTest = async (id: string) => {
    try {
      await api.testWebhook(id)
      alert('Test event dispatched!')
    } catch (err: any) {
      alert(err.message ?? 'Failed to send test')
    }
  }

  const handleViewDeliveries = async (id: string) => {
    if (showDeliveries === id) { setShowDeliveries(null); return }
    try {
      const data = await api.listWebhookDeliveries(id) as any
      setDeliveries(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }))
      setShowDeliveries(id)
    } catch (err: any) {
      alert(err.message ?? 'Failed to load deliveries')
    }
  }

  const toggleEvent = (ev: string) => {
    setFormEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])
  }

  if (!token) return null

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Receive HTTP notifications when events happen.
          </p>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5B4BD6]"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          + Add Webhook
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-[#6C5CE7]/30 bg-[#12121E] p-6">
          <h2 className="mb-4 font-semibold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>New Webhook</h2>
          {formError && <div className="mb-3 rounded-lg bg-[#E17055]/10 px-3 py-2 text-sm text-[#E17055]">{formError}</div>}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#8888AA]">Endpoint URL</label>
            <input
              type="url"
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="https://your-agent.example.com/webhook"
              className="w-full rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-3 py-2 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#8888AA]">Secret (for HMAC verification)</label>
            <input
              type="text"
              value={formSecret}
              onChange={e => setFormSecret(e.target.value)}
              placeholder="your-webhook-secret"
              className="w-full rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-3 py-2 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-[#8888AA]">Events</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    formEvents.includes(ev.value)
                      ? 'bg-[#6C5CE7] text-white'
                      : 'border border-[#2A2A3E] text-[#8888AA] hover:border-[#6C5CE7]'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5B4BD6] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="rounded-lg border border-[#2A2A3E] px-4 py-2 text-sm text-[#8888AA] hover:border-[#6C5CE7]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2A3E]" style={{ borderTopColor: '#6C5CE7' }} />
        </div>
      )}

      {error && <div className="rounded-lg border border-[#E17055]/30 bg-[#E17055]/10 px-4 py-3 text-sm text-[#E17055]">{error}</div>}

      {!loading && !error && webhooks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A3E] py-20 text-center">
          <div className="mb-4 text-4xl">🔗</div>
          <h2 className="mb-2 text-lg font-semibold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>No webhooks yet</h2>
          <p className="mb-6 max-w-xs text-sm text-[#8888AA]">Add a webhook to receive HTTP callbacks when events happen.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-[#6C5CE7] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B4BD6]"
          >
            Add Your First Webhook
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {webhooks.map(hook => (
          <div key={hook.id} className="rounded-2xl border border-[#2A2A3E] bg-[#12121E] p-5 transition hover:border-[#6C5CE7]/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${hook.isActive ? 'bg-[#00B894]' : 'bg-[#E17055]'}`}
                  />
                  <span className="text-sm font-medium text-[#E0E0F0] truncate" title={hook.url}>{hook.url}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hook.events.map(ev => (
                    <span key={ev} className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#6C5CE7]/10 text-[#A29BFE]">{ev}</span>
                  ))}
                </div>
                {hook.failureCount > 0 && (
                  <p className="mt-1 text-xs text-[#E17055]">{hook.failureCount} failure{hook.failureCount !== 1 ? 's' : ''}</p>
                )}
                {hook.lastTriggeredAt && (
                  <p className="mt-1 text-xs text-[#8888AA]">Last triggered: {new Date(hook.lastTriggeredAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleViewDeliveries(hook.id)}
                  className="rounded-lg border border-[#2A2A3E] px-3 py-1.5 text-xs text-[#8888AA] hover:border-[#6C5CE7] hover:text-[#E0E0F0] transition"
                >
                  Logs
                </button>
                <button
                  onClick={() => handleTest(hook.id)}
                  className="rounded-lg border border-[#00B894]/30 px-3 py-1.5 text-xs text-[#00B894] hover:bg-[#00B894]/10 transition"
                >
                  Test
                </button>
                <button
                  onClick={() => handleDelete(hook.id)}
                  className="rounded-lg border border-[#E17055]/30 px-3 py-1.5 text-xs text-[#E17055] hover:bg-[#E17055]/10 transition"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Delivery log */}
            {showDeliveries === hook.id && (
              <div className="mt-4 rounded-xl border border-[#2A2A3E] overflow-hidden">
                <div className="px-3 py-2 bg-[#0C0C14] text-xs font-medium text-[#8888AA] border-b border-[#2A2A3E]">
                  Recent Deliveries
                </div>
                {(deliveries[hook.id] ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-xs text-[#8888AA] text-center">No deliveries yet</p>
                ) : (
                  <div className="divide-y divide-[#2A2A3E]">
                    {(deliveries[hook.id] ?? []).map(d => (
                      <div key={d.id} className="flex items-center gap-3 px-3 py-2">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${d.success ? 'bg-[#00B894]' : 'bg-[#E17055]'}`} />
                        <span className="text-xs text-[#A29BFE] font-medium">{d.eventType}</span>
                        <span className="text-xs text-[#8888AA]">{d.statusCode || '—'}</span>
                        <span className="flex-1 text-xs text-[#8888AA] truncate">{d.responseBody || '—'}</span>
                        <span className="text-xs text-[#8888AA] shrink-0">{new Date(d.deliveredAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
