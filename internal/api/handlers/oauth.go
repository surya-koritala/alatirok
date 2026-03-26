package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/auth"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

// OAuthHandler handles OAuth login flows.
type OAuthHandler struct {
	participants *repository.ParticipantRepo
	cfg          *config.Config
}

// NewOAuthHandler creates a new OAuthHandler.
func NewOAuthHandler(participants *repository.ParticipantRepo, cfg *config.Config) *OAuthHandler {
	return &OAuthHandler{participants: participants, cfg: cfg}
}

// GitHubLogin redirects the user to the GitHub OAuth authorization page.
func (h *OAuthHandler) GitHubLogin(w http.ResponseWriter, r *http.Request) {
	clientID := h.cfg.OAuth.GitHubClientID
	if clientID == "" {
		api.Error(w, http.StatusServiceUnavailable, "GitHub OAuth is not configured")
		return
	}
	redirectURI := h.cfg.OAuth.GitHubRedirectURI
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=user:email",
		url.QueryEscape(clientID),
		url.QueryEscape(redirectURI),
	)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// GitHubCallback handles the OAuth callback from GitHub.
func (h *OAuthHandler) GitHubCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		api.Error(w, http.StatusBadRequest, "missing code")
		return
	}

	// Exchange code for access token
	accessToken, err := exchangeGitHubCode(h.cfg.OAuth.GitHubClientID, h.cfg.OAuth.GitHubClientSecret, code)
	if err != nil {
		slog.Error("failed to exchange github code", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to exchange github code")
		return
	}

	// Fetch user info from GitHub
	ghUser, err := fetchGitHubUser(accessToken)
	if err != nil {
		slog.Error("failed to fetch github user", "error", err)
		api.Error(w, http.StatusInternalServerError, "failed to fetch github user info")
		return
	}

	// Use the primary email for lookup
	email := ghUser.Email
	if email == "" {
		// Try to fetch email from /user/emails endpoint
		email, err = fetchGitHubPrimaryEmail(accessToken)
		if err != nil || email == "" {
			api.Error(w, http.StatusBadRequest, "could not determine GitHub email address")
			return
		}
	}

	ctx := r.Context()

	// Find or create participant
	existing, err := h.participants.GetHumanByEmail(ctx, email)
	var participantID, participantType string
	if err == nil {
		// Existing user — use them
		participantID = existing.ID
		participantType = string(existing.Type)
	} else {
		// Create new human user
		displayName := ghUser.Name
		if displayName == "" {
			displayName = ghUser.Login
		}
		avatarURL := ghUser.AvatarURL

		newHuman := &models.HumanUser{
			Participant: models.Participant{
				DisplayName: displayName,
				AvatarURL:   avatarURL,
			},
			Email:         email,
			PasswordHash:  "", // No password for OAuth users
			OAuthProvider: "github",
		}

		participant, createErr := h.participants.CreateHuman(ctx, newHuman)
		if createErr != nil {
			slog.Error("failed to create github user", "error", createErr)
			api.Error(w, http.StatusInternalServerError, "failed to create user account")
			return
		}
		participantID = participant.ID
		participantType = string(participant.Type)
	}

	// Generate JWT
	token, err := auth.GenerateToken(h.cfg.JWT.Secret, h.cfg.JWT.Expiry, participantID, participantType)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// Redirect to frontend with token in query param
	frontendURL := fmt.Sprintf("http://localhost:5173/login?token=%s", url.QueryEscape(token))
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

// --- GitHub API helpers ---

type githubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func exchangeGitHubCode(clientID, clientSecret, code string) (string, error) {
	body := url.Values{}
	body.Set("client_id", clientID)
	body.Set("client_secret", clientSecret)
	body.Set("code", code)

	req, err := http.NewRequest(http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(body.Encode()))
	if err != nil {
		return "", fmt.Errorf("building token request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("posting to github: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	var result struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decoding token response: %w", err)
	}
	if result.Error != "" {
		return "", fmt.Errorf("github token error: %s", result.Error)
	}
	return result.AccessToken, nil
}

func fetchGitHubUser(accessToken string) (*githubUser, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling github user api: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	var user githubUser
	b, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(b, &user); err != nil {
		return nil, fmt.Errorf("decoding github user: %w", err)
	}
	return &user, nil
}

func fetchGitHubPrimaryEmail(accessToken string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("calling github emails api: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	var emails []githubEmail
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", fmt.Errorf("decoding github emails: %w", err)
	}
	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}
	if len(emails) > 0 {
		return emails[0].Email, nil
	}
	return "", nil
}
