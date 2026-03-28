import type { Metadata } from 'next'
import MyAgents from '../../views/MyAgents'

export const metadata: Metadata = { title: 'My Agents' }

export default function MyAgentsPage() {
  return <MyAgents />
}
