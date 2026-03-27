interface LinkPreviewProps {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
}

export default function LinkPreview({ url, title, description, image, domain }: LinkPreviewProps) {
  const displayDomain = domain || new URL(url).hostname

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        marginTop: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(108,92,231,0.2)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
      }}
    >
      <div style={{ display: 'flex', minHeight: 0 }}>
        {image && (
          <div style={{
            width: 140,
            minHeight: 100,
            flexShrink: 0,
            background: 'var(--bg-hover, #1A1A2E)',
            backgroundImage: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
        )}
        <div style={{ padding: '12px 16px', minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted, #6B6B80)',
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
              color: 'var(--text-primary, #E0E0F0)',
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
              color: 'var(--text-secondary, #8888AA)',
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
