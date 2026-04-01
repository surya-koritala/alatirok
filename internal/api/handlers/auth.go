package handlers

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/ratelimit"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// Per-endpoint rate limiters for auth:
//   - Register: 5 per hour per IP (prevents signup spam)
//   - Login:    10 per minute per IP (supplements per-account lockout)
var (
	registerLimiter = ratelimit.New(5, time.Hour)
	loginLimiter    = ratelimit.New(10, time.Minute)
)

// ClientIP extracts the client IP from X-Forwarded-For (set by load balancers/proxies)
// with a fallback to RemoteAddr.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can be comma-separated; take the first (client) IP
		if idx := strings.Index(xff, ","); idx != -1 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	return r.RemoteAddr
}

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	participants  *repository.ParticipantRepo
	refreshTokens *repository.RefreshTokenRepo
	pool          *pgxpool.Pool
	cfg           *config.Config
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(participants *repository.ParticipantRepo, refreshTokens *repository.RefreshTokenRepo, pool *pgxpool.Pool, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		participants:  participants,
		refreshTokens: refreshTokens,
		pool:          pool,
		cfg:           cfg,
	}
}

// Register handles POST /api/v1/auth/register.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	ip := ClientIP(r)
	remaining := registerLimiter.Remaining(ip)
	w.Header().Set("X-RateLimit-Limit", "5")
	w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
	if !registerLimiter.Allow(ip) {
		api.Error(w, http.StatusTooManyRequests, "too many registration attempts, try again later")
		return
	}

	var req models.RegisterRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.DisplayName == "" {
		api.Error(w, http.StatusBadRequest, "email, password, and display_name are required")
		return
	}

	if len(req.Password) < 8 {
		api.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	if len(req.Password) > 128 {
		api.Error(w, http.StatusBadRequest, "password too long")
		return
	}

	if err := api.ValidateEmail(req.Email); err != nil {
		api.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.DisplayName) > 100 {
		api.Error(w, http.StatusBadRequest, "display_name exceeds 100 character limit")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	human := &models.HumanUser{
		Participant: models.Participant{
			DisplayName: req.DisplayName,
		},
		Email:        req.Email,
		PasswordHash: hash,
	}

	participant, err := h.participants.CreateHuman(r.Context(), human)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			api.Error(w, http.StatusConflict, "email already registered")
			return
		}
		slog.Error("failed to create account", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to create account")
		return
	}

	// Generate short-lived access token (15min)
	accessToken, err := auth.GenerateToken(h.cfg.JWT.Secret, 15*time.Minute, participant.ID, string(participant.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// Generate refresh token
	refreshPlain, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	// Store refresh token hash in DB
	if err := h.refreshTokens.Create(r.Context(), participant.ID, refreshHash, time.Now().Add(7*24*time.Hour)); err != nil {
		slog.Error("failed to store refresh token", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	api.JSON(w, http.StatusCreated, models.AuthResponse{
		Token:        accessToken,
		AccessToken:  accessToken,
		RefreshToken: refreshPlain,
		ExpiresIn:    900, // 15 minutes in seconds
		Participant:  participant,
	})
}

// Login handles POST /api/v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ip := ClientIP(r)
	remaining := loginLimiter.Remaining(ip)
	w.Header().Set("X-RateLimit-Limit", "10")
	w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
	if !loginLimiter.Allow(ip) {
		api.Error(w, http.StatusTooManyRequests, "too many login attempts, try again later")
		return
	}

	var req models.LoginRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	human, err := h.participants.GetHumanByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		api.Error(w, http.StatusInternalServerError, "failed to look up account")
		return
	}

	// Check if account is locked
	if human.LockedUntil != nil && human.LockedUntil.After(time.Now()) {
		api.Error(w, http.StatusTooManyRequests, "account temporarily locked, try again later")
		return
	}

	if !auth.CheckPassword(req.Password, human.PasswordHash) {
		// Increment failed login count; lock after 5 failures
		_, _ = h.pool.Exec(r.Context(), `
			UPDATE human_users SET failed_login_count = failed_login_count + 1,
			    locked_until = CASE WHEN failed_login_count >= 4 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
			WHERE participant_id = $1`, human.ID)
		api.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Successful login: reset failed login count, update last_login_at
	_, _ = h.pool.Exec(r.Context(), `
		UPDATE human_users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW()
		WHERE participant_id = $1`, human.ID)

	// Generate short-lived access token (15min)
	accessToken, err := auth.GenerateToken(h.cfg.JWT.Secret, 15*time.Minute, human.ID, string(human.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// Generate refresh token
	refreshPlain, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	// Store refresh token hash in DB
	if err := h.refreshTokens.Create(r.Context(), human.ID, refreshHash, time.Now().Add(7*24*time.Hour)); err != nil {
		slog.Error("failed to store refresh token", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	api.JSON(w, http.StatusOK, models.AuthResponse{
		Token:        accessToken,
		AccessToken:  accessToken,
		RefreshToken: refreshPlain,
		ExpiresIn:    900, // 15 minutes in seconds
		Participant:  &human.Participant,
	})
}

// Refresh handles POST /api/v1/auth/refresh.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	ip := ClientIP(r)
	remaining := loginLimiter.Remaining(ip)
	w.Header().Set("X-RateLimit-Limit", "10")
	w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
	if !loginLimiter.Allow(ip) {
		api.Error(w, http.StatusTooManyRequests, "too many authentication attempts, try again later")
		return
	}

	var req models.RefreshRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RefreshToken == "" {
		api.Error(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	// Find all valid (non-revoked, non-expired) tokens
	tokens, err := h.refreshTokens.FindAllValid(r.Context())
	if err != nil {
		slog.Error("failed to look up refresh tokens", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to validate refresh token")
		return
	}

	// Compare refresh_token with each hash using bcrypt
	var matched *models.RefreshToken
	for i := range tokens {
		if bcrypt.CompareHashAndPassword([]byte(tokens[i].TokenHash), []byte(req.RefreshToken)) == nil {
			matched = &tokens[i]
			break
		}
	}

	if matched == nil {
		api.Error(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	// Look up participant to get their type
	participant, err := h.participants.GetByID(r.Context(), matched.ParticipantID)
	if err != nil {
		slog.Error("failed to fetch participant for refresh", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to refresh token")
		return
	}

	// Generate new access token
	accessToken, err := auth.GenerateToken(h.cfg.JWT.Secret, 15*time.Minute, participant.ID, string(participant.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	api.JSON(w, http.StatusOK, map[string]any{
		"access_token": accessToken,
		"token":        accessToken,
		"expires_in":   900,
	})
}

// Logout handles POST /api/v1/auth/logout (requires auth).
// Revokes all refresh tokens for the authenticated participant.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "missing auth claims")
		return
	}

	if err := h.refreshTokens.RevokeAll(r.Context(), claims.ParticipantID); err != nil {
		slog.Error("failed to revoke refresh tokens", "error", err, "participant_id", claims.ParticipantID)
		api.Error(w, http.StatusInternalServerError, "failed to logout")
		return
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

// Me handles GET /api/v1/auth/me (requires auth middleware).
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "missing auth claims")
		return
	}

	participant, err := h.participants.GetByID(r.Context(), claims.ParticipantID)
	if err != nil {
		slog.Error("failed to fetch participant", "error", err, "participant_id", claims.ParticipantID)
		api.Error(w, http.StatusInternalServerError, "failed to fetch participant")
		return
	}

	api.JSON(w, http.StatusOK, participant)
}
