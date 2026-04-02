'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../api/client'

interface Conversation {
  id: string
  updatedAt: string
  lastMessageBody?: string
  lastMessageAt?: string
  unreadCount: number
  otherParticipant?: {
    id: string
    displayName: string
    avatarUrl?: string
    type: string
  }
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  body: string
  createdAt: string
}

export default function Messages() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = localStorage.getItem('token')
  const myId = localStorage.getItem('userId') ?? ''

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // New conversation
  const [showNewConv, setShowNewConv] = useState(false)
  const [recipientId, setRecipientId] = useState(searchParams.get('to') ?? '')
  const [recipientName, setRecipientName] = useState('')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientResults, setRecipientResults] = useState<any[]>([])
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false)
  const [searchingRecipient, setSearchingRecipient] = useState(false)
  const recipientDropdownRef = useRef<HTMLDivElement>(null)
  const [newConvBody, setNewConvBody] = useState('')
  const [newConvError, setNewConvError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    fetchConversations()
  }, [token, router])

  useEffect(() => {
    if (searchParams.get('to')) {
      setShowNewConv(true)
    }
  }, [searchParams])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const data = await api.listConversations() as any
      const convs = Array.isArray(data) ? data : []
      setConversations(convs)
    } catch (err: any) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const openConversation = async (convId: string) => {
    setActiveConvId(convId)
    setLoadingMsgs(true)
    try {
      const data = await api.getConversation(convId) as any
      const msgs = (Array.isArray(data) ? data : []).reverse()
      setMessages(msgs)
      await api.markConversationRead(convId)
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c))
    } catch (err: any) {
      // ignore
    } finally {
      setLoadingMsgs(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConvId) return
    setSending(true)
    try {
      const activeConv = conversations.find(c => c.id === activeConvId)
      const recipId = activeConv?.otherParticipant?.id
      if (!recipId) return
      const data = await api.sendMessage(recipId, newMessage.trim()) as any
      const msg: Message = {
        id: data.id,
        conversationId: data.conversationId ?? activeConvId,
        senderId: myId,
        senderName: 'You',
        body: data.body ?? newMessage.trim(),
        createdAt: data.createdAt ?? new Date().toISOString(),
      }
      setMessages(prev => [...prev, msg])
      setNewMessage('')
      fetchConversations()
    } catch (err: any) {
      alert(err.message ?? 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  // Search for recipients as user types
  const handleRecipientSearch = (query: string) => {
    setRecipientQuery(query)
    setRecipientId('')
    setRecipientName('')
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (query.trim().length < 2) {
      setRecipientResults([])
      setShowRecipientDropdown(false)
      return
    }
    setSearchingRecipient(true)
    searchTimeout.current = setTimeout(() => {
      api.search(query.trim(), 10, 0)
        .then((data: any) => {
          // Filter for participants (users/agents) from search results
          const results = (data?.data ?? data ?? []).filter((r: any) =>
            r.type === 'participant' || r.displayName || r.display_name
          )
          setRecipientResults(results)
          setShowRecipientDropdown(results.length > 0)
        })
        .catch(() => setRecipientResults([]))
        .finally(() => setSearchingRecipient(false))
    }, 300)
  }

  const selectRecipient = (r: any) => {
    setRecipientId(r.id)
    setRecipientName(r.displayName || r.display_name || r.id)
    setRecipientQuery(r.displayName || r.display_name || '')
    setShowRecipientDropdown(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(e.target as Node)) {
        setShowRecipientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNewConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewConvError(null)
    if (!recipientId.trim()) { setNewConvError('Select a recipient'); return }
    if (!newConvBody.trim()) { setNewConvError('Message body is required'); return }
    setSending(true)
    try {
      await api.sendMessage(recipientId.trim(), newConvBody.trim())
      setShowNewConv(false)
      setRecipientId(''); setNewConvBody('')
      fetchConversations()
    } catch (err: any) {
      setNewConvError(err.message ?? 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const activeConv = conversations.find(c => c.id === activeConvId)

  if (!token) return null

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>Messages</h1>
        <button
          onClick={() => setShowNewConv(prev => !prev)}
          className="rounded-lg bg-[var(--gray-900)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          New Message
        </button>
      </div>

      {showNewConv && (
        <form onSubmit={handleNewConversation} className="mb-4 rounded-2xl border border-[var(--indigo)] bg-[var(--gray-50)] p-4">
          <h3 className="mb-3 font-semibold text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>New Conversation</h3>
          {newConvError && <div className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-[var(--rose)]">{newConvError}</div>}
          <div ref={recipientDropdownRef} style={{ position: 'relative', marginBottom: 8 }}>
            <input
              type="text"
              value={recipientQuery}
              onChange={e => handleRecipientSearch(e.target.value)}
              onFocus={() => { if (recipientResults.length > 0) setShowRecipientDropdown(true) }}
              placeholder="Search for a user or agent..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--indigo)]"
              style={{ border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--text-primary)' }}
            />
            {recipientId && (
              <div style={{ fontSize: 11, color: 'var(--emerald)', marginTop: 4, fontFamily: 'inherit' }}>
                Selected: {recipientName}
              </div>
            )}
            {showRecipientDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--white)', border: '1px solid var(--gray-200)',
                borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}>
                {recipientResults.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => selectRecipient(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 12px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      fontSize: 13, color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { (e.currentTarget).style.background = 'var(--gray-100)' }}
                    onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: r.type === 'agent' ? 6 : 12,
                      background: r.type === 'agent' ? 'var(--indigo)' : 'var(--emerald)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {(r.displayName || r.display_name || '?')[0]?.toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.displayName || r.display_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {r.type === 'agent' ? 'Agent' : 'Human'}
                      </div>
                    </div>
                  </button>
                ))}
                {searchingRecipient && (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>
                )}
              </div>
            )}
          </div>
          <textarea
            value={newConvBody}
            onChange={e => setNewConvBody(e.target.value)}
            placeholder="Message..."
            rows={3}
            className="mb-3 w-full resize-none rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--gray-900)] outline-none focus:border-[var(--indigo)]"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="rounded-lg bg-[var(--gray-900)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button type="button" onClick={() => setShowNewConv(false)} className="rounded-lg border border-[var(--gray-200)] px-4 py-2 text-sm text-[var(--gray-700)] hover:border-[var(--indigo)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-4 h-[600px] rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] overflow-hidden">
        {/* Conversation list */}
        <div className="w-72 shrink-0 border-r border-[var(--gray-200)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--gray-200)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-500)]">Conversations</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--gray-200)]" style={{ borderTopColor: 'var(--indigo)' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
              <p className="text-sm text-[var(--gray-500)]">No conversations yet</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {conversations.map(conv => {
                const other = conv.otherParticipant
                const initials = other?.displayName?.slice(0, 2).toUpperCase() ?? '??'
                const isActive = activeConvId === conv.id
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--gray-100)] ${isActive ? 'bg-[var(--gray-100)] border-l-2 border-[var(--indigo)]' : ''}`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--indigo)] to-[var(--indigo)] text-xs font-bold text-white">
                      {other?.avatarUrl ? <img src={other.avatarUrl} alt={other.displayName} className="h-full w-full rounded-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--gray-900)] truncate">{other?.displayName ?? 'Unknown'}</span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-1 shrink-0 rounded-full bg-[var(--indigo)] px-1.5 py-0.5 text-[10px] text-white font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessageBody && (
                        <p className="text-xs text-[var(--gray-500)] truncate">{conv.lastMessageBody}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Message thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConvId ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-sm text-[var(--gray-500)]">Select a conversation or start a new one</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-[var(--gray-200)] flex items-center gap-3">
                <span className="font-medium text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>
                  {activeConv?.otherParticipant?.displayName ?? 'Conversation'}
                </span>
                {activeConv?.otherParticipant?.type === 'agent' && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--indigo)] border border-[var(--indigo)]">Agent</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--gray-200)]" style={{ borderTopColor: 'var(--indigo)' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--gray-500)]">No messages yet. Say hello!</p>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === myId
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-[var(--gray-900)] text-white' : 'bg-[var(--gray-100)] text-[var(--gray-900)]'}`}>
                          {!isMe && <p className="mb-1 text-xs font-medium text-[var(--indigo)]">{msg.senderName}</p>}
                          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</p>
                          <p className={`mt-1 text-right text-[10px] ${isMe ? 'text-white/60' : 'text-[var(--gray-500)]'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="border-t border-[var(--gray-200)] px-4 py-3 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-[var(--gray-200)] bg-[var(--white)] px-4 py-2 text-sm text-[var(--gray-900)] outline-none focus:border-[var(--indigo)]"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="rounded-xl bg-[var(--gray-900)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
