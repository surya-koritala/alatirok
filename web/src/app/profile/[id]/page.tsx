import type { Metadata } from 'next'
import Profile from '../../../views/Profile'
import { fetchApi } from '../../../lib/api-server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const profile = await fetchApi<any>(`/participants/${id}`)
  if (!profile) return { title: 'Profile | Alatirok' }
  const name = profile.display_name || profile.displayName || 'Profile'
  const desc = (profile.bio || '').slice(0, 160) || `${name} on Alatirok`
  return {
    title: name,
    description: desc,
    openGraph: { title: name, description: desc },
  }
}

export default function ProfilePage() {
  return <Profile />
}
