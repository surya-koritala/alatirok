package models

import "time"

type AgentPolicy string

const (
	AgentPolicyOpen       AgentPolicy = "open"
	AgentPolicyVerified   AgentPolicy = "verified"
	AgentPolicyRestricted AgentPolicy = "restricted"
)

type Community struct {
	ID               string      `json:"id" db:"id"`
	Name             string      `json:"name" db:"name"`
	Slug             string      `json:"slug" db:"slug"`
	Description      string      `json:"description,omitempty" db:"description"`
	Rules            string      `json:"rules,omitempty" db:"rules"`
	AgentPolicy      AgentPolicy `json:"agent_policy" db:"agent_policy"`
	QualityThreshold float64     `json:"quality_threshold" db:"quality_threshold"`
	CreatedBy        string      `json:"created_by" db:"created_by"`
	SubscriberCount  int         `json:"subscriber_count" db:"subscriber_count"`
	CreatedAt        time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at" db:"updated_at"`
}

type PostType string

const (
	PostTypeText       PostType = "text"
	PostTypeLink       PostType = "link"
	PostTypeQuestion   PostType = "question"
	PostTypeTask       PostType = "task"
	PostTypeSynthesis  PostType = "synthesis"
	PostTypeDebate     PostType = "debate"
	PostTypeCodeReview PostType = "code_review"
	PostTypeAlert      PostType = "alert"
)

type Post struct {
	ID               string          `json:"id" db:"id"`
	CommunityID      string          `json:"community_id" db:"community_id"`
	AuthorID         string          `json:"author_id" db:"author_id"`
	AuthorType       ParticipantType `json:"author_type" db:"author_type"`
	Title            string          `json:"title" db:"title"`
	Body             string          `json:"body" db:"body"`
	URL              string          `json:"url,omitempty" db:"url"`
	PostType         PostType        `json:"post_type" db:"post_type"`
	Metadata         map[string]any  `json:"metadata" db:"metadata"`
	ProvenanceID     *string         `json:"provenance_id,omitempty" db:"provenance_id"`
	ConfidenceScore  *float64        `json:"confidence_score,omitempty" db:"confidence_score"`
	VoteScore        int             `json:"vote_score" db:"vote_score"`
	CommentCount     int             `json:"comment_count" db:"comment_count"`
	Tags             []string        `json:"tags" db:"tags"`
	IsPinned         bool            `json:"is_pinned" db:"is_pinned"`
	PinnedAt         *time.Time      `json:"pinned_at,omitempty" db:"pinned_at"`
	DeletedAt        *time.Time      `json:"deleted_at,omitempty" db:"deleted_at"`
	SupersededBy     *string         `json:"superseded_by,omitempty" db:"superseded_by"`
	IsRetracted      bool            `json:"is_retracted" db:"is_retracted"`
	RetractionNotice *string         `json:"retraction_notice,omitempty" db:"retraction_notice"`
	CrosspostedFrom  *string         `json:"crossposted_from,omitempty" db:"crossposted_from"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
}

type Comment struct {
	ID              string          `json:"id" db:"id"`
	PostID          string          `json:"post_id" db:"post_id"`
	ParentCommentID *string         `json:"parent_comment_id,omitempty" db:"parent_comment_id"`
	AuthorID        string          `json:"author_id" db:"author_id"`
	AuthorType      ParticipantType `json:"author_type" db:"author_type"`
	Body            string          `json:"body" db:"body"`
	ProvenanceID    *string         `json:"provenance_id,omitempty" db:"provenance_id"`
	ConfidenceScore *float64        `json:"confidence_score,omitempty" db:"confidence_score"`
	VoteScore       int             `json:"vote_score" db:"vote_score"`
	Depth           int             `json:"depth" db:"depth"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

type VoteDirection string

const (
	VoteUp   VoteDirection = "up"
	VoteDown VoteDirection = "down"
)

type TargetType string

const (
	TargetPost    TargetType = "post"
	TargetComment TargetType = "comment"
)

type Vote struct {
	ID        string          `json:"id" db:"id"`
	TargetID  string          `json:"target_id" db:"target_id"`
	TargetType TargetType     `json:"target_type" db:"target_type"`
	VoterID   string          `json:"voter_id" db:"voter_id"`
	VoterType ParticipantType `json:"voter_type" db:"voter_type"`
	Direction VoteDirection   `json:"direction" db:"direction"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}
