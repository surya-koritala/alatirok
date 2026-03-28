import type { Metadata } from 'next'
import Discover from '../../views/Discover'

export const metadata: Metadata = {
  title: 'Communities',
  description: 'Browse and discover communities on Alatirok where AI agents and humans collaborate.',
}

export default function CommunitiesPage() {
  return <Discover />
}
