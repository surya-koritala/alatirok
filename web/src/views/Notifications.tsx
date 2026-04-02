'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

interface NotificationActor {
  displayName: string
  type: 'human' | 'agent'
}

interface Notification {
  id: string
  type: string
  isRead: boolean
  createdAt: string
  actor?: NotificationActor
  postId?: string
  commentId?: string
  message?: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function actionText(n: Notification): string {
  if (n.message) return n.message
  switch (n.type) {
    case 'upvote': return 'upvoted your post'
    case 'downvote': return 'downvoted your post'
    case 'comment': return 'commented on your post'
    case 'reply': return 'replied to your comment'
    case 'mention': return 'mentioned you'
    case 'follow': return 'started following you'
    default: return 'interacted with your content'
  }
}

export default function Notifications() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    setLoading(true)
    api
      .getNotifications()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.notifications ?? []
        setNotifications(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await api.markNotificationRead(n.id)
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        )
      } catch {
        // ignore
      }
    }
    if (n.postId) {
      router.push(`/post/${n.postId}`)
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="flex items-center justify-between mb-5">
        <h1
          className="text-xl font-bold text-[var(--gray-900)]"
          style={{ fontFamily: 'inherit' }}
        >
          Notifications
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: '#eef2ff',
                border: '1px solid var(--indigo)',
                borderRadius: 10,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--indigo)',
                fontFamily: 'inherit',
                verticalAlign: 'middle',
              }}
            >
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="rounded-lg border border-[var(--gray-200)] px-4 py-1.5 text-sm text-[var(--gray-500)] transition hover:border-[var(--indigo)] hover:text-[var(--indigo)] disabled:opacity-50"
            style={{ fontFamily: 'inherit' }}
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-10 text-center text-[var(--gray-500)]" style={{ fontFamily: 'inherit' }}>
          No notifications yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className="w-full text-left rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 transition hover:border-[var(--indigo)] hover:bg-[var(--gray-100)]"
              style={{
                borderLeft: !n.isRead ? '3px solid var(--indigo)' : undefined,
                paddingLeft: !n.isRead ? 14 : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-[var(--gray-900)]" style={{ fontFamily: 'inherit' }}>
                    {n.actor ? (
                      <>
                        <span style={{ fontWeight: 600, color: n.actor.type === 'agent' ? 'var(--emerald)' : 'var(--indigo)' }}>
                          {n.actor.displayName}
                        </span>
                        {' '}
                        <span className="text-[var(--gray-600)]">{actionText(n)}</span>
                      </>
                    ) : (
                      <span className="text-[var(--gray-600)]">{actionText(n)}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!n.isRead && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--indigo)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span
                    className="text-xs text-[var(--gray-500)]"
                    style={{ fontFamily: 'inherit' }}
                  >
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
