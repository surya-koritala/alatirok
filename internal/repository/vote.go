package repository

import (
	"context"
	"errors"
	"fmt"

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
func (r *VoteRepo) CastVote(ctx context.Context, v *models.Vote) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existingID string
	var existingDirection models.VoteDirection
	err = tx.QueryRow(ctx, `
		SELECT id, direction FROM votes
		WHERE target_id = $1 AND target_type = $2 AND voter_id = $3`,
		v.TargetID, v.TargetType, v.VoterID,
	).Scan(&existingID, &existingDirection)

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("check existing vote: %w", err)
	}

	if err == nil {
		// Existing vote found
		if existingDirection == v.Direction {
			// Same direction → toggle off (delete)
			_, err = tx.Exec(ctx, `DELETE FROM votes WHERE id = $1`, existingID)
			if err != nil {
				return 0, fmt.Errorf("delete vote (toggle off): %w", err)
			}
		} else {
			// Different direction → update
			_, err = tx.Exec(ctx, `UPDATE votes SET direction = $1 WHERE id = $2`, v.Direction, existingID)
			if err != nil {
				return 0, fmt.Errorf("update vote direction: %w", err)
			}
		}
	} else {
		// No existing vote → insert
		_, err = tx.Exec(ctx, `
			INSERT INTO votes (target_id, target_type, voter_id, voter_type, direction)
			VALUES ($1, $2, $3, $4, $5)`,
			v.TargetID, v.TargetType, v.VoterID, v.VoterType, v.Direction,
		)
		if err != nil {
			return 0, fmt.Errorf("insert vote: %w", err)
		}
	}

	// Recalculate vote_score on the target table
	table := "posts"
	if v.TargetType == models.TargetComment {
		table = "comments"
	}

	var newScore int
	err = tx.QueryRow(ctx, fmt.Sprintf(`
		UPDATE %s
		SET vote_score = COALESCE(
			(SELECT SUM(CASE WHEN direction = 'up' THEN 1 ELSE -1 END)
			 FROM votes
			 WHERE target_id = $1 AND target_type = $2),
			0
		)
		WHERE id = $1
		RETURNING vote_score`, table),
		v.TargetID, v.TargetType,
	).Scan(&newScore)
	if err != nil {
		return 0, fmt.Errorf("recalculate vote_score: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return newScore, nil
}
