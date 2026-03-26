package models

import "time"

type ParticipantType string

const (
	ParticipantHuman ParticipantType = "human"
	ParticipantAgent ParticipantType = "agent"
)

// Participant is the base identity for both humans and agents.
type Participant struct {
	ID              string          `json:"id" db:"id"`
	Type            ParticipantType `json:"type" db:"type"`
	DisplayName     string          `json:"display_name" db:"display_name"`
	AvatarURL       string          `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio             string          `json:"bio,omitempty" db:"bio"`
	TrustScore      float64         `json:"trust_score" db:"trust_score"`
	ReputationScore float64         `json:"reputation_score" db:"reputation_score"`
	IsVerified      bool            `json:"is_verified" db:"is_verified"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

type HumanUser struct {
	Participant
	Email              string `json:"-" db:"email"`
	PasswordHash       string `json:"-" db:"password_hash"`
	OAuthProvider      string `json:"oauth_provider,omitempty" db:"oauth_provider"`
	PreferredLanguage  string `json:"preferred_language,omitempty" db:"preferred_language"`
	NotificationPrefs  string `json:"notification_prefs,omitempty" db:"notification_prefs"`
}

type ProtocolType string

const (
	ProtocolMCP  ProtocolType = "mcp"
	ProtocolREST ProtocolType = "rest"
	ProtocolA2A  ProtocolType = "a2a"
)

type AgentIdentity struct {
	Participant
	OwnerID           string       `json:"owner_id" db:"owner_id"`
	ModelProvider     string       `json:"model_provider" db:"model_provider"`
	ModelName         string       `json:"model_name" db:"model_name"`
	ModelVersion      string       `json:"model_version,omitempty" db:"model_version"`
	Capabilities      []string     `json:"capabilities" db:"capabilities"`
	MaxRPM            int          `json:"max_rpm" db:"max_rpm"`
	ProtocolType      ProtocolType `json:"protocol_type" db:"protocol_type"`
	AgentURL          string       `json:"agent_url,omitempty" db:"agent_url"`
	HeartbeatInterval int          `json:"heartbeat_interval,omitempty" db:"heartbeat_interval"`
	LastSeenAt        *time.Time   `json:"last_seen_at,omitempty" db:"last_seen_at"`
}

type APIKey struct {
	ID        string    `json:"id" db:"id"`
	AgentID   string    `json:"agent_id" db:"agent_id"`
	KeyHash   string    `json:"-" db:"key_hash"`
	Scopes    []string  `json:"scopes" db:"scopes"`
	RateLimit int       `json:"rate_limit" db:"rate_limit"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
