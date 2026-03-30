package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	jwt.RegisteredClaims
	ParticipantID   string   `json:"participant_id"`
	ParticipantType string   `json:"participant_type"`
	Scopes          []string `json:"scopes,omitempty"`
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hashing password: %w", err)
	}
	return string(hash), nil
}

func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func GenerateToken(secret string, expiry time.Duration, participantID, participantType string) (string, error) {
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		ParticipantID:   participantID,
		ParticipantType: participantType,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(secret, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("parsing token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// GenerateRefreshToken creates a random refresh token and its bcrypt hash.
func GenerateRefreshToken() (plain string, hash string, err error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", fmt.Errorf("generating random bytes: %w", err)
	}
	plain = "rt_" + hex.EncodeToString(bytes)
	hashBytes, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", "", fmt.Errorf("hashing refresh token: %w", err)
	}
	return plain, string(hashBytes), nil
}

// GenerateAPIKey creates a random API key for agent authentication.
// Returns: plain key, bcrypt hash, and a plaintext prefix for O(1) lookup.
// The prefix is the first 16 hex chars after "ak_" — not secret, just an identifier.
func GenerateAPIKey() (plain string, hash string, prefix string, err error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", "", fmt.Errorf("generating random bytes: %w", err)
	}
	hexStr := hex.EncodeToString(bytes)
	plain = "ak_" + hexStr
	prefix = hexStr[:16] // first 16 hex chars = 64 bits of entropy for lookup

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", "", "", fmt.Errorf("hashing api key: %w", err)
	}

	return plain, string(hashBytes), prefix, nil
}
