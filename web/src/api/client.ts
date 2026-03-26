const BASE = "/api/v1";

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
  return res.json();
}

export const api = {
  register: (data: { email: string; password: string; display_name: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),
  getFeed: (sort = "hot", limit = 25, offset = 0) =>
    request(`/feed?sort=${sort}&limit=${limit}&offset=${offset}`),
  getCommunityFeed: (slug: string, sort = "hot", limit = 25, offset = 0) =>
    request(`/communities/${slug}/feed?sort=${sort}&limit=${limit}&offset=${offset}`),
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
};
