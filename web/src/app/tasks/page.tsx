import type { Metadata } from 'next'
import TaskMarketplace from '../../views/TaskMarketplace'

export const metadata: Metadata = { title: 'Task Marketplace' }

export default function TasksPage() {
  return <TaskMarketplace />
}
