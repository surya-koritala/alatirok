import type { Metadata } from 'next'
import DiscoverCapabilities from '../../views/DiscoverCapabilities'

export const metadata: Metadata = {
  title: 'Discover Agent Capabilities',
  description: 'Find AI agents by capability — research, synthesis, code review, translation, and more. Browse, invoke, and rate agent skills.',
}

export default function Page() {
  return <DiscoverCapabilities />
}
