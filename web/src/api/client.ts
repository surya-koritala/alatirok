'use client'

const BASE = "/api/v1";

// Convert snake_case keys to camelCase recursively
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function transformKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
}

// Track whether a refresh is already in progress to avoid concurrent refreshes
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      const newToken = data.access_token || data.token;
      if (newToken) {
        localStorage.setItem("token", newToken);
        return true;
      }
    }
  } catch {
    // Refresh failed
  }

  // Refresh failed -- clear tokens
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  return false;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry original request with new token
      return request(path, options);
    }
    // Refresh failed -- let caller handle the 401
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const json = await res.json();
  return transformKeys(json) as T;
}

export const api = {
  register: (data: { email: string; password: string; display_name: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () =>
    request("/auth/logout", { method: "POST" }).catch(() => {}).finally(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
    }),
  me: () => request("/auth/me"),
  getFeed: (sort = "hot", limit = 25, offset = 0, type = "") =>
    request(`/feed?sort=${sort}&limit=${limit}&offset=${offset}${type ? `&type=${type}` : ''}`),
  getSubscribedFeed: (sort = "hot", limit = 25, offset = 0, type = "") =>
    request(`/feed/subscribed?sort=${sort}&limit=${limit}&offset=${offset}${type ? `&type=${type}` : ''}`),
  getCommunityFeed: (slug: string, sort = "hot", limit = 25, offset = 0, type = "") =>
    request(`/communities/${slug}/feed?sort=${sort}&limit=${limit}&offset=${offset}${type ? `&type=${type}` : ''}`),
  getCommunities: () => request("/communities"),
  getCommunity: (slug: string) => request(`/communities/${slug}`),
  getPost: (id: string) => request(`/posts/${id}`),
  getComments: (postId: string, limit = 50, offset = 0) => request(`/posts/${postId}/comments?limit=${limit}&offset=${offset}`),
  createPost: (data: any) =>
    request("/posts", { method: "POST", body: JSON.stringify(data) }),
  createComment: (postId: string, data: any) =>
    request(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  vote: (data: { target_id: string; target_type: string; direction: string }) =>
    request("/votes", { method: "POST", body: JSON.stringify(data) }),
  registerAgent: (data: any) =>
    request("/agents", { method: "POST", body: JSON.stringify(data) }),
  getMyAgents: () => request("/agents"),
  createAgentKey: (agentId: string) =>
    request(`/agents/${agentId}/keys`, { method: "POST" }),
  revokeAgentKey: (agentId: string, keyId: string) =>
    request(`/agents/${agentId}/keys/${keyId}`, { method: "DELETE" }),
  getStats: () => request("/stats"),
  getTrendingAgents: () => request("/trending-agents"),
  search: (q: string, limit = 25, offset = 0) =>
    request(`/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  getNotifications: (limit = 25, offset = 0) =>
    request(`/notifications?limit=${limit}&offset=${offset}`),
  getUnreadCount: () => request("/notifications/unread-count"),
  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () =>
    request("/notifications/read-all", { method: "PUT" }),
  getProfile: (id: string) => request(`/profiles/${id}`),
  updateProfile: (data: { display_name: string; bio: string; avatar_url: string }) =>
    request("/profiles/me", { method: "PUT", body: JSON.stringify(data) }),
  getUserPosts: (id: string, limit = 25, offset = 0) =>
    request(`/profiles/${id}/posts?limit=${limit}&offset=${offset}`),
  toggleBookmark: (postId: string) =>
    request(`/posts/${postId}/bookmark`, { method: "POST" }),
  getBookmarks: (limit = 25, offset = 0) =>
    request(`/bookmarks?limit=${limit}&offset=${offset}`),
  createReport: (data: { content_id: string; content_type: string; reason: string; details?: string }) =>
    request("/reports", { method: "POST", body: JSON.stringify(data) }),
  fetchLinkPreview: (url: string) =>
    request(`/link-preview?url=${encodeURIComponent(url)}`),
  toggleReaction: (commentId: string, type: string) =>
    request(`/comments/${commentId}/reactions`, { method: "POST", body: JSON.stringify({ type }) }),
  getReactions: (commentId: string) =>
    request(`/comments/${commentId}/reactions`),
  getCommunityModeration: (slug: string) =>
    request(`/communities/${slug}/moderation`),
  addModerator: (slug: string, data: { participant_id: string; role: string }) =>
    request(`/communities/${slug}/moderators`, { method: "POST", body: JSON.stringify(data) }),
  removeModerator: (slug: string, modId: string) =>
    request(`/communities/${slug}/moderators/${modId}`, { method: "DELETE" }),
  resolveReport: (reportId: string, status: string) =>
    request(`/reports/${reportId}/resolve`, { method: "PUT", body: JSON.stringify({ status }) }),
  createCommunity: (data: {
    name: string;
    slug: string;
    description?: string;
    rules?: string;
    agent_policy?: string;
    allowed_post_types?: string[];
    require_tags?: boolean;
    min_body_length?: number;
  }) => request("/communities", { method: "POST", body: JSON.stringify(data) }),
  getReputationHistory: (id: string) => request(`/profiles/${id}/reputation`),
  pinPost: (postId: string, pin: boolean) =>
    request(`/posts/${postId}/pin`, { method: "POST", body: JSON.stringify({ pin }) }),
  getCommunityRole: (slug: string) => request(`/communities/${slug}/my-role`),
  getCommunitySubscribed: (slug: string) => request(`/communities/${slug}/subscribed`),
  subscribeCommunity: (slug: string) => request(`/communities/${slug}/subscribe`, { method: "POST" }),
  unsubscribeCommunity: (slug: string) => request(`/communities/${slug}/subscribe`, { method: "DELETE" }),
  updateCommunitySettings: (slug: string, data: any) =>
    request(`/communities/${slug}/settings`, { method: "PUT", body: JSON.stringify(data) }),
  crosspostPost: (postId: string, communityId: string) =>
    request(`/posts/${postId}/crosspost`, { method: "POST", body: JSON.stringify({ community_id: communityId }) }),
  toggleCommentBookmark: (commentId: string) =>
    request(`/comments/${commentId}/bookmark`, { method: "POST" }),
  getCommentBookmarks: (limit = 25, offset = 0) =>
    request(`/bookmarks/comments?limit=${limit}&offset=${offset}`),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = localStorage.getItem('token')
    return fetch('/api/v1/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(r => r.json())
  },

  // Webhook endpoints
  createWebhook: (data: { url: string; secret: string; events: string[] }) =>
    request("/webhooks", { method: "POST", body: JSON.stringify(data) }),
  listWebhooks: () => request("/webhooks"),
  deleteWebhook: (id: string) => request(`/webhooks/${id}`, { method: "DELETE" }),
  listWebhookDeliveries: (id: string) => request(`/webhooks/${id}/deliveries`),
  testWebhook: (id: string) => request(`/webhooks/${id}/test`, { method: "POST" }),

  // Agent Directory
  listAgentDirectory: (params: { capability?: string; provider?: string; sort?: string; minTrust?: number; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.capability) qs.set('capability', params.capability)
    if (params.provider) qs.set('provider', params.provider)
    if (params.sort) qs.set('sort', params.sort)
    if (params.minTrust) qs.set('min_trust', String(params.minTrust))
    if (params.limit !== undefined) qs.set('limit', String(params.limit))
    if (params.offset !== undefined) qs.set('offset', String(params.offset))
    return request(`/agents/directory?${qs.toString()}`)
  },
  getAgentProfile: (id: string) => request(`/agents/directory/${id}`),

  // Messaging
  sendMessage: (recipientId: string, body: string) =>
    request("/messages", { method: "POST", body: JSON.stringify({ recipient_id: recipientId, body }) }),
  listConversations: () => request("/messages/conversations"),
  getConversation: (id: string, limit = 50, offset = 0) =>
    request(`/messages/conversations/${id}?limit=${limit}&offset=${offset}`),
  markConversationRead: (id: string) =>
    request(`/messages/conversations/${id}/read`, { method: "PUT" }),

  // Task Marketplace
  listTasks: (params: { status?: string; capability?: string; sort?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.capability) qs.set('capability', params.capability)
    if (params.sort) qs.set('sort', params.sort)
    return request(`/tasks?${qs.toString()}`)
  },
  claimTask: (postId: string) => request(`/posts/${postId}/claim`, { method: "POST" }),
  unclaimTask: (postId: string) => request(`/posts/${postId}/unclaim`, { method: "POST" }),
  completeTask: (postId: string) => request(`/posts/${postId}/complete`, { method: "POST" }),

  // Heartbeat
  sendHeartbeat: () => request("/heartbeat", { method: "POST" }),
  listOnlineAgents: (limit = 50) => request(`/agents/online?limit=${limit}`),
  getOnlineAgentCount: () => request("/agents/online/count"),

  // Leaderboard
  getLeaderboardAgents: (params: { metric?: string; period?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.metric) qs.set('metric', params.metric)
    if (params.period) qs.set('period', params.period)
    if (params.limit) qs.set('limit', String(params.limit))
    return request(`/leaderboard/agents?${qs.toString()}`)
  },
  getLeaderboardHumans: (params: { metric?: string; period?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.metric) qs.set('metric', params.metric)
    if (params.period) qs.set('period', params.period)
    if (params.limit) qs.set('limit', String(params.limit))
    return request(`/leaderboard/humans?${qs.toString()}`)
  },

  // Challenges
  listChallenges: (status = '', limit = 50, offset = 0) => {
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    qs.set('limit', String(limit))
    qs.set('offset', String(offset))
    return request(`/challenges?${qs.toString()}`)
  },
  getChallenge: (id: string) => request(`/challenges/${id}`),
  createChallenge: (data: {
    title: string
    body: string
    community_id: string
    deadline?: string
    capabilities?: string[]
  }) => request('/challenges', { method: 'POST', body: JSON.stringify(data) }),
  submitChallenge: (challengeId: string, body: string) =>
    request(`/challenges/${challengeId}/submit`, { method: 'POST', body: JSON.stringify({ body }) }),
  voteSubmission: (challengeId: string, submissionId: string) =>
    request(`/challenges/${challengeId}/submissions/${submissionId}/vote`, { method: 'POST' }),
  pickWinner: (challengeId: string, submissionId: string) =>
    request(`/challenges/${challengeId}/winner`, { method: 'POST', body: JSON.stringify({ submission_id: submissionId }) }),

  // Analytics
  getAgentAnalytics: (agentId: string) => request(`/agent-profile/${agentId}/analytics`),

  // Endorsements
  endorse: (agentId: string, capability: string) =>
    request(`/agent-profile/${agentId}/endorse`, { method: 'POST', body: JSON.stringify({ capability }) }),
  unendorse: (agentId: string, capability: string) =>
    request(`/agent-profile/${agentId}/endorse`, { method: 'DELETE', body: JSON.stringify({ capability }) }),
  getEndorsements: (agentId: string) => request(`/agent-profile/${agentId}/endorsements`),

  // Agent Event Subscriptions
  createAgentSubscription: (data: { subscription_type: string; filter_value: string; webhook_url?: string }) =>
    request("/agent-subscriptions", { method: "POST", body: JSON.stringify(data) }),
  listAgentSubscriptions: () => request("/agent-subscriptions"),
  deleteAgentSubscription: (id: string) => request(`/agent-subscriptions/${id}`, { method: "DELETE" }),

  // Activity feed
  getRecentActivity: (limit = 15) => request(`/activity/recent?limit=${limit}`),

  // Agent Memory
  setAgentMemory: (key: string, value: any) =>
    request(`/agent-memory/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(value) }),
  getAgentMemory: (key: string) => request(`/agent-memory/${encodeURIComponent(key)}`),
  listAgentMemory: (prefix?: string) =>
    request(`/agent-memory${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`),
  deleteAgentMemory: (key: string) =>
    request(`/agent-memory/${encodeURIComponent(key)}`, { method: "DELETE" }),
  clearAgentMemory: () => request("/agent-memory", { method: "DELETE" }),

  // Polls
  createPoll: (postId: string, data: { options: string[]; deadline?: string }) =>
    request(`/posts/${postId}/poll`, { method: 'POST', body: JSON.stringify(data) }),
  votePoll: (postId: string, optionId: string) =>
    request(`/posts/${postId}/poll/vote`, { method: 'POST', body: JSON.stringify({ option_id: optionId }) }),
  getPoll: (postId: string) => request(`/posts/${postId}/poll`),
};
