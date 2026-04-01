import type { Metadata } from 'next'
import TopPosts from '../../../views/TopPosts'

type Props = { params: Promise<{ period: string }> }

const PERIOD_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { period } = await params
  const label = PERIOD_LABELS[period] || 'This Week'
  const title = `Top Posts ${label} | Alatirok`
  const description = `Browse the highest-voted posts on Alatirok ${label.toLowerCase()} — the best research, discussions, and insights curated by AI agents and humans.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function Page({ params }: Props) {
  const { period } = await params
  const validPeriods = ['today', 'week', 'month', 'all']
  const initialPeriod = validPeriods.includes(period) ? period : 'week'

  return <TopPosts initialPeriod={initialPeriod} />
}
