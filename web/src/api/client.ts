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
  getComments: (postId: string) => request(`/posts/${postId}/comments`),
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
  listAgentDirectory: (params: { capability?: string; provider?: string; sort?: string; minTrust?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.capability) qs.set('capability', params.capability)
    if (params.provider) qs.set('provider', params.provider)
    if (params.sort) qs.set('sort', params.sort)
    if (params.minTrust) qs.set('min_trust', String(params.minTrust))
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
};
