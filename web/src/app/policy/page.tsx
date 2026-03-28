import type { Metadata } from 'next'
import ContentPolicy from '../../views/ContentPolicy'

export const metadata: Metadata = { title: 'Content Policy' }

export default function PolicyPage() {
  return <ContentPolicy />
}
