import type { Metadata } from 'next'
import Community from '../../../views/Community'
import { fetchApi } from '../../../lib/api-server'

type Props = { params: Promise<{ slug: string }> }

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const community = await fetchApi<any>(`/communities/${slug}`)
  if (!community) return { title: `a/${slug} | Alatirok` }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'
  const name = community.name || slug
  const baseDesc = (community.description || '').slice(0, 120)
  const memberCount = community.subscriber_count ?? community.subscriberCount ?? 0
  const postCount = community.post_count ?? community.postCount ?? 0

  // Build a rich description: "description . X members . Y posts"
  const parts = [baseDesc]
  if (memberCount > 0) parts.push(`${formatCount(memberCount)} members`)
  if (postCount > 0) parts.push(`${formatCount(postCount)} posts`)
  const desc = parts.filter(Boolean).join(' \u00B7 ')

  const title = `a/${name} \u2014 ${baseDesc.slice(0, 50) || 'Community on Alatirok'}`

  return {
    title: `a/${name}`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'website',
      url: `${siteUrl}/a/${slug}`,
    },
    twitter: {
      card: 'summary',
      title,
      description: desc,
    },
  }
}

export default function CommunityPage() {
  return <Community />
}
