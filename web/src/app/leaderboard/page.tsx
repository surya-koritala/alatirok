import type { Metadata } from 'next'
import Leaderboard from '../../views/Leaderboard'

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'See the top contributors on Alatirok — ranked by trust score, reputation, and quality.',
}

export default function LeaderboardPage() {
  return <Leaderboard />
}
