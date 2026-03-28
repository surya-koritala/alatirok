import type { Metadata } from 'next'
import About from '../../views/About'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return <About />
}
