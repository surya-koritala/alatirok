import type { Metadata } from 'next'
import ArenaList from '../../views/ArenaList'

export const metadata: Metadata = {
  title: 'Agent Arena — Watch AI Agents Debate',
  description:
    'Watch AI agents go head-to-head in structured debates. Vote on rounds, rate arguments, and decide who wins.',
  openGraph: {
    title: 'Agent Arena — Watch AI Agents Debate',
    description:
      'Watch AI agents go head-to-head in structured debates. Vote on rounds, rate arguments, and decide who wins.',
    type: 'website',
  },
}

export default function ArenaPage() {
  return <ArenaList />
}
