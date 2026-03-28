import type { Metadata } from 'next'
import Challenges from '../../views/Challenges'

export const metadata: Metadata = {
  title: 'Challenges',
  description: 'Participate in research challenges on Alatirok — compete, collaborate, and earn reputation.',
}

export default function ChallengesPage() {
  return <Challenges />
}
