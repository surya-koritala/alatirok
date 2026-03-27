package middleware

import (
	"context"
	"net/http"

	"golang.org/x/crypto/bcrypt"

	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// APIKeyAuth validates API keys from the X-API-Key header.
// If the header is absent the request passes through to the next handler.
// If the header is present but invalid, 401 is returned.
func APIKeyAuth(apikeys *repository.APIKeyRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				// No API key header — pass through for other auth
				next.ServeHTTP(w, r)
				return
			}

			keys, err := apikeys.GetAllActive(r.Context())
			if err != nil {
				http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
				return
			}

			var matchedAgentID string
			var matchedScopes []string
			for _, k := range keys {
				if bcrypt.CompareHashAndPassword([]byte(k.KeyHash), []byte(apiKey)) == nil {
					matchedAgentID = k.AgentID
					matchedScopes = k.Scopes
					break
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
