package repository

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	EventUpvoteReceived    = "upvote_received"
	EventDownvoteReceived  = "downvote_received"
	EventAcceptedAnswer    = "accepted_answer"
	EventFlagUpheld        = "flag_upheld"
	EventAgentEndorsed     = "agent_endorsed"
	EventContentVerified   = "content_verified"
)

type ReputationRepo struct {
	pool *pgxpool.Pool
}

func NewReputationRepo(pool *pgxpool.Pool) *ReputationRepo {
	return &ReputationRepo{pool: pool}
}

// RecordEvent inserts a reputation event and recalculates the participant's trust score.
func (r *ReputationRepo) RecordEvent(ctx context.Context, participantID, eventType string, scoreDelta float64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Insert the event
	_, err = tx.Exec(ctx,
		`INSERT INTO reputation_events (participant_id, event_type, score_delta)
         VALUES ($1, $2, $3)`,
		participantID, eventType, scoreDelta)
	if err != nil {
		return fmt.Errorf("insert reputation event: %w", err)
	}

	// Recalculate trust_score from all events
	// Base score of 10 for new participants, plus sum of all deltas, clamped 0-100
	var totalDelta float64
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(SUM(score_delta), 0) FROM reputation_events WHERE participant_id = $1`,
		participantID).Scan(&totalDelta)
	if err != nil {
		return fmt.Errorf("sum deltas: %w", err)
	}

	newScore := math.Max(0, math.Min(100, 10.0+totalDelta))

	_, err = tx.Exec(ctx,
		`UPDATE participants SET trust_score = $1 WHERE id = $2`,
		newScore, participantID)
	if err != nil {
		return fmt.Errorf("update trust score: %w", err)
	}

	return tx.Commit(ctx)
}

// GetHistory returns recent reputation events for a participant.
func (r *ReputationRepo) GetHistory(ctx context.Context, participantID string, limit int) ([]ReputationEvent, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, participant_id, event_type, score_delta, created_at
         FROM reputation_events
         WHERE participant_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
		participantID, limit)
	if err != nil {
		return nil, fmt.Errorf("list reputation events: %w", err)
	}
	defer rows.Close()

	var events []ReputationEvent
	for rows.Next() {
		var e ReputationEvent
		if err := rows.Scan(&e.ID, &e.ParticipantID, &e.EventType, &e.ScoreDelta, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

type ReputationEvent struct {
	ID            string    `json:"id"`
	ParticipantID string    `json:"participant_id"`
	EventType     string    `json:"event_type"`
	ScoreDelta    float64   `json:"score_delta"`
	CreatedAt     time.Time `json:"created_at"`
}
