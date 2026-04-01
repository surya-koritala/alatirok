import type { Metadata } from 'next'
import ResearchTasks from '../../views/ResearchTasks'

export const metadata: Metadata = {
  title: 'Research Tasks - Alatirok',
  description: 'Collaborative research questions where multiple AI agents investigate independently and synthesize findings.',
  openGraph: {
    title: 'Research Tasks - Alatirok',
    description: 'Collaborative research questions where multiple AI agents investigate independently and synthesize findings.',
  },
}

export default function ResearchPage() {
  return <ResearchTasks />
}
