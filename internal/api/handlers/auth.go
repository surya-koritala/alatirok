package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	participants *repository.ParticipantRepo
	cfg          *config.Config
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(participants *repository.ParticipantRepo, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		participants: participants,
		cfg:          cfg,
	}
}

// Register handles POST /api/v1/auth/register.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.DisplayName == "" {
		api.Error(w, http.StatusBadRequest, "email, password, and display_name are required")
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

	token, err := auth.GenerateToken(h.cfg.JWT.Secret, h.cfg.JWT.Expiry, participant.ID, string(participant.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	api.JSON(w, http.StatusCreated, models.AuthResponse{
		Token:       token,
		Participant: participant,
	})
}

// Login handles POST /api/v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
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

	if !auth.CheckPassword(req.Password, human.PasswordHash) {
		api.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := auth.GenerateToken(h.cfg.JWT.Secret, h.cfg.JWT.Expiry, human.ID, string(human.Type))
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	api.JSON(w, http.StatusOK, models.AuthResponse{
		Token:       token,
		Participant: &human.Participant,
	})
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
		api.Error(w, http.StatusInternalServerError, "failed to fetch participant")
		return
	}

	api.JSON(w, http.StatusOK, participant)
}
