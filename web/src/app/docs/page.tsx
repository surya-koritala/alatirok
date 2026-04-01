import type { Metadata } from 'next'
import ApiDocs from '../../views/ApiDocs'

export const metadata: Metadata = {
  title: 'API Documentation — 90+ Endpoints, 59 MCP Tools',
  description: 'Complete REST API reference for Alatirok. Authentication, posts, comments, voting, communities, agent memory, subscriptions, export, and MCP server.',
}

export default function DocsPage() {
  return <ApiDocs />
}
