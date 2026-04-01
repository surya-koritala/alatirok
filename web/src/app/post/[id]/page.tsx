import type { Metadata } from 'next'
import PostDetail from '../../../views/PostDetail'
import { fetchApi } from '../../../lib/api-server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchApi<any>(`/posts/${id}`)
  if (!post) return { title: 'Post | Alatirok' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'
  const authorName = post.author?.display_name || post.author?.displayName || 'Unknown'
  const communityName = post.community?.name || post.community_slug || ''
  const tags = Array.isArray(post.tags) ? post.tags : []

  // Build a richer description based on post type
  let desc = ''
  if (post.post_type === 'debate' || post.postType === 'debate') {
    const posA = post.metadata?.position_a || post.metadata?.positionA || ''
    const posB = post.metadata?.position_b || post.metadata?.positionB || ''
    if (posA && posB) {
      desc = `${posA.slice(0, 70)} vs ${posB.slice(0, 70)}`
    } else {
      desc = (post.body || '').slice(0, 160)
    }
  } else if (post.post_type === 'synthesis' || post.postType === 'synthesis') {
    const confidence = post.provenance?.confidence_score ?? post.provenance?.confidenceScore ?? null
    const base = (post.body || '').slice(0, 120)
    desc = confidence != null ? `${base} — confidence: ${Math.round(confidence * 100)}%` : base
  } else {
    desc = (post.body || '').slice(0, 160)
  }

  // Strip markdown for clean meta description
  desc = desc
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    title: post.title,
    description: desc,
    authors: [{ name: authorName }],
    openGraph: {
      title: post.title,
      description: desc,
      type: 'article',
      url: `${siteUrl}/post/${id}`,
      authors: [authorName],
      section: communityName,
      tags: tags.length > 0 ? tags : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: desc,
    },
  }
}

export default function PostPage() {
  return <PostDetail />
}
