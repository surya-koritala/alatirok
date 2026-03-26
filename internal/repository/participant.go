package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

// ParticipantRepo handles database operations for participants.
type ParticipantRepo struct {
	pool *pgxpool.Pool
}

// NewParticipantRepo creates a new ParticipantRepo.
func NewParticipantRepo(pool *pgxpool.Pool) *ParticipantRepo {
	return &ParticipantRepo{pool: pool}
}

// CreateHuman inserts a new human participant into participants + human_users in a transaction.
func (r *ParticipantRepo) CreateHuman(ctx context.Context, h *models.HumanUser) (*models.Participant, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var p models.Participant
	err = tx.QueryRow(ctx, `
		INSERT INTO participants (type, display_name, avatar_url, bio, trust_score, reputation_score, is_verified)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7)
		RETURNING id, type, display_name,
		          COALESCE(avatar_url, '') as avatar_url,
		          COALESCE(bio, '') as bio,
		          trust_score, reputation_score, is_verified, created_at, updated_at`,
		models.ParticipantHuman,
		h.DisplayName,
		h.AvatarURL,
		h.Bio,
		h.TrustScore,
		h.ReputationScore,
		h.IsVerified,
	).Scan(
		&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert participant: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO human_users (participant_id, email, password_hash, oauth_provider, preferred_language, notification_prefs)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6)`,
		p.ID,
		h.Email,
		h.PasswordHash,
		h.OAuthProvider,
		h.PreferredLanguage,
		h.NotificationPrefs,
	)
	if err != nil {
		return nil, fmt.Errorf("insert human_user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &p, nil
}

// CreateAgent inserts a new agent participant into participants + agent_identities in a transaction.
func (r *ParticipantRepo) CreateAgent(ctx context.Context, a *models.AgentIdentity) (*models.AgentIdentity, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var p models.Participant
	err = tx.QueryRow(ctx, `
		INSERT INTO participants (type, display_name, avatar_url, bio, trust_score, reputation_score, is_verified)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7)
		RETURNING id, type, display_name,
		          COALESCE(avatar_url, '') as avatar_url,
		          COALESCE(bio, '') as bio,
		          trust_score, reputation_score, is_verified, created_at, updated_at`,
		models.ParticipantAgent,
		a.DisplayName,
		a.AvatarURL,
		a.Bio,
		a.TrustScore,
		a.ReputationScore,
		a.IsVerified,
	).Scan(
		&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert participant: %w", err)
	}

	var result models.AgentIdentity
	result.Participant = p

	err = tx.QueryRow(ctx, `
		INSERT INTO agent_identities
		  (participant_id, owner_id, model_provider, model_name, model_version,
		   capabilities, max_rpm, protocol_type, agent_url, heartbeat_interval, last_seen_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8, NULLIF($9, ''), $10, $11)
		RETURNING
		  owner_id, model_provider, model_name,
		  COALESCE(model_version, '') as model_version,
		  capabilities, max_rpm, protocol_type,
		  COALESCE(agent_url, '') as agent_url,
		  heartbeat_interval, last_seen_at`,
		p.ID,
		a.OwnerID,
		a.ModelProvider,
		a.ModelName,
		a.ModelVersion,
		a.Capabilities,
		a.MaxRPM,
		a.ProtocolType,
		a.AgentURL,
		a.HeartbeatInterval,
		a.LastSeenAt,
	).Scan(
		&result.OwnerID, &result.ModelProvider, &result.ModelName, &result.ModelVersion,
		&result.Capabilities, &result.MaxRPM, &result.ProtocolType,
		&result.AgentURL, &result.HeartbeatInterval, &result.LastSeenAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert agent_identity: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &result, nil
}

// GetByID returns the base participant record for the given UUID.
func (r *ParticipantRepo) GetByID(ctx context.Context, id string) (*models.Participant, error) {
	var p models.Participant
	err := r.pool.QueryRow(ctx, `
		SELECT id, type, display_name,
		       COALESCE(avatar_url, '') as avatar_url,
		       COALESCE(bio, '') as bio,
		       trust_score, reputation_score, is_verified, created_at, updated_at
		FROM participants
		WHERE id = $1`,
		id,
	).Scan(
		&p.ID, &p.Type, &p.DisplayName, &p.AvatarURL, &p.Bio,
		&p.TrustScore, &p.ReputationScore, &p.IsVerified, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get participant by id: %w", err)
	}
	return &p, nil
}

// GetHumanByEmail returns a HumanUser by joining participants + human_users on email.
func (r *ParticipantRepo) GetHumanByEmail(ctx context.Context, email string) (*models.HumanUser, error) {
	var h models.HumanUser
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.type, p.display_name,
		       COALESCE(p.avatar_url, '') as avatar_url,
		       COALESCE(p.bio, '') as bio,
		       p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at,
		       hu.email, hu.password_hash,
		       COALESCE(hu.oauth_provider, '') as oauth_provider,
		       COALESCE(hu.preferred_language, '') as preferred_language,
		       COALESCE(hu.notification_prefs::text, '{}') as notification_prefs
		FROM participants p
		JOIN human_users hu ON hu.participant_id = p.id
		WHERE hu.email = $1`,
		email,
	).Scan(
		&h.ID, &h.Type, &h.DisplayName, &h.AvatarURL, &h.Bio,
		&h.TrustScore, &h.ReputationScore, &h.IsVerified, &h.CreatedAt, &h.UpdatedAt,
		&h.Email, &h.PasswordHash, &h.OAuthProvider, &h.PreferredLanguage, &h.NotificationPrefs,
	)
	if err != nil {
		return nil, fmt.Errorf("get human by email: %w", err)
	}
	return &h, nil
}

// GetAgentByID returns an AgentIdentity by joining participants + agent_identities on UUID.
func (r *ParticipantRepo) GetAgentByID(ctx context.Context, id string) (*models.AgentIdentity, error) {
	var a models.AgentIdentity
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.type, p.display_name,
		       COALESCE(p.avatar_url, '') as avatar_url,
		       COALESCE(p.bio, '') as bio,
		       p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at,
		       ai.owner_id, ai.model_provider, ai.model_name,
		       COALESCE(ai.model_version, '') as model_version,
		       ai.capabilities, ai.max_rpm, ai.protocol_type,
		       COALESCE(ai.agent_url, '') as agent_url,
		       ai.heartbeat_interval, ai.last_seen_at
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE p.id = $1`,
		id,
	).Scan(
		&a.ID, &a.Type, &a.DisplayName, &a.AvatarURL, &a.Bio,
		&a.TrustScore, &a.ReputationScore, &a.IsVerified, &a.CreatedAt, &a.UpdatedAt,
		&a.OwnerID, &a.ModelProvider, &a.ModelName, &a.ModelVersion,
		&a.Capabilities, &a.MaxRPM, &a.ProtocolType, &a.AgentURL,
		&a.HeartbeatInterval, &a.LastSeenAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get agent by id: %w", err)
	}
	return &a, nil
}

// ListAgentsByOwner returns all agent identities owned by the given participant UUID.
func (r *ParticipantRepo) ListAgentsByOwner(ctx context.Context, ownerID string) ([]models.AgentIdentity, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.type, p.display_name,
		       COALESCE(p.avatar_url, '') as avatar_url,
		       COALESCE(p.bio, '') as bio,
		       p.trust_score, p.reputation_score, p.is_verified, p.created_at, p.updated_at,
		       ai.owner_id, ai.model_provider, ai.model_name,
		       COALESCE(ai.model_version, '') as model_version,
		       ai.capabilities, ai.max_rpm, ai.protocol_type,
		       COALESCE(ai.agent_url, '') as agent_url,
		       ai.heartbeat_interval, ai.last_seen_at
		FROM participants p
		JOIN agent_identities ai ON ai.participant_id = p.id
		WHERE ai.owner_id = $1
		ORDER BY p.created_at DESC`,
		ownerID,
	)
	if err != nil {
		return nil, fmt.Errorf("list agents by owner: %w", err)
	}
	defer rows.Close()

	var agents []models.AgentIdentity
	for rows.Next() {
		var a models.AgentIdentity
		if err := rows.Scan(
			&a.ID, &a.Type, &a.DisplayName, &a.AvatarURL, &a.Bio,
			&a.TrustScore, &a.ReputationScore, &a.IsVerified, &a.CreatedAt, &a.UpdatedAt,
			&a.OwnerID, &a.ModelProvider, &a.ModelName, &a.ModelVersion,
			&a.Capabilities, &a.MaxRPM, &a.ProtocolType, &a.AgentURL,
			&a.HeartbeatInterval, &a.LastSeenAt,
		); err != nil {
			return nil, fmt.Errorf("scanning agent row: %w", err)
		}
		agents = append(agents, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating agent rows: %w", err)
	}

	return agents, nil
}
