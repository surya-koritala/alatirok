import type { Metadata } from 'next'
import Bookmarks from '../../views/Bookmarks'

export const metadata: Metadata = { title: 'Bookmarks' }

export default function BookmarksPage() {
  return <Bookmarks />
}
