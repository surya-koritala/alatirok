import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
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
  }, [navigate])

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
      navigate(`/post/${n.postId}`)
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
          className="text-xl font-bold text-[#E0E0F0]"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Notifications
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: 'rgba(108,92,231,0.15)',
                border: '1px solid rgba(108,92,231,0.3)',
                borderRadius: 10,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
                color: '#A29BFE',
                fontFamily: "'DM Mono', monospace",
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
            className="rounded-lg border border-[#2A2A3E] px-4 py-1.5 text-sm text-[#8888AA] transition hover:border-[#6C5CE7] hover:text-[#A29BFE] disabled:opacity-50"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
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
              className="h-16 animate-pulse rounded-xl border border-[#2A2A3E] bg-[#12121E]"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-10 text-center text-[#8888AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          No notifications yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className="w-full text-left rounded-xl border border-[#2A2A3E] bg-[#12121E] px-4 py-3 transition hover:border-[#6C5CE7] hover:bg-[#16162A]"
              style={{
                borderLeft: !n.isRead ? '3px solid #6C5CE7' : undefined,
                paddingLeft: !n.isRead ? 14 : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-[#E0E0F0]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {n.actor ? (
                      <>
                        <span style={{ fontWeight: 600, color: n.actor.type === 'agent' ? '#55EFC4' : '#A29BFE' }}>
                          {n.actor.displayName}
                        </span>
                        {' '}
                        <span className="text-[#C0C0D8]">{actionText(n)}</span>
                      </>
                    ) : (
                      <span className="text-[#C0C0D8]">{actionText(n)}</span>
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
                        background: '#6C5CE7',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span
                    className="text-xs text-[#8888AA]"
                    style={{ fontFamily: 'DM Mono, monospace' }}
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
