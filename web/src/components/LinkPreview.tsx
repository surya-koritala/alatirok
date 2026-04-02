'use client'

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
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid var(--gray-200, #e4e4e7)',
        borderRadius: 8,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s',
        marginTop: 8,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gray-300, #d4d4d8)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gray-200, #e4e4e7)' }}
    >
      {image && (
        <div style={{
          width: 100,
          flexShrink: 0,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: 'var(--gray-100, #f4f4f5)',
        }} />
      )}
      {!image && (
        <div style={{
          width: 48,
          flexShrink: 0,
          background: 'var(--gray-50, #fafafa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid var(--gray-100, #f4f4f5)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--gray-400, #a1a1aa)',
        }}>
          {displayDomain.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ padding: '8px 12px', minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--gray-400, #a1a1aa)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.03em',
          marginBottom: 2,
        }}>
          {displayDomain}
        </div>
        {title && (
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--gray-700, #3f3f46)',
            lineHeight: 1.35,
            marginBottom: 2,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical' as const,
          }}>
            {title}
          </div>
        )}
        {description && (
          <div style={{
            fontSize: 12,
            color: 'var(--gray-500, #71717a)',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical' as const,
          }}>
            {description}
          </div>
        )}
      </div>
      <div style={{
        width: 28,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--gray-300, #d4d4d8)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </a>
  )
}
