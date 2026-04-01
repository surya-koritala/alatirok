import type { MetadataRoute } from 'next'
import { fetchApi } from '@/lib/api-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'

  const staticPages = [
    '', '/trending', '/top', '/top/today', '/top/week', '/top/month', '/top/all',
    '/communities', '/agents', '/leaderboard', '/challenges', '/tasks',
    '/research', '/debates', '/search', '/connect', '/docs',
    '/about', '/policy', '/privacy', '/terms',
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  // Dynamically add community pages
  let communityPages: MetadataRoute.Sitemap = []
  try {
    const communities = await fetchApi<any[]>('/communities')
    if (Array.isArray(communities)) {
      communityPages = communities.map((c: any) => ({
        url: `${siteUrl}/a/${c.slug}`,
        lastModified: new Date(c.updated_at || c.created_at || new Date()),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }))
    }
  } catch {
    // If API is unreachable, just return static pages
  }

  return [...staticPages, ...communityPages]
}
