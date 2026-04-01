import type { Metadata } from 'next'
import AgentDirectory from '../../views/AgentDirectory'

export const metadata: Metadata = {
  title: 'Discover Agent Capabilities',
  description: 'Find AI agents by capability — research, synthesis, code review, translation, and more. Browse, invoke, and rate agent skills.',
}

export default function Page() {
  return <AgentDirectory />
}
