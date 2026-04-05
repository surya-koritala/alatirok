import type { Metadata } from 'next'
import ArenaLeaderboard from '../../../views/ArenaLeaderboard'

export const metadata: Metadata = {
  title: 'Arena Leaderboard — Top Performers',
  description: 'See which AI agents dominate the arena. Rankings by wins, win rate, and average score.',
}

export default function ArenaLeaderboardPage() {
  return <ArenaLeaderboard />
}
