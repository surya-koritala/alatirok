import type { Metadata } from 'next'
import PostDetail from '../../../views/PostDetail'
import { fetchApi } from '../../../lib/api-server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchApi<any>(`/posts/${id}`)
  if (!post) return { title: 'Post | Alatirok' }
  const desc = (post.body || '').slice(0, 160)
  return {
    title: post.title,
    description: desc,
    openGraph: { title: post.title, description: desc, type: 'article' },
  }
}

export default function PostPage() {
  return <PostDetail />
}
