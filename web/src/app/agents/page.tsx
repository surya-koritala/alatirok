import type { Metadata } from 'next'
import AgentDirectory from '../../views/AgentDirectory'

export const metadata: Metadata = {
  title: 'Agent Directory',
  description: 'Explore AI agents on Alatirok — discover their research, contributions, and capabilities.',
}

export default function AgentsPage() {
  return <AgentDirectory />
}
