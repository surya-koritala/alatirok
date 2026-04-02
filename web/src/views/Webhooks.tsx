'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
    if (!token) { router.push('/login'); return }
    fetchWebhooks()
  }, [token, router])

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
          <h1 className="text-2xl font-bold text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
            Receive HTTP notifications when events happen.
          </p>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="rounded-lg bg-[var(--gray-900)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          style={{ fontFamily: 'inherit' }}
        >
          + Add Webhook
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-[var(--indigo)] bg-[var(--gray-50)] p-6">
          <h2 className="mb-4 font-semibold text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>New Webhook</h2>
          {formError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--rose)]">{formError}</div>}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[var(--gray-500)]">Endpoint URL</label>
            <input
              type="url"
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="https://your-agent.example.com/webhook"
              className="w-full rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--gray-900)] outline-none focus:border-[var(--indigo)]"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[var(--gray-500)]">Secret (for HMAC verification)</label>
            <input
              type="text"
              value={formSecret}
              onChange={e => setFormSecret(e.target.value)}
              placeholder="your-webhook-secret"
              className="w-full rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--gray-900)] outline-none focus:border-[var(--indigo)]"
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-[var(--gray-500)]">Events</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    formEvents.includes(ev.value)
                      ? 'bg-[var(--gray-900)] text-white'
                      : 'border border-[var(--gray-200)] text-[var(--gray-500)] hover:border-[var(--indigo)]'
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
              className="rounded-lg bg-[var(--gray-900)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="rounded-lg border border-[var(--gray-200)] px-4 py-2 text-sm text-[var(--gray-700)] hover:border-[var(--indigo)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray-200)]" style={{ borderTopColor: 'var(--indigo)' }} />
        </div>
      )}

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-[var(--rose)]">{error}</div>}

      {!loading && !error && webhooks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--gray-200)] py-20 text-center">
          <div className="mb-4 text-4xl">🔗</div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>No webhooks yet</h2>
          <p className="mb-6 max-w-xs text-sm text-[var(--gray-500)]">Add a webhook to receive HTTP callbacks when events happen.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-[var(--gray-900)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Add Your First Webhook
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {webhooks.map(hook => (
          <div key={hook.id} className="rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-5 transition hover:border-[var(--indigo)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${hook.isActive ? 'bg-[var(--emerald)]' : 'bg-[var(--rose)]'}`}
                  />
                  <span className="text-sm font-medium text-[var(--gray-900)] truncate" title={hook.url}>{hook.url}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {hook.events.map(ev => (
                    <span key={ev} className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-[var(--indigo)]">{ev}</span>
                  ))}
                </div>
                {hook.failureCount > 0 && (
                  <p className="mt-1 text-xs text-[var(--rose)]">{hook.failureCount} failure{hook.failureCount !== 1 ? 's' : ''}</p>
                )}
                {hook.lastTriggeredAt && (
                  <p className="mt-1 text-xs text-[var(--gray-500)]">Last triggered: {new Date(hook.lastTriggeredAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleViewDeliveries(hook.id)}
                  className="rounded-lg border border-[var(--gray-200)] px-3 py-1.5 text-xs text-[var(--gray-500)] hover:border-[var(--indigo)] hover:text-[var(--gray-900)] transition"
                >
                  Logs
                </button>
                <button
                  onClick={() => handleTest(hook.id)}
                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs text-[var(--emerald)] hover:bg-emerald-50 transition"
                >
                  Test
                </button>
                <button
                  onClick={() => handleDelete(hook.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-[var(--rose)] hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Delivery log */}
            {showDeliveries === hook.id && (
              <div className="mt-4 rounded-xl border border-[var(--gray-200)] overflow-hidden">
                <div className="px-3 py-2 bg-[var(--white)] text-xs font-medium text-[var(--gray-500)] border-b border-[var(--gray-200)]">
                  Recent Deliveries
                </div>
                {(deliveries[hook.id] ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-xs text-[var(--gray-500)] text-center">No deliveries yet</p>
                ) : (
                  <div className="divide-y divide-[var(--gray-200)]">
                    {(deliveries[hook.id] ?? []).map(d => (
                      <div key={d.id} className="flex items-center gap-3 px-3 py-2">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${d.success ? 'bg-[var(--emerald)]' : 'bg-[var(--rose)]'}`} />
                        <span className="text-xs text-[var(--indigo)] font-medium">{d.eventType}</span>
                        <span className="text-xs text-[var(--gray-500)]">{d.statusCode || '—'}</span>
                        <span className="flex-1 text-xs text-[var(--gray-500)] truncate">{d.responseBody || '—'}</span>
                        <span className="text-xs text-[var(--gray-500)] shrink-0">{new Date(d.deliveredAt).toLocaleString()}</span>
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
