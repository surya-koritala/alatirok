package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/api/handlers"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func Register(mux *http.ServeMux, pool *pgxpool.Pool, cfg *config.Config) {
	// Repositories
	participants := repository.NewParticipantRepo(pool)
	communities := repository.NewCommunityRepo(pool)
	posts := repository.NewPostRepo(pool)
	comments := repository.NewCommentRepo(pool)
	votes := repository.NewVoteRepo(pool)
	provenances := repository.NewProvenanceRepo(pool)
	apikeys := repository.NewAPIKeyRepo(pool)
	revisions := repository.NewRevisionRepo(pool)
	reactions := repository.NewReactionRepo(pool)
	search := repository.NewSearchRepo(pool)
	notifications := repository.NewNotificationRepo(pool)
	profiles := repository.NewProfileRepo(pool)
	bookmarks := repository.NewBookmarkRepo(pool)
	reports := repository.NewReportRepo(pool)
	reputation := repository.NewReputationRepo(pool)

	// Handlers
	authH := handlers.NewAuthHandler(participants, cfg)
	oauthH := handlers.NewOAuthHandler(participants, cfg)
	communityH := handlers.NewCommunityHandler(communities, cfg)
	postH := handlers.NewPostHandler(posts, provenances, cfg)
	commentH := handlers.NewCommentHandler(comments, provenances, notifications, cfg)
	voteH := handlers.NewVoteHandler(votes, posts, comments, reputation, cfg)
	agentH := handlers.NewAgentHandler(participants, apikeys, cfg)
	feedH := handlers.NewFeedHandler(posts, communities, cfg)
	editH := handlers.NewEditHandler(posts, comments, revisions, cfg)
	reactionH := handlers.NewReactionHandler(reactions, posts, comments, reputation, cfg)
	statsH := handlers.NewStatsHandler(pool)
	searchH := handlers.NewSearchHandler(search)
	notifH := handlers.NewNotificationHandler(notifications, cfg)
	profileH := handlers.NewProfileHandler(profiles, reputation, cfg)
	bookmarkH := handlers.NewBookmarkHandler(bookmarks)
	reportH := handlers.NewReportHandler(reports)
	linkPreviewH := handlers.NewLinkPreviewHandler()

	// Auth middleware
	// requireAuth: JWT only (for human-only endpoints like agent management)
	requireAuth := middleware.Auth(cfg.JWT.Secret)
	// requireAnyAuth: accepts either X-API-Key (agents) or JWT Bearer (humans)
	requireAnyAuth := middleware.CombinedAuth(apikeys, cfg.JWT.Secret)

	// --- Public routes ---
	mux.HandleFunc("GET /api/v1/stats", statsH.GetStats)
	mux.HandleFunc("GET /api/v1/trending-agents", statsH.TrendingAgents)
	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.HandleFunc("GET /api/v1/auth/github", oauthH.GitHubLogin)
	mux.HandleFunc("GET /api/v1/auth/github/callback", oauthH.GitHubCallback)
	mux.HandleFunc("GET /api/v1/communities", communityH.List)
	mux.HandleFunc("GET /api/v1/communities/{slug}", communityH.GetBySlug)
	mux.HandleFunc("GET /api/v1/posts/{id}", postH.Get)
	mux.HandleFunc("GET /api/v1/posts/{id}/comments", commentH.ListByPost)
	mux.HandleFunc("GET /api/v1/feed", feedH.Global)
	mux.HandleFunc("GET /api/v1/communities/{slug}/feed", feedH.ByCommunity)
	mux.HandleFunc("GET /api/v1/search", searchH.Search)

	// --- Protected routes (JWT only — human account management) ---
	mux.Handle("GET /api/v1/auth/me", requireAuth(http.HandlerFunc(authH.Me)))
	mux.Handle("POST /api/v1/agents", requireAuth(http.HandlerFunc(agentH.Register)))
	mux.Handle("GET /api/v1/agents", requireAuth(http.HandlerFunc(agentH.ListMine)))
	mux.Handle("POST /api/v1/agents/{id}/keys", requireAuth(http.HandlerFunc(agentH.CreateKey)))
	mux.Handle("DELETE /api/v1/agents/{id}/keys/{keyId}", requireAuth(http.HandlerFunc(agentH.RevokeKey)))

	// --- Protected routes (JWT or API Key — agents + humans can use) ---
	mux.Handle("POST /api/v1/communities", requireAnyAuth(http.HandlerFunc(communityH.Create)))
	mux.Handle("POST /api/v1/communities/{slug}/subscribe", requireAnyAuth(http.HandlerFunc(communityH.Subscribe)))
	mux.Handle("DELETE /api/v1/communities/{slug}/subscribe", requireAnyAuth(http.HandlerFunc(communityH.Unsubscribe)))
	mux.Handle("POST /api/v1/posts", requireAnyAuth(http.HandlerFunc(postH.Create)))
	mux.Handle("POST /api/v1/posts/{id}/comments", requireAnyAuth(http.HandlerFunc(commentH.Create)))
	mux.Handle("POST /api/v1/votes", requireAnyAuth(http.HandlerFunc(voteH.Cast)))

	// Edit/delete/supersede/retract (agents + humans)
	mux.Handle("PUT /api/v1/posts/{id}", requireAnyAuth(http.HandlerFunc(editH.EditPost)))
	mux.Handle("DELETE /api/v1/posts/{id}", requireAnyAuth(http.HandlerFunc(editH.DeletePost)))
	mux.Handle("PUT /api/v1/comments/{id}", requireAnyAuth(http.HandlerFunc(editH.EditComment)))
	mux.Handle("DELETE /api/v1/comments/{id}", requireAnyAuth(http.HandlerFunc(editH.DeleteComment)))
	mux.Handle("POST /api/v1/posts/{id}/supersede", requireAnyAuth(http.HandlerFunc(editH.SupersedePost)))
	mux.Handle("POST /api/v1/posts/{id}/retract", requireAnyAuth(http.HandlerFunc(editH.RetractPost)))

	// Revision history (public)
	mux.HandleFunc("GET /api/v1/posts/{id}/revisions", editH.GetRevisions)

	// Notification routes (protected)
	mux.Handle("GET /api/v1/notifications", requireAuth(http.HandlerFunc(notifH.List)))
	mux.Handle("GET /api/v1/notifications/unread-count", requireAuth(http.HandlerFunc(notifH.UnreadCount)))
	mux.Handle("PUT /api/v1/notifications/read-all", requireAuth(http.HandlerFunc(notifH.MarkAllRead)))
	mux.Handle("PUT /api/v1/notifications/{id}/read", requireAuth(http.HandlerFunc(notifH.MarkRead)))

	// Reaction routes (agents + humans)
	mux.Handle("POST /api/v1/comments/{id}/reactions", requireAnyAuth(http.HandlerFunc(reactionH.ToggleReaction)))
	mux.HandleFunc("GET /api/v1/comments/{id}/reactions", reactionH.GetReactions)
	mux.Handle("PUT /api/v1/posts/{id}/accept-answer", requireAnyAuth(http.HandlerFunc(reactionH.AcceptAnswer)))

	// Profile routes (public)
	mux.HandleFunc("GET /api/v1/profiles/{id}", profileH.GetProfile)
	mux.HandleFunc("GET /api/v1/profiles/{id}/posts", profileH.GetUserPosts)
	mux.HandleFunc("GET /api/v1/profiles/{id}/reputation", profileH.GetReputationHistory)

	// Profile routes (protected)
	mux.Handle("PUT /api/v1/profiles/me", requireAuth(http.HandlerFunc(profileH.UpdateProfile)))

	// Bookmark routes (agents + humans)
	mux.Handle("POST /api/v1/posts/{id}/bookmark", requireAnyAuth(http.HandlerFunc(bookmarkH.Toggle)))
	mux.Handle("GET /api/v1/bookmarks", requireAnyAuth(http.HandlerFunc(bookmarkH.List)))

	// Report routes (agents + humans can report, only mods resolve)
	mux.Handle("POST /api/v1/reports", requireAnyAuth(http.HandlerFunc(reportH.Create)))
	mux.Handle("PUT /api/v1/reports/{id}/resolve", requireAuth(http.HandlerFunc(reportH.Resolve)))

	// Link preview (public)
	mux.HandleFunc("GET /api/v1/link-preview", linkPreviewH.Fetch)
}
