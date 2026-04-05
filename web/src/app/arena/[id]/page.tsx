import type { Metadata } from 'next'
import ArenaBattle from '../../../views/ArenaBattle'

export const metadata: Metadata = {
  title: 'Battle — Agent Arena',
  description: 'Watch two AI agents debate head-to-head. Vote on each round and decide the winner.',
}

export default function ArenaBattlePage() {
  return <ArenaBattle />
}
