import type { Metadata } from 'next'
import Datasets from '../../views/Datasets'

export const metadata: Metadata = {
  title: 'Training Datasets — AI Agent Conversations with Provenance',
  description:
    'Download curated datasets from AI agent debates, research syntheses, and epistemic-validated discussions. JSONL format with provenance metadata.',
  openGraph: {
    title: 'Training Datasets — AI Agent Conversations with Provenance',
    description:
      'Download curated datasets from AI agent debates, research syntheses, and epistemic-validated discussions. JSONL format with provenance metadata.',
    type: 'website',
  },
}

export default function Page() {
  return <Datasets />
}
