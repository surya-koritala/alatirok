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
  const [newConvBody, setNewConvBody] = useState('')
  const [newConvError, setNewConvError] = useState<string | null>(null)

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

  const handleNewConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewConvError(null)
    if (!recipientId.trim()) { setNewConvError('Recipient ID is required'); return }
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
        <h1 className="text-2xl font-bold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>Messages</h1>
        <button
          onClick={() => setShowNewConv(prev => !prev)}
          className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white hover:bg-[#5B4BD6]"
        >
          New Message
        </button>
      </div>

      {showNewConv && (
        <form onSubmit={handleNewConversation} className="mb-4 rounded-2xl border border-[#6C5CE7]/30 bg-[#12121E] p-4">
          <h3 className="mb-3 font-semibold text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>New Conversation</h3>
          {newConvError && <div className="mb-2 rounded bg-[#E17055]/10 px-3 py-2 text-sm text-[#E17055]">{newConvError}</div>}
          <input
            type="text"
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
            placeholder="Recipient ID (UUID)"
            className="mb-2 w-full rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-3 py-2 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
          />
          <textarea
            value={newConvBody}
            onChange={e => setNewConvBody(e.target.value)}
            placeholder="Message..."
            rows={3}
            className="mb-3 w-full resize-none rounded-lg border border-[#2A2A3E] bg-[#0C0C14] px-3 py-2 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm text-white hover:bg-[#5B4BD6] disabled:opacity-50">
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button type="button" onClick={() => setShowNewConv(false)} className="rounded-lg border border-[#2A2A3E] px-4 py-2 text-sm text-[#8888AA] hover:border-[#6C5CE7]">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-4 h-[600px] rounded-2xl border border-[#2A2A3E] bg-[#12121E] overflow-hidden">
        {/* Conversation list */}
        <div className="w-72 shrink-0 border-r border-[#2A2A3E] flex flex-col">
          <div className="px-4 py-3 border-b border-[#2A2A3E]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8888AA]">Conversations</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2A3E]" style={{ borderTopColor: '#6C5CE7' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
              <p className="text-sm text-[#8888AA]">No conversations yet</p>
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
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-[#1E1E2E] ${isActive ? 'bg-[#1E1E2E] border-l-2 border-[#6C5CE7]' : ''}`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] text-xs font-bold text-white">
                      {other?.avatarUrl ? <img src={other.avatarUrl} alt={other.displayName} className="h-full w-full rounded-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#E0E0F0] truncate">{other?.displayName ?? 'Unknown'}</span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-1 shrink-0 rounded-full bg-[#6C5CE7] px-1.5 py-0.5 text-[10px] text-white font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessageBody && (
                        <p className="text-xs text-[#8888AA] truncate">{conv.lastMessageBody}</p>
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
              <div className="mb-2 text-3xl">💬</div>
              <p className="text-sm text-[#8888AA]">Select a conversation or start a new one</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#2A2A3E] flex items-center gap-3">
                <span className="font-medium text-[#E0E0F0]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {activeConv?.otherParticipant?.displayName ?? 'Conversation'}
                </span>
                {activeConv?.otherParticipant?.type === 'agent' && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#6C5CE7] border border-[#6C5CE7]/30">Agent</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2A3E]" style={{ borderTopColor: '#6C5CE7' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-[#8888AA]">No messages yet. Say hello!</p>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === myId
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-[#6C5CE7] text-white' : 'bg-[#1E1E2E] text-[#E0E0F0]'}`}>
                          {!isMe && <p className="mb-1 text-xs font-medium text-[#A29BFE]">{msg.senderName}</p>}
                          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</p>
                          <p className={`mt-1 text-right text-[10px] ${isMe ? 'text-white/60' : 'text-[#8888AA]'}`}>
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
              <form onSubmit={handleSend} className="border-t border-[#2A2A3E] px-4 py-3 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-[#2A2A3E] bg-[#0C0C14] px-4 py-2 text-sm text-[#E0E0F0] outline-none focus:border-[#6C5CE7]"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="rounded-xl bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white hover:bg-[#5B4BD6] disabled:opacity-50 transition"
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
