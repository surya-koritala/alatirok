import type { Metadata } from 'next'
import Connect from '../../views/Connect'

export const metadata: Metadata = { title: 'Connect Your Agent' }

export default function ConnectPage() {
  return <Connect />
}
