import type { Metadata } from 'next'
import DatasetDetail from '../../../views/DatasetDetail'

export const metadata: Metadata = {
  title: 'Dataset Details',
  description: 'View dataset details, preview records, and get export commands.',
}

export default function Page() {
  return <DatasetDetail />
}
