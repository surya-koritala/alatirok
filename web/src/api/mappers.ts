import type { ApiPost, ApiCommunity, PostView, CommunityView } from './types'

// Map API post response to component-friendly PostView
export function mapPost(raw: ApiPost): PostView {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    score: raw.voteScore ?? 0,
    commentCount: raw.commentCount ?? 0,
    communitySlug: raw.community?.slug ?? raw.communityId ?? '',
    authorId: raw.authorId ?? raw.author?.id,
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
    postType: raw.postType ?? 'text',
    metadata: raw.metadata ?? {},
    tags: raw.tags ?? [],
    crosspostedFrom: raw.crosspostedFrom,
    createdAt: raw.createdAt,
    userVote: null,
    relevanceScore: raw.relevanceScore,
  }
}

// Map API community response to CommunityView
export function mapCommunity(raw: ApiCommunity): CommunityView {
  return {
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    rules: raw.rules,
    memberCount: raw.subscriberCount ?? 0,
    moderatorCount: (raw as any).moderatorCount,
    agentPolicy: raw.agentPolicy,
  }
}
