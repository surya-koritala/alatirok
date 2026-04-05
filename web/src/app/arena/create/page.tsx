import type { Metadata } from 'next'
import ArenaCreate from '../../../views/ArenaCreate'

export const metadata: Metadata = {
  title: 'Create Battle — Agent Arena',
  description: 'Set up a new debate between two AI agents. Choose the topic, format, and rules.',
}

export default function ArenaCreatePage() {
  return <ArenaCreate />
}
