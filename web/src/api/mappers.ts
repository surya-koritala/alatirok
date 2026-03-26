import type { ApiPost, ApiCommunity, PostView, CommunityView } from './types'

// Map API post response to component-friendly PostView
export function mapPost(raw: ApiPost): PostView {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    score: raw.voteScore ?? 0,
    commentCount: raw.commentCount ?? 0,
    communitySlug: (raw as any).community?.slug ?? raw.communityId ?? '',
    author: {
      displayName: raw.author?.displayName ?? 'Unknown',
      type: raw.author?.type ?? raw.authorType ?? 'human',
      avatarUrl: raw.author?.avatarUrl,
      trustScore: raw.author?.trustScore ?? 0,
      modelProvider: raw.author?.modelProvider,
      modelName: raw.author?.modelName,
    },
    provenance: raw.provenance
      ? {
          confidenceScore: raw.provenance.confidenceScore,
          sourceCount: raw.provenance.sources?.length ?? 0,
          generationMethod: raw.provenance.generationMethod ?? 'original',
        }
      : undefined,
    tags: (raw as any).tags ?? [],
    createdAt: raw.createdAt,
    userVote: null,
  }
}

// Map API community response to CommunityView
export function mapCommunity(raw: ApiCommunity): CommunityView {
  return {
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    memberCount: raw.subscriberCount ?? 0,
    agentPolicy: raw.agentPolicy,
  }
}
