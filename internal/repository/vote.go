package repository

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/models"
)

// VoteRepo handles database operations for votes.
type VoteRepo struct {
	pool *pgxpool.Pool
}

// NewVoteRepo creates a new VoteRepo.
func NewVoteRepo(pool *pgxpool.Pool) *VoteRepo {
	return &VoteRepo{pool: pool}
}

// CastVote casts, toggles, or changes a vote in a transaction.
// Returns the new vote_score of the target.
//
// Logic:
//   - If an existing vote with the same direction exists → DELETE (toggle off)
//   - If an existing vote with a different direction exists → UPDATE direction
//   - If no existing vote → INSERT new vote
//
// After mutation, recalculates and updates vote_score on the target post or comment.
//
// Optimised: uses a single SELECT FOR UPDATE + conditional DML + score update
// (3 queries in a transaction, down from 4+).
func (r *VoteRepo) CastVote(ctx context.Context, v *models.Vote) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Step 1: Lookup existing vote (SELECT FOR UPDATE to prevent races)
	var existingID string
	var existingDirection models.VoteDirection
	err = tx.QueryRow(ctx, `
		SELECT id, direction FROM votes
		WHERE target_id = $1 AND target_type = $2 AND voter_id = $3
		FOR UPDATE`,
		v.TargetID, v.TargetType, v.VoterID,
	).Scan(&existingID, &existingDirection)

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("check existing vote: %w", err)
	}

	// Step 2: Mutate vote — one of delete / update / insert
	if err == nil {
		if existingDirection == v.Direction {
			_, err = tx.Exec(ctx, `DELETE FROM votes WHERE id = $1`, existingID)
			if err != nil {
				return 0, fmt.Errorf("delete vote (toggle off): %w", err)
			}
		} else {
			_, err = tx.Exec(ctx, `UPDATE votes SET direction = $1 WHERE id = $2`, v.Direction, existingID)
			if err != nil {
				return 0, fmt.Errorf("update vote direction: %w", err)
			}
		}
	} else {
		_, err = tx.Exec(ctx, `
			INSERT INTO votes (target_id, target_type, voter_id, voter_type, direction)
			VALUES ($1, $2, $3, $4, $5)`,
			v.TargetID, v.TargetType, v.VoterID, v.VoterType, v.Direction,
		)
		if err != nil {
			return 0, fmt.Errorf("insert vote: %w", err)
		}
	}

	// Step 3: Recalculate vote_score + Wilson counts in a single query for comments,
	// or just vote_score for posts.
	table := "posts"
	if v.TargetType == models.TargetComment {
		table = "comments"
	}

	var newScore int
	if v.TargetType == models.TargetComment {
		// Combined: vote_score + upvote_count + downvote_count in one UPDATE
		err = tx.QueryRow(ctx, `
			UPDATE comments
			SET vote_score = COALESCE(
				(SELECT SUM(CASE WHEN direction = 'up' THEN 1 ELSE -1 END)
				 FROM votes WHERE target_id = $1 AND target_type = $2), 0),
			    upvote_count = (SELECT COUNT(*) FROM votes WHERE target_id = $1 AND target_type = 'comment' AND direction = 'up'),
			    downvote_count = (SELECT COUNT(*) FROM votes WHERE target_id = $1 AND target_type = 'comment' AND direction = 'down')
			WHERE id = $1
			RETURNING vote_score`,
			v.TargetID, v.TargetType,
		).Scan(&newScore)
	} else {
		err = tx.QueryRow(ctx, fmt.Sprintf(`
			UPDATE %s
			SET vote_score = COALESCE(
				(SELECT SUM(CASE WHEN direction = 'up' THEN 1 ELSE -1 END)
				 FROM votes WHERE target_id = $1 AND target_type = $2), 0)
			WHERE id = $1
			RETURNING vote_score`, table),
			v.TargetID, v.TargetType,
		).Scan(&newScore)
	}
	if err != nil {
		return 0, fmt.Errorf("recalculate vote_score: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return newScore, nil
}

// CastWithReputation performs the vote and reputation update in a single transaction.
// This merges the previously separate vote + reputation flows (2 transactions, 7+ queries)
// into a single transaction (5 queries). If authorID is empty or equals the voter, the
// reputation step is skipped.
// Also awards a small trust bump (+0.1) to the voter for community participation (Bug 6 fix).
func (r *VoteRepo) CastWithReputation(ctx context.Context, v *models.Vote, authorID, eventType string, scoreDelta float64) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Step 1: Lookup existing vote (SELECT FOR UPDATE to prevent races)
	var existingID string
	var existingDirection models.VoteDirection
	err = tx.QueryRow(ctx, `
		SELECT id, direction FROM votes
		WHERE target_id = $1 AND target_type = $2 AND voter_id = $3
		FOR UPDATE`,
		v.TargetID, v.TargetType, v.VoterID,
	).Scan(&existingID, &existingDirection)

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("check existing vote: %w", err)
	}

	// Step 2: Mutate vote — one of delete / update / insert
	if err == nil {
		if existingDirection == v.Direction {
			_, err = tx.Exec(ctx, `DELETE FROM votes WHERE id = $1`, existingID)
			if err != nil {
				return 0, fmt.Errorf("delete vote (toggle off): %w", err)
			}
		} else {
			_, err = tx.Exec(ctx, `UPDATE votes SET direction = $1 WHERE id = $2`, v.Direction, existingID)
			if err != nil {
				return 0, fmt.Errorf("update vote direction: %w", err)
			}
		}
	} else {
		_, err = tx.Exec(ctx, `
			INSERT INTO votes (target_id, target_type, voter_id, voter_type, direction)
			VALUES ($1, $2, $3, $4, $5)`,
			v.TargetID, v.TargetType, v.VoterID, v.VoterType, v.Direction,
		)
		if err != nil {
			return 0, fmt.Errorf("insert vote: %w", err)
		}
	}

	// Step 3: Recalculate vote_score
	table := "posts"
	if v.TargetType == models.TargetComment {
		table = "comments"
	}

	var newScore int
	if v.TargetType == models.TargetComment {
		err = tx.QueryRow(ctx, `
			UPDATE comments
			SET vote_score = COALESCE(
				(SELECT SUM(CASE WHEN direction = 'up' THEN 1 ELSE -1 END)
				 FROM votes WHERE target_id = $1 AND target_type = $2), 0),
			    upvote_count = (SELECT COUNT(*) FROM votes WHERE target_id = $1 AND target_type = 'comment' AND direction = 'up'),
			    downvote_count = (SELECT COUNT(*) FROM votes WHERE target_id = $1 AND target_type = 'comment' AND direction = 'down')
			WHERE id = $1
			RETURNING vote_score`,
			v.TargetID, v.TargetType,
		).Scan(&newScore)
	} else {
		err = tx.QueryRow(ctx, fmt.Sprintf(`
			UPDATE %s
			SET vote_score = COALESCE(
				(SELECT SUM(CASE WHEN direction = 'up' THEN 1 ELSE -1 END)
				 FROM votes WHERE target_id = $1 AND target_type = $2), 0)
			WHERE id = $1
			RETURNING vote_score`, table),
			v.TargetID, v.TargetType,
		).Scan(&newScore)
	}
	if err != nil {
		return 0, fmt.Errorf("recalculate vote_score: %w", err)
	}

	// Step 4 & 5: Reputation update (if author is known and not the voter)
	if authorID != "" && authorID != v.VoterID {
		_, err = tx.Exec(ctx,
			`INSERT INTO reputation_events (participant_id, event_type, score_delta)
			 VALUES ($1, $2, $3)`,
			authorID, eventType, scoreDelta)
		if err != nil {
			return 0, fmt.Errorf("insert reputation event: %w", err)
		}

		var totalDelta float64
		err = tx.QueryRow(ctx,
			`SELECT COALESCE(SUM(score_delta), 0) FROM reputation_events WHERE participant_id = $1`,
			authorID).Scan(&totalDelta)
		if err != nil {
			return 0, fmt.Errorf("sum deltas: %w", err)
		}

		newTrust := math.Max(0, math.Min(100, 10.0+totalDelta))
		_, err = tx.Exec(ctx,
			`UPDATE participants SET trust_score = $1 WHERE id = $2`,
			newTrust, authorID)
		if err != nil {
			return 0, fmt.Errorf("update trust score: %w", err)
		}
	}

	// Step 6: Voter participation bonus — small trust bump for the voter.
	// This ensures humans (and agents) who actively vote build trust over time (Bug 6 fix).
	if v.Direction == models.VoteUp {
		_, err = tx.Exec(ctx,
			`INSERT INTO reputation_events (participant_id, event_type, score_delta)
			 VALUES ($1, 'vote_cast', 0.1)`,
			v.VoterID)
		if err != nil {
			return 0, fmt.Errorf("insert voter reputation event: %w", err)
		}

		var voterDelta float64
		err = tx.QueryRow(ctx,
			`SELECT COALESCE(SUM(score_delta), 0) FROM reputation_events WHERE participant_id = $1`,
			v.VoterID).Scan(&voterDelta)
		if err != nil {
			return 0, fmt.Errorf("sum voter deltas: %w", err)
		}

		voterTrust := math.Max(0, math.Min(100, 10.0+voterDelta))
		_, err = tx.Exec(ctx,
			`UPDATE participants SET trust_score = $1 WHERE id = $2`,
			voterTrust, v.VoterID)
		if err != nil {
			return 0, fmt.Errorf("update voter trust score: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return newScore, nil
}
