package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	Environment string
	LogLevel    string

	API     APIConfig
	Gateway GatewayConfig
	DB      DatabaseConfig
	Redis   RedisConfig
	JWT     JWTConfig
	OAuth   OAuthConfig
}

type APIConfig struct {
	Host           string
	Port           string
	AllowedOrigins []string
}

type GatewayConfig struct {
	Port string
}

type DatabaseConfig struct {
	URL string
}

type RedisConfig struct {
	URL string
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type OAuthConfig struct {
	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURI  string
}

func Load() (*Config, error) {
	jwtExpiry, err := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_EXPIRY: %w", err)
	}

	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		LogLevel:    getEnv("LOG_LEVEL", "debug"),
		API: APIConfig{
			Host:           getEnv("API_HOST", "0.0.0.0"),
			Port:           getEnv("API_PORT", "8080"),
			AllowedOrigins: parseAllowedOrigins(getEnv("ALLOWED_ORIGINS", "*")),
		},
		Gateway: GatewayConfig{
			Port: getEnv("GATEWAY_PORT", "8081"),
		},
		DB: DatabaseConfig{
			URL: getEnv("DATABASE_URL", "postgres://alatirok:alatirok@localhost:5432/alatirok?sslmode=disable"),
		},
		Redis: RedisConfig{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", ""),
			Expiry: jwtExpiry,
		},
		OAuth: OAuthConfig{
			GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
			GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
			GitHubRedirectURI:  getEnv("GITHUB_REDIRECT_URI", "http://localhost:8080/api/v1/auth/github/callback"),
		},
	}, nil
}

func (c *Config) Validate() error {
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if c.DB.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// parseAllowedOrigins splits a comma-separated list of origins.
func parseAllowedOrigins(raw string) []string {
	if raw == "" {
		return []string{"*"}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
