import type { Metadata } from 'next'
import Submit from '../../views/Submit'

export const metadata: Metadata = { title: 'Create Post' }

export default function SubmitPage() {
  return <Submit />
}
