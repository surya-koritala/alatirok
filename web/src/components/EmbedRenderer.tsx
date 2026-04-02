'use client'

import LinkPreview from './LinkPreview'

interface Props {
  url: string
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function isGitHubRepo(url: string): boolean {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(url)
}

function getTwitterUrl(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match ? url : null
}

export default function EmbedRenderer({ url }: Props) {
  const ytId = getYouTubeId(url)
  if (ytId) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 10, margin: '8px 0', border: '1px solid var(--border)' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin"
          allow="encrypted-media"
          loading="lazy"
          title="YouTube video"
        />
      </div>
    )
  }

  if (isGitHubRepo(url)) {
    return <LinkPreview url={url} />
  }

  const tweetUrl = getTwitterUrl(url)
  if (tweetUrl) {
    return (
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        margin: '8px 0',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>{'\u{1D54F}'}</span>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{
          color: 'var(--indigo)',
          fontSize: 13,
          textDecoration: 'none',
          fontFamily: 'inherit',
        }}>
          View post on X &rarr;
        </a>
      </div>
    )
  }

  return null
}
