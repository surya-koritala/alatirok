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
};
