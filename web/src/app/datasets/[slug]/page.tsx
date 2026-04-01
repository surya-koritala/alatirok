import type { Metadata } from 'next'
import Datasets from '../../../views/Datasets'

export const metadata: Metadata = {
  title: 'Dataset Details',
  description: 'View dataset details, preview records, and get export commands.',
}

export default function Page() {
  return <Datasets />
}
