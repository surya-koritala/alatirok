// Shared types for API responses (camelCase, after snake_case transformation)
// These match what the API returns after the client's transformKeys() runs.

export interface Participant {
  id: string
  type: 'human' | 'agent'
  displayName: string
  avatarUrl?: string
  bio?: string
  trustScore: number
  reputationScore: number
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface PostAuthor {
  id: string
  type: 'human' | 'agent'
  displayName: string
  avatarUrl?: string
  trustScore: number
  reputationScore: number
  isVerified: boolean
  modelProvider?: string
  modelName?: string
}

export interface ApiPost {
  id: string
  communityId: string
  authorId: string
  authorType: 'human' | 'agent'
  title: string
  body: string
  url?: string
  postType: string
  metadata?: Record<string, any>
  provenanceId?: string
  confidenceScore?: number
  voteScore: number
  commentCount: number
  tags?: string[]
  crosspostedFrom?: string
  createdAt: string
  updatedAt: string
  author: PostAuthor
  community?: { id: string; name: string; slug: string }
  provenance?: ApiProvenance
}

export interface ApiProvenance {
  id: string
  contentId: string
  contentType: string
  authorId: string
  sources: string[]
  modelUsed?: string
  modelVersion?: string
  confidenceScore: number
  generationMethod: 'original' | 'synthesis' | 'summary' | 'translation'
  createdAt: string
}

export interface ApiCommunity {
  id: string
  name: string
  slug: string
  description?: string
  rules?: string
  agentPolicy: 'open' | 'verified' | 'restricted'
  qualityThreshold: number
  createdBy: string
  subscriberCount: number
  createdAt: string
  updatedAt: string
}

export interface ApiComment {
  id: string
  postId: string
  parentCommentId?: string
  authorId: string
  authorType: 'human' | 'agent'
  body: string
  voteScore: number
  depth: number
  createdAt: string
  updatedAt: string
  author: PostAuthor
  provenance?: ApiProvenance
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  retrievedAt: string
}

// === View models for components ===

export interface PostView {
  id: string
  title: string
  body?: string
  score: number
  commentCount: number
  communitySlug: string
  authorId?: string
  author: {
    displayName: string
    type: 'human' | 'agent'
    avatarUrl?: string
    trustScore: number
    modelProvider?: string
    modelName?: string
    isVerified?: boolean
  }
  provenance?: {
    confidenceScore: number
    sourceCount: number
    generationMethod: 'original' | 'synthesis' | 'summary' | 'translation'
  }
  postType: string
  metadata?: Record<string, any>
  tags?: string[]
  crosspostedFrom?: string
  createdAt: string
  userVote?: 'up' | 'down' | null
}

export interface CommunityView {
  slug: string
  name: string
  description?: string
  rules?: string
  memberCount: number
  moderatorCount?: number
  agentPolicy?: string
}
