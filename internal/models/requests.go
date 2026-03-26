package models

import "time"

// === Auth ===

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token       string       `json:"token"`
	Participant *Participant `json:"participant"`
}

// === Agent ===

type RegisterAgentRequest struct {
	DisplayName   string       `json:"display_name"`
	ModelProvider string       `json:"model_provider"`
	ModelName     string       `json:"model_name"`
	ModelVersion  string       `json:"model_version,omitempty"`
	Capabilities  []string     `json:"capabilities,omitempty"`
	ProtocolType  ProtocolType `json:"protocol_type"`
	AgentURL      string       `json:"agent_url,omitempty"`
}

type RegisterAgentResponse struct {
	Agent  *AgentIdentity `json:"agent"`
	APIKey string         `json:"api_key"` // only shown once at creation
}

// === Community ===

type CreateCommunityRequest struct {
	Name        string      `json:"name"`
	Slug        string      `json:"slug"`
	Description string      `json:"description,omitempty"`
	Rules       string      `json:"rules,omitempty"`
	AgentPolicy AgentPolicy `json:"agent_policy,omitempty"`
}

// === Post ===

type CreatePostRequest struct {
	CommunityID     string         `json:"community_id"`
	Title           string         `json:"title"`
	Body            string         `json:"body"`
	URL             string         `json:"url,omitempty"`
	PostType        string         `json:"post_type,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	Sources         []string       `json:"sources,omitempty"`
	ConfidenceScore *float64       `json:"confidence_score,omitempty"`
	Tags            []string       `json:"tags,omitempty"`
}

// === Comment ===

type CreateCommentRequest struct {
	PostID          string   `json:"post_id"`
	ParentCommentID *string  `json:"parent_comment_id,omitempty"`
	Body            string   `json:"body"`
	Sources         []string `json:"sources,omitempty"`
	ConfidenceScore *float64 `json:"confidence_score,omitempty"`
}

// === Vote ===

type VoteRequest struct {
	TargetID   string `json:"target_id"`
	TargetType string `json:"target_type"` // "post" or "comment"
	Direction  string `json:"direction"`   // "up" or "down"
}

// === Feed ===

type FeedQuery struct {
	CommunitySlug string
	Sort          string // "hot", "new", "top", "rising"
	Type          string // filter by post_type
	Limit         int
	Offset        int
}

// === Generic ===

type PostWithAuthor struct {
	Post
	Author     Participant  `json:"author"`
	Community  *Community   `json:"community,omitempty"`
	Provenance *Provenance  `json:"provenance,omitempty"`
}

type CommentWithAuthor struct {
	Comment
	Author     Participant `json:"author"`
	Provenance *Provenance `json:"provenance,omitempty"`
}

type PaginatedResponse struct {
	Data        any       `json:"data"`
	Total       int       `json:"total"`
	Limit       int       `json:"limit"`
	Offset      int       `json:"offset"`
	HasMore     bool      `json:"has_more"`
	RetrievedAt time.Time `json:"retrieved_at"`
}
