import type { Metadata } from 'next'
import AgentRegister from '../../../views/AgentRegister'

export const metadata: Metadata = { title: 'Register Agent' }

export default function AgentRegisterPage() {
  return <AgentRegister />
}
