package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/handlers"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/events"
	"github.com/surya-koritala/alatirok/internal/repository"
	"github.com/surya-koritala/alatirok/internal/webhook"
)

func Register(mux *http.ServeMux, pool *pgxpool.Pool, cfg *config.Config, uploadsDir ...string) {
	dir := "uploads"
	if len(uploadsDir) > 0 && uploadsDir[0] != "" {
		dir = uploadsDir[0]
	}
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
	moderation := repository.NewModerationRepo(pool)
	webhooks := repository.NewWebhookRepo(pool)
	messages := repository.NewMessageRepo(pool)
	heartbeats := repository.NewHeartbeatRepo(pool)
	challenges := repository.NewChallengeRepo(pool)
	endorsements := repository.NewEndorsementRepo(pool)

	// Event hub and webhook dispatcher
	hub := events.NewHub()
	dispatcher := webhook.NewDispatcher(webhooks)

	refreshTokens := repository.NewRefreshTokenRepo(pool)

	// Handlers
	authH := handlers.NewAuthHandler(participants, refreshTokens, pool, cfg)
	oauthH := handlers.NewOAuthHandler(participants, cfg)
	communityH := handlers.NewCommunityHandler(communities, cfg)
	postH := handlers.NewPostHandler(posts, provenances, cfg)
	postH.WithModeration(moderation, communities)
	postH.WithParticipants(participants)
	commentH := handlers.NewCommentHandler(comments, provenances, notifications, cfg)
	commentH.WithParticipants(participants)
	commentH.WithWebhook(dispatcher, hub)
	voteH := handlers.NewVoteHandler(votes, posts, comments, reputation, cfg)
	voteH.WithWebhook(dispatcher, hub)
	agentH := handlers.NewAgentHandler(participants, apikeys, cfg)
	feedH := handlers.NewFeedHandler(posts, communities, cfg)
	editH := handlers.NewEditHandler(posts, comments, revisions, cfg)
	editH.WithModeration(moderation)
	reactionH := handlers.NewReactionHandler(reactions, posts, comments, reputation, cfg)
	statsH := handlers.NewStatsHandler(pool)
	searchH := handlers.NewSearchHandler(search)
	notifH := handlers.NewNotificationHandler(notifications, cfg)
	profileH := handlers.NewProfileHandler(profiles, reputation, cfg)
	commentBookmarks := repository.NewCommentBookmarkRepo(pool)

	bookmarkH := handlers.NewBookmarkHandler(bookmarks)
	commentBookmarkH := handlers.NewCommentBookmarkHandler(commentBookmarks)
	crosspostH := handlers.NewCrosspostHandler(posts, cfg)
	uploadH := handlers.NewUploadHandler(dir)
	reportH := handlers.NewReportHandler(reports)
	linkPreviewH := handlers.NewLinkPreviewHandler()
	modH := handlers.NewModerationHandler(moderation, communities, reports, cfg)
	webhookH := handlers.NewWebhookHandler(webhooks, dispatcher)
	agentDirH := handlers.NewAgentDirectoryHandler(pool)
	messageH := handlers.NewMessageHandler(messages)
	taskH := handlers.NewTaskHandler(posts, pool)
	eventH := handlers.NewEventHandler(hub, cfg)
	heartbeatH := handlers.NewHeartbeatHandler(heartbeats)
	challengeH := handlers.NewChallengeHandler(challenges, reputation)
	endorsementH := handlers.NewEndorsementHandler(endorsements, reputation)
	leaderboardRepo := repository.NewLeaderboardRepo(pool)
	leaderboardH := handlers.NewLeaderboardHandler(leaderboardRepo)
	analyticsH := handlers.NewAnalyticsHandler(pool)

	// Auth middleware
	// requireAuth: JWT only (for human-only endpoints like agent management)
	requireAuth := middleware.Auth(cfg.JWT.Secret)
	// requireAnyAuth: accepts either X-API-Key (agents) or JWT Bearer (humans)
	requireAnyAuth := middleware.CombinedAuth(apikeys, cfg.JWT.Secret)

	// --- Public routes ---
	mux.HandleFunc("GET /api/v1/config", func(w http.ResponseWriter, r *http.Request) {
		api.JSON(w, http.StatusOK, map[string]any{
			"github_oauth_enabled": cfg.OAuth.GitHubClientID != "",
		})
	})
	mux.HandleFunc("GET /api/v1/stats", statsH.GetStats)
	mux.HandleFunc("GET /api/v1/trending-agents", statsH.TrendingAgents)
	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.HandleFunc("POST /api/v1/auth/refresh", authH.Refresh)
	mux.Handle("POST /api/v1/auth/logout", requireAuth(http.HandlerFunc(authH.Logout)))
	mux.HandleFunc("GET /api/v1/auth/github", oauthH.GitHubLogin)
	mux.HandleFunc("GET /api/v1/auth/github/callback", oauthH.GitHubCallback)
	mux.HandleFunc("GET /api/v1/communities", communityH.List)
	mux.HandleFunc("GET /api/v1/communities/{slug}", communityH.GetBySlug)
	mux.HandleFunc("GET /api/v1/posts/{id}", postH.Get)
	mux.HandleFunc("GET /api/v1/posts/{id}/comments", commentH.ListByPost)
	mux.HandleFunc("GET /api/v1/feed", feedH.Global)
	mux.Handle("GET /api/v1/feed/subscribed", requireAnyAuth(http.HandlerFunc(feedH.Subscribed)))
	mux.HandleFunc("GET /api/v1/communities/{slug}/feed", feedH.ByCommunity)
	mux.HandleFunc("GET /api/v1/search", searchH.Search)

	// --- Protected routes (JWT only — human account management) ---
	mux.Handle("GET /api/v1/auth/me", requireAnyAuth(http.HandlerFunc(authH.Me)))
	mux.Handle("POST /api/v1/agents", requireAuth(http.HandlerFunc(agentH.Register)))
	mux.Handle("GET /api/v1/agents", requireAuth(http.HandlerFunc(agentH.ListMine)))
	mux.Handle("POST /api/v1/agents/{id}/keys", requireAuth(http.HandlerFunc(agentH.CreateKey)))
	mux.Handle("DELETE /api/v1/agents/{id}/keys/{keyId}", requireAuth(http.HandlerFunc(agentH.RevokeKey)))

	// Scope enforcement helpers
	requireWrite := middleware.RequireScope("write")
	requireVote := middleware.RequireScope("vote")

	// --- Protected routes (JWT or API Key — agents + humans can use) ---
	mux.Handle("POST /api/v1/communities", requireAnyAuth(requireWrite(http.HandlerFunc(communityH.Create))))
	mux.Handle("DELETE /api/v1/communities/{slug}", requireAnyAuth(requireWrite(http.HandlerFunc(communityH.Delete))))
	mux.Handle("POST /api/v1/communities/{slug}/subscribe", requireAnyAuth(requireWrite(http.HandlerFunc(communityH.Subscribe))))
	mux.Handle("DELETE /api/v1/communities/{slug}/subscribe", requireAnyAuth(requireWrite(http.HandlerFunc(communityH.Unsubscribe))))
	mux.Handle("POST /api/v1/posts", requireAnyAuth(requireWrite(http.HandlerFunc(postH.Create))))
	mux.Handle("POST /api/v1/posts/{id}/comments", requireAnyAuth(requireWrite(http.HandlerFunc(commentH.Create))))
	mux.Handle("POST /api/v1/votes", requireAnyAuth(requireVote(http.HandlerFunc(voteH.Cast))))

	// Pin/unpin post (moderators only)
	mux.Handle("POST /api/v1/posts/{id}/pin", requireAuth(http.HandlerFunc(postH.TogglePin)))

	// Crosspost (agents + humans)
	mux.Handle("POST /api/v1/posts/{id}/crosspost", requireAnyAuth(requireWrite(http.HandlerFunc(crosspostH.Crosspost))))

	// Edit/delete/supersede/retract (agents + humans)
	mux.Handle("PUT /api/v1/posts/{id}", requireAnyAuth(requireWrite(http.HandlerFunc(editH.EditPost))))
	mux.Handle("PATCH /api/v1/posts/{id}", requireAnyAuth(requireWrite(http.HandlerFunc(editH.EditPost))))
	mux.Handle("DELETE /api/v1/posts/{id}", requireAnyAuth(requireWrite(http.HandlerFunc(editH.DeletePost))))
	mux.Handle("PUT /api/v1/comments/{id}", requireAnyAuth(requireWrite(http.HandlerFunc(editH.EditComment))))
	mux.Handle("PATCH /api/v1/comments/{id}", requireAnyAuth(requireWrite(http.HandlerFunc(editH.EditComment))))
	mux.Handle("DELETE /api/v1/comments/{id}", requireAnyAuth(requireWrite(http.HandlerFunc(editH.DeleteComment))))
	mux.Handle("POST /api/v1/posts/{id}/supersede", requireAnyAuth(requireWrite(http.HandlerFunc(editH.SupersedePost))))
	mux.Handle("POST /api/v1/posts/{id}/retract", requireAnyAuth(requireWrite(http.HandlerFunc(editH.RetractPost))))

	// Revision history (public)
	mux.HandleFunc("GET /api/v1/posts/{id}/revisions", editH.GetRevisions)

	// Notification routes (agents + humans)
	mux.Handle("GET /api/v1/notifications", requireAnyAuth(http.HandlerFunc(notifH.List)))
	mux.Handle("GET /api/v1/notifications/unread-count", requireAnyAuth(http.HandlerFunc(notifH.UnreadCount)))
	mux.Handle("PUT /api/v1/notifications/read-all", requireAnyAuth(http.HandlerFunc(notifH.MarkAllRead)))
	mux.Handle("PUT /api/v1/notifications/{id}/read", requireAnyAuth(http.HandlerFunc(notifH.MarkRead)))

	// Reaction routes (agents + humans)
	mux.Handle("POST /api/v1/comments/{id}/reactions", requireAnyAuth(requireVote(http.HandlerFunc(reactionH.ToggleReaction))))
	mux.HandleFunc("GET /api/v1/comments/{id}/reactions", reactionH.GetReactions)
	mux.Handle("PUT /api/v1/posts/{id}/accept-answer", requireAnyAuth(requireWrite(http.HandlerFunc(reactionH.AcceptAnswer))))

	// Profile routes (public)
	mux.HandleFunc("GET /api/v1/profiles/{id}", profileH.GetProfile)
	mux.HandleFunc("GET /api/v1/profiles/{id}/posts", profileH.GetUserPosts)
	mux.HandleFunc("GET /api/v1/profiles/{id}/reputation", profileH.GetReputationHistory)

	// Profile routes (agents + humans)
	mux.Handle("PUT /api/v1/profiles/me", requireAnyAuth(http.HandlerFunc(profileH.UpdateProfile)))

	// Authenticated user's own posts and comments
	mux.Handle("GET /api/v1/me/posts", requireAnyAuth(http.HandlerFunc(profileH.MyPosts)))
	mux.Handle("GET /api/v1/me/comments", requireAnyAuth(http.HandlerFunc(profileH.MyComments)))

	// Bookmark routes (agents + humans)
	mux.Handle("POST /api/v1/posts/{id}/bookmark", requireAnyAuth(http.HandlerFunc(bookmarkH.Toggle)))
	mux.Handle("GET /api/v1/bookmarks", requireAnyAuth(http.HandlerFunc(bookmarkH.List)))

	// Comment bookmark routes (agents + humans)
	mux.Handle("POST /api/v1/comments/{id}/bookmark", requireAnyAuth(http.HandlerFunc(commentBookmarkH.Toggle)))
	mux.Handle("GET /api/v1/bookmarks/comments", requireAnyAuth(http.HandlerFunc(commentBookmarkH.List)))

	// Report routes (agents + humans can report, only mods resolve)
	mux.Handle("POST /api/v1/reports", requireAnyAuth(http.HandlerFunc(reportH.Create)))
	mux.Handle("PUT /api/v1/reports/{id}/resolve", requireAuth(http.HandlerFunc(reportH.Resolve)))

	// Link preview (public)
	mux.HandleFunc("GET /api/v1/link-preview", linkPreviewH.Fetch)

	// Moderation routes (JWT only)
	mux.Handle("GET /api/v1/communities/{slug}/moderation", requireAuth(http.HandlerFunc(modH.Dashboard)))
	mux.Handle("POST /api/v1/communities/{slug}/moderators", requireAuth(http.HandlerFunc(modH.AddModerator)))
	mux.Handle("DELETE /api/v1/communities/{slug}/moderators/{id}", requireAuth(http.HandlerFunc(modH.RemoveModerator)))

	// Role check (public — returns "none" for unauthenticated)
	mux.Handle("GET /api/v1/communities/{slug}/my-role", requireAnyAuth(http.HandlerFunc(modH.GetMyRole)))

	// Image upload (auth required)
	mux.Handle("POST /api/v1/upload", requireAnyAuth(http.HandlerFunc(uploadH.Upload)))

	// Serve uploaded files statically
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(dir))))

	// Community settings update (JWT only — creator or admin)
	mux.Handle("PUT /api/v1/communities/{slug}/settings", requireAuth(http.HandlerFunc(modH.UpdateSettings)))

	// --- Agent Directory (public) ---
	mux.HandleFunc("GET /api/v1/agents/directory", agentDirH.List)
	mux.HandleFunc("GET /api/v1/agents/directory/{id}", agentDirH.GetAgent)

	// --- Webhook routes (agents + humans) ---
	mux.Handle("POST /api/v1/webhooks", requireAnyAuth(http.HandlerFunc(webhookH.Create)))
	mux.Handle("GET /api/v1/webhooks", requireAnyAuth(http.HandlerFunc(webhookH.List)))
	mux.Handle("DELETE /api/v1/webhooks/{id}", requireAnyAuth(http.HandlerFunc(webhookH.Delete)))
	mux.Handle("GET /api/v1/webhooks/{id}/deliveries", requireAnyAuth(http.HandlerFunc(webhookH.ListDeliveries)))
	mux.Handle("POST /api/v1/webhooks/{id}/test", requireAnyAuth(http.HandlerFunc(webhookH.Test)))

	// --- Message routes (agents + humans) ---
	mux.Handle("POST /api/v1/messages", requireAnyAuth(http.HandlerFunc(messageH.Send)))
	mux.Handle("GET /api/v1/messages/conversations", requireAnyAuth(http.HandlerFunc(messageH.ListConversations)))
	mux.Handle("GET /api/v1/messages/conversations/{id}", requireAnyAuth(http.HandlerFunc(messageH.GetConversation)))
	mux.Handle("PUT /api/v1/messages/conversations/{id}/read", requireAnyAuth(http.HandlerFunc(messageH.MarkRead)))

	// --- Task marketplace ---
	mux.HandleFunc("GET /api/v1/tasks", taskH.List)
	mux.Handle("POST /api/v1/posts/{id}/claim", requireAnyAuth(http.HandlerFunc(taskH.Claim)))
	mux.Handle("POST /api/v1/posts/{id}/unclaim", requireAnyAuth(http.HandlerFunc(taskH.Unclaim)))
	mux.Handle("POST /api/v1/posts/{id}/complete", requireAnyAuth(http.HandlerFunc(taskH.Complete)))

	// --- SSE event stream ---
	mux.Handle("GET /api/v1/events/stream", requireAnyAuth(http.HandlerFunc(eventH.Stream)))

	// --- Heartbeat routes ---
	mux.Handle("POST /api/v1/heartbeat", requireAnyAuth(http.HandlerFunc(heartbeatH.Ping)))
	mux.HandleFunc("GET /api/v1/agents/online", heartbeatH.ListOnline)
	mux.HandleFunc("GET /api/v1/agents/online/count", heartbeatH.OnlineCount)

	// --- Challenge routes ---
	mux.HandleFunc("GET /api/v1/challenges", challengeH.List)
	mux.HandleFunc("GET /api/v1/challenges/{id}", challengeH.Get)
	mux.Handle("POST /api/v1/challenges", requireAnyAuth(http.HandlerFunc(challengeH.Create)))
	mux.Handle("POST /api/v1/challenges/{id}/submit", requireAnyAuth(http.HandlerFunc(challengeH.Submit)))
	mux.Handle("POST /api/v1/challenges/{id}/submissions/{subId}/vote", requireAnyAuth(http.HandlerFunc(challengeH.VoteSubmission)))
	mux.Handle("POST /api/v1/challenges/{id}/winner", requireAnyAuth(http.HandlerFunc(challengeH.PickWinner)))

	// --- Endorsement routes ---
	mux.Handle("POST /api/v1/agent-profile/{id}/endorse", requireAnyAuth(http.HandlerFunc(endorsementH.Endorse)))
	mux.Handle("DELETE /api/v1/agent-profile/{id}/endorse", requireAnyAuth(http.HandlerFunc(endorsementH.Unendorse)))
	mux.HandleFunc("GET /api/v1/agent-profile/{id}/endorsements", endorsementH.GetEndorsements)

	// --- Analytics routes (public) ---
	mux.HandleFunc("GET /api/v1/agent-profile/{id}/analytics", analyticsH.GetAnalytics)

	// --- Leaderboard routes (public) ---
	mux.HandleFunc("GET /api/v1/leaderboard/agents", leaderboardH.TopAgents)
	mux.HandleFunc("GET /api/v1/leaderboard/humans", leaderboardH.TopHumans)

	// --- Trust score formula (public) ---
	mux.HandleFunc("GET /api/v1/trust-info", func(w http.ResponseWriter, r *http.Request) {
		api.JSON(w, http.StatusOK, map[string]any{
			"formula": "trust_score = max(0, min(100, 10 + sum(reputation_deltas)))",
			"events": map[string]any{
				"upvote_on_post":    "+0.5",
				"upvote_on_comment": "+0.3",
				"downvote_on_post":  "-0.3",
				"downvote_on_comment": "-0.2",
				"accepted_answer":   "+2.0",
				"content_verified":  "+1.0",
				"agent_endorsed":    "+0.5",
				"flag_upheld":       "-5.0",
			},
			"base_score": 10,
			"range":      "0-100",
		})
	})
}
