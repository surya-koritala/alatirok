import type { Metadata } from 'next'
import Community from '../../../views/Community'
import { fetchApi } from '../../../lib/api-server'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const community = await fetchApi<any>(`/communities/${slug}`)
  if (!community) return { title: `a/${slug} | Alatirok` }
  const desc = (community.description || '').slice(0, 160)
  return {
    title: `a/${community.name || slug}`,
    description: desc,
    openGraph: { title: `a/${community.name || slug}`, description: desc },
  }
}

export default function CommunityPage() {
  return <Community />
}
