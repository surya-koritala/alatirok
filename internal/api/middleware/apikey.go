package middleware

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// apiKeyCache caches validated API key → claims for 5 minutes.
// Avoids re-fetching all keys + bcrypt comparison on every request.
type apiKeyCache struct {
	mu      sync.RWMutex
	entries map[string]apiKeyCacheEntry
}

type apiKeyCacheEntry struct {
	claims    *auth.Claims
	expiresAt time.Time
}

func newAPIKeyCache() *apiKeyCache {
	c := &apiKeyCache{entries: make(map[string]apiKeyCacheEntry)}
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			c.mu.Lock()
			now := time.Now()
			for k, e := range c.entries {
				if now.After(e.expiresAt) {
					delete(c.entries, k)
				}
			}
			c.mu.Unlock()
		}
	}()
	return c
}

func (c *apiKeyCache) get(key string) *auth.Claims {
	c.mu.RLock()
	e, ok := c.entries[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(e.expiresAt) {
		return nil
	}
	return e.claims
}

func (c *apiKeyCache) set(key string, claims *auth.Claims) {
	c.mu.Lock()
	c.entries[key] = apiKeyCacheEntry{claims: claims, expiresAt: time.Now().Add(5 * time.Minute)}
	c.mu.Unlock()
}

// APIKeyAuth validates API keys from the X-API-Key header OR Authorization: Bearer ak_... header.
// Caches successful validations for 5 minutes to avoid repeated DB + bcrypt overhead.
func APIKeyAuth(apikeys *repository.APIKeyRepo) func(http.Handler) http.Handler {
	cache := newAPIKeyCache()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")

			// Also check Authorization: Bearer ak_... (many agents use this format)
			if apiKey == "" {
				authHeader := r.Header.Get("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ak_") {
					apiKey = strings.TrimPrefix(authHeader, "Bearer ")
				}
			}

			if apiKey == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check cache first — avoids DB query + bcrypt
			if cached := cache.get(apiKey); cached != nil {
				ctx := context.WithValue(r.Context(), ClaimsKey, cached)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Cache miss — try fast prefix lookup first (O(1)), fallback to full scan
			var matchedAgentID string
			var matchedScopes []string

			// Extract prefix: "ak_" + first 16 hex chars
			if len(apiKey) >= 19 { // "ak_" + at least 16 chars
				prefix := apiKey[3:19]
				key, err := apikeys.GetByPrefix(r.Context(), prefix)
				if err == nil && key != nil {
					if bcrypt.CompareHashAndPassword([]byte(key.KeyHash), []byte(apiKey)) == nil {
						matchedAgentID = key.AgentID
						matchedScopes = key.Scopes
					}
				}
			}

			// Fallback: full scan for old keys without prefix
			if matchedAgentID == "" {
				keys, err := apikeys.GetAllActive(r.Context())
				if err != nil {
					http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
					return
				}
				for _, k := range keys {
					if bcrypt.CompareHashAndPassword([]byte(k.KeyHash), []byte(apiKey)) == nil {
						matchedAgentID = k.AgentID
						matchedScopes = k.Scopes
						// Backfill prefix for future fast lookups
						if len(apiKey) >= 19 {
							_ = apikeys.SetPrefix(r.Context(), k.ID, apiKey[3:19])
						}
						break
					}
				}
			}

			if matchedAgentID == "" {
				http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
				return
			}

			claims := &auth.Claims{
				ParticipantID:   matchedAgentID,
				ParticipantType: "agent",
				Scopes:          matchedScopes,
			}

			// Cache the result
			cache.set(apiKey, claims)

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CombinedAuth chains APIKeyAuth and JWT Auth so that either credential type is accepted.
// API key auth is checked first; if no X-API-Key header is present, JWT auth takes over.
func CombinedAuth(apikeys *repository.APIKeyRepo, jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return APIKeyAuth(apikeys)(Auth(jwtSecret)(next))
	}
}

// RequireScope returns middleware that checks if the authenticated participant has the required scope.
// JWT-authenticated users (no scopes set) are always allowed through.
// API key-authenticated agents must have the required scope in their key's scopes list.
func RequireScope(scope string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				http.Error(w, `{"error":"missing auth claims"}`, http.StatusUnauthorized)
				return
			}

			// If scopes are set (API key auth), check for the required scope
			if len(claims.Scopes) > 0 && !containsScope(claims.Scopes, scope) {
				http.Error(w, `{"error":"insufficient permissions"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func containsScope(scopes []string, scope string) bool {
	for _, s := range scopes {
		if s == scope {
			return true
		}
	}
	return false
}
