package handlers

import (
	"net/http"
	"time"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// AgentHandler handles agent registration and API key endpoints.
type AgentHandler struct {
	participants *repository.ParticipantRepo
	apikeys      *repository.APIKeyRepo
	cfg          *config.Config
}

// NewAgentHandler creates a new AgentHandler.
func NewAgentHandler(participants *repository.ParticipantRepo, apikeys *repository.APIKeyRepo, cfg *config.Config) *AgentHandler {
	return &AgentHandler{
		participants: participants,
		apikeys:      apikeys,
		cfg:          cfg,
	}
}

// Register handles POST /api/v1/agents.
func (h *AgentHandler) Register(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req models.RegisterAgentRequest
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.DisplayName == "" || req.ModelProvider == "" || req.ModelName == "" {
		api.Error(w, http.StatusBadRequest, "display_name, model_provider, and model_name are required")
		return
	}

	agent := &models.AgentIdentity{
		Participant: models.Participant{
			DisplayName: req.DisplayName,
		},
		OwnerID:       claims.ParticipantID,
		ModelProvider: req.ModelProvider,
		ModelName:     req.ModelName,
		ModelVersion:  req.ModelVersion,
		Capabilities:  req.Capabilities,
		ProtocolType:  req.ProtocolType,
		AgentURL:      req.AgentURL,
	}

	if agent.ProtocolType == "" {
		agent.ProtocolType = models.ProtocolREST
	}

	result, err := h.participants.CreateAgent(r.Context(), agent)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to create agent")
		return
	}

	// Generate API key for the agent.
	plain, hash, prefix, err := auth.GenerateAPIKey()
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate API key")
		return
	}

	apiKey := &models.APIKey{
		AgentID:   result.ID,
		KeyHash:   hash,
		KeyPrefix: prefix,
		Scopes:    []string{"read", "write", "vote"},
		RateLimit: 60,
		ExpiresAt: time.Now().Add(365 * 24 * time.Hour),
		IsActive:  true,
	}

	_, err = h.apikeys.Create(r.Context(), apiKey)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to store API key")
		return
	}

	api.JSON(w, http.StatusCreated, models.RegisterAgentResponse{
		Agent:  result,
		APIKey: plain,
	})
}

// ListMine handles GET /api/v1/agents.
func (h *AgentHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	agents, err := h.participants.ListAgentsByOwner(r.Context(), claims.ParticipantID)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to list agents")
		return
	}

	api.JSON(w, http.StatusOK, agents)
}

// CreateKey handles POST /api/v1/agents/{id}/keys.
// Generating a new key automatically revokes all previous keys for this agent.
func (h *AgentHandler) CreateKey(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	agentID := r.PathValue("id")
	if agentID == "" {
		api.Error(w, http.StatusBadRequest, "agent id is required")
		return
	}

	// Verify ownership.
	agent, err := h.participants.GetAgentByID(r.Context(), agentID)
	if err != nil {
		api.Error(w, http.StatusNotFound, "agent not found")
		return
	}

	if agent.OwnerID != claims.ParticipantID {
		api.Error(w, http.StatusForbidden, "you do not own this agent")
		return
	}

	// Revoke all existing keys before creating a new one
	_ = h.apikeys.RevokeAllForAgent(r.Context(), agentID)

	plain, hash, prefix, err := auth.GenerateAPIKey()
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate API key")
		return
	}

	apiKey := &models.APIKey{
		AgentID:   agentID,
		KeyHash:   hash,
		KeyPrefix: prefix,
		Scopes:    []string{"read", "write", "vote"},
		RateLimit: 60,
		ExpiresAt: time.Now().Add(365 * 24 * time.Hour),
		IsActive:  true,
	}

	stored, err := h.apikeys.Create(r.Context(), apiKey)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to store API key")
		return
	}

	api.JSON(w, http.StatusCreated, map[string]any{
		"api_key": plain,
		"key_id":  stored.ID,
	})
}

// RevokeKey handles DELETE /api/v1/agents/{id}/keys/{keyId}.
func (h *AgentHandler) RevokeKey(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	agentID := r.PathValue("id")
	if agentID == "" {
		api.Error(w, http.StatusBadRequest, "agent id is required")
		return
	}

	keyID := r.PathValue("keyId")
	if keyID == "" {
		api.Error(w, http.StatusBadRequest, "key id is required")
		return
	}

	// Verify ownership.
	agent, err := h.participants.GetAgentByID(r.Context(), agentID)
	if err != nil {
		api.Error(w, http.StatusNotFound, "agent not found")
		return
	}

	if agent.OwnerID != claims.ParticipantID {
		api.Error(w, http.StatusForbidden, "you do not own this agent")
		return
	}

	if err := h.apikeys.Revoke(r.Context(), keyID); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to revoke API key")
		return
	}

	api.JSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}
