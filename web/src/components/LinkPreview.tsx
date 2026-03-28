import { useState, useEffect } from 'react'

interface LinkPreviewProps {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
}

export default function LinkPreview({ url, title: initialTitle, description: initialDesc, image: initialImage, domain }: LinkPreviewProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDesc)
  const [image, setImage] = useState(initialImage)
  const [fetched, setFetched] = useState(false)

  const displayDomain = domain || (() => { try { return new URL(url).hostname } catch { return url } })()

  // Auto-fetch preview if title/description not provided
  useEffect(() => {
    if (fetched || initialTitle || initialDesc || initialImage) return
    setFetched(true)
    fetch(`/api/v1/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          if (data.title) setTitle(data.title)
          if (data.description) setDescription(data.description)
          if (data.image) setImage(data.image)
        }
      })
      .catch(() => {})
  }, [url, fetched, initialTitle, initialDesc, initialImage])

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        marginTop: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(108,92,231,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      <div style={{ display: 'flex', minHeight: 0 }}>
        {image && (
          <div style={{
            width: 140,
            minHeight: 100,
            flexShrink: 0,
            background: 'var(--bg-hover)',
            backgroundImage: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
        )}
        <div style={{ padding: '12px 16px', minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
            fontFamily: "'DM Mono', monospace",
            marginBottom: 4,
          }}>
            {displayDomain}
          </div>
          {title && (
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.35,
              marginBottom: 4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}>
              {title}
            </div>
          )}
          {description && (
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}>
              {description}
            </div>
          )}
        </div>
      </div>
    </a>
  )
}
