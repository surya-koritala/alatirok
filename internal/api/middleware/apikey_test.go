package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// setupAPIKeyTestFixtures creates a human owner, an agent, and a hashed API key in the DB.
// It returns the plaintext key and the agent ID.
func setupAPIKeyTestFixtures(t *testing.T, suffix string) (plainKey string, agentID string, keyRepo *repository.APIKeyRepo) {
	t.Helper()

	pool := database.TestPool(t)
	database.CleanupTables(t, pool,
		"api_keys", "provenances", "agent_identities", "human_users", "posts", "communities", "participants",
	)

	pRepo := repository.NewParticipantRepo(pool)
	keyRepo = repository.NewAPIKeyRepo(pool)
	ctx := context.Background()

	// Create a human owner
	owner := &models.HumanUser{
		Participant: models.Participant{
			DisplayName: "Owner " + suffix,
		},
		Email:             "owner-" + suffix + "@example.com",
		PasswordHash:      "somehash",
		PreferredLanguage: "en",
		NotificationPrefs: "{}",
	}
	ownerParticipant, err := pRepo.CreateHuman(ctx, owner)
	if err != nil {
		t.Fatalf("CreateHuman: %v", err)
	}

	// Create an agent owned by that human
	agent := &models.AgentIdentity{
		Participant: models.Participant{
			DisplayName: "Agent " + suffix,
		},
		OwnerID:           ownerParticipant.ID,
		ModelProvider:     "openai",
		ModelName:         "gpt-4",
		MaxRPM:            60,
		ProtocolType:      models.ProtocolREST,
		HeartbeatInterval: 300,
		Capabilities:      []string{"read"},
	}
	createdAgent, err := pRepo.CreateAgent(ctx, agent)
	if err != nil {
		t.Fatalf("CreateAgent: %v", err)
	}

	// Generate API key
	plain, hash, err := auth.GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey: %v", err)
	}

	k := &models.APIKey{
		AgentID:   createdAgent.ID,
		KeyHash:   hash,
		Scopes:    []string{"read"},
		RateLimit: 60,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		IsActive:  true,
	}
	if _, err := keyRepo.Create(ctx, k); err != nil {
		t.Fatalf("APIKeyRepo.Create: %v", err)
	}

	return plain, createdAgent.ID, keyRepo
}

func TestAPIKeyAuth_ValidKey(t *testing.T) {
	plainKey, agentID, keyRepo := setupAPIKeyTestFixtures(t, "valid")

	var gotClaims *auth.Claims
	handler := middleware.APIKeyAuth(keyRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotClaims = middleware.GetClaims(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-API-Key", plainKey)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}
	if gotClaims == nil {
		t.Fatal("expected claims in context, got nil")
	}
	if gotClaims.ParticipantID != agentID {
		t.Errorf("expected ParticipantID %q, got %q", agentID, gotClaims.ParticipantID)
	}
	if gotClaims.ParticipantType != "agent" {
		t.Errorf("expected ParticipantType 'agent', got %q", gotClaims.ParticipantType)
	}
}

func TestAPIKeyAuth_InvalidKey(t *testing.T) {
	_, _, keyRepo := setupAPIKeyTestFixtures(t, "invalid")

	handlerCalled := false
	handler := middleware.APIKeyAuth(keyRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-API-Key", "ak_wrongkeyvalue")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rr.Code)
	}
	if handlerCalled {
		t.Error("expected handler NOT to be called on invalid key")
	}
}

func TestAPIKeyAuth_MissingHeader(t *testing.T) {
	_, _, keyRepo := setupAPIKeyTestFixtures(t, "missing")

	handlerCalled := false
	var gotClaims *auth.Claims
	handler := middleware.APIKeyAuth(keyRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		gotClaims = middleware.GetClaims(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	// No X-API-Key header set
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200 (pass through), got %d", rr.Code)
	}
	if !handlerCalled {
		t.Error("expected handler to be called when header is missing")
	}
	if gotClaims != nil {
		t.Error("expected no claims in context when header is missing")
	}
}

func TestAPIKeyAuth_ExpiredKey(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool,
		"api_keys", "provenances", "agent_identities", "human_users", "posts", "communities", "participants",
	)

	pRepo := repository.NewParticipantRepo(pool)
	keyRepo := repository.NewAPIKeyRepo(pool)
	ctx := context.Background()

	// Create owner and agent
	owner := &models.HumanUser{
		Participant: models.Participant{
			DisplayName: "Owner expired",
		},
		Email:             "owner-expired@example.com",
		PasswordHash:      "somehash",
		PreferredLanguage: "en",
		NotificationPrefs: "{}",
	}
	ownerParticipant, err := pRepo.CreateHuman(ctx, owner)
	if err != nil {
		t.Fatalf("CreateHuman: %v", err)
	}

	agent := &models.AgentIdentity{
		Participant: models.Participant{
			DisplayName: "Agent expired",
		},
		OwnerID:           ownerParticipant.ID,
		ModelProvider:     "openai",
		ModelName:         "gpt-4",
		MaxRPM:            60,
		ProtocolType:      models.ProtocolREST,
		HeartbeatInterval: 300,
		Capabilities:      []string{"read"},
	}
	createdAgent, err := pRepo.CreateAgent(ctx, agent)
	if err != nil {
		t.Fatalf("CreateAgent: %v", err)
	}

	// Generate API key with a past expiry
	plain, hash, err := auth.GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey: %v", err)
	}

	k := &models.APIKey{
		AgentID:   createdAgent.ID,
		KeyHash:   hash,
		Scopes:    []string{"read"},
		RateLimit: 60,
		ExpiresAt: time.Now().Add(-1 * time.Hour), // already expired
		IsActive:  true,
	}
	if _, err := keyRepo.Create(ctx, k); err != nil {
		t.Fatalf("APIKeyRepo.Create: %v", err)
	}

	handlerCalled := false
	handler := middleware.APIKeyAuth(keyRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-API-Key", plain)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401 for expired key, got %d", rr.Code)
	}
	if handlerCalled {
		t.Error("expected handler NOT to be called for expired key")
	}
}
