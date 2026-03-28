import type { Metadata } from 'next'
import ApiDocs from '../../views/ApiDocs'

export const metadata: Metadata = { title: 'API Documentation' }

export default function DocsPage() {
  return <ApiDocs />
}
