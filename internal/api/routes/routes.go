package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	mcpserver "github.com/mark3labs/mcp-go/server"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/handlers"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/cache"
	"github.com/surya-koritala/alatirok/internal/config"
	"github.com/surya-koritala/alatirok/internal/events"
	a2agateway "github.com/surya-koritala/alatirok/internal/gateway/a2a"
	mcpgateway "github.com/surya-koritala/alatirok/internal/gateway/mcp"
	"github.com/surya-koritala/alatirok/internal/ratelimit"
	"github.com/surya-koritala/alatirok/internal/repository"
	"github.com/surya-koritala/alatirok/internal/webhook"
)

func Register(mux *http.ServeMux, pool *pgxpool.Pool, cfg *config.Config, opts ...any) {
	dir := "uploads"
	var redisCache *cache.RedisCache
	for _, o := range opts {
		switch v := o.(type) {
		case string:
			if v != "" {
				dir = v
			}
		case *cache.RedisCache:
			redisCache = v
		}
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
	hybridSearch := repository.NewHybridSearchRepo(pool)
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

	// Per-participant rate limiters for content creation
	postLimiter := ratelimit.New(30, time.Minute)
	commentLimiter := ratelimit.New(60, time.Minute)
	voteLimiter := ratelimit.New(120, time.Minute)

	refreshTokens := repository.NewRefreshTokenRepo(pool)

	// Handlers
	authH := handlers.NewAuthHandler(participants, refreshTokens, pool, cfg)
	oauthH := handlers.NewOAuthHandler(participants, cfg)
	communityH := handlers.NewCommunityHandler(communities, cfg)
	agentSubs := repository.NewAgentSubscriptionRepo(pool)
	postH := handlers.NewPostHandler(posts, provenances, cfg)
	postH.WithModeration(moderation, communities)
	postH.WithParticipants(participants)
	postH.WithReports(reports)
	postH.WithRateLimiter(postLimiter)
	postH.WithAgentSubscriptions(agentSubs)
	postH.WithCache(redisCache)
	commentH := handlers.NewCommentHandler(comments, provenances, notifications, cfg)
	commentH.WithParticipants(participants)
	commentH.WithReports(reports)
	commentH.WithRateLimiter(commentLimiter)
	commentH.WithWebhook(dispatcher, hub)
	commentH.WithCache(redisCache)
	voteH := handlers.NewVoteHandler(votes, posts, comments, reputation, cfg)
	voteH.WithRateLimiter(voteLimiter)
	voteH.WithWebhook(dispatcher, hub)
	voteH.WithCache(redisCache)
	agentH := handlers.NewAgentHandler(participants, apikeys, cfg)
	feedH := handlers.NewFeedHandler(posts, communities, cfg)
	feedH.WithCache(redisCache)
	communityH.WithCache(redisCache)
	editH := handlers.NewEditHandler(posts, comments, revisions, cfg)
	editH.WithModeration(moderation)
	reactionH := handlers.NewReactionHandler(reactions, posts, comments, reputation, cfg)
	statsH := handlers.NewStatsHandler(pool)
	statsH.WithCache(redisCache)
	activityH := handlers.NewActivityHandler(pool)
	activityH.WithCache(redisCache)
	searchH := handlers.NewSearchHandler(search, hybridSearch)
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
	agentSubH := handlers.NewAgentSubscriptionHandler(agentSubs)

	// Agent capability (discovery) repo + handler
	capRepo := repository.NewAgentCapabilityRepo(pool)
	capH := handlers.NewAgentCapabilityHandler(capRepo)

	// Citation repo + handler
	citationRepo := repository.NewCitationRepo(pool)
	citationH := handlers.NewCitationHandler(citationRepo)

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
	mux.HandleFunc("GET /api/v1/activity/recent", activityH.Recent)
	// Auth endpoints with IP-based rate limiting:
	//   Register: 5/hour, Login: 10/min (defense-in-depth; handlers also enforce)
	authRegisterLimiter := ratelimit.New(5, time.Hour)
	authLoginLimiter := ratelimit.New(10, time.Minute)
	mux.HandleFunc("POST /api/v1/auth/register", func(w http.ResponseWriter, r *http.Request) {
		ip := handlers.ClientIP(r)
		if !authRegisterLimiter.Allow(ip) {
			http.Error(w, `{"error":"too many registration attempts, try again later"}`, http.StatusTooManyRequests)
			return
		}
		authH.Register(w, r)
	})
	mux.HandleFunc("POST /api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		ip := handlers.ClientIP(r)
		if !authLoginLimiter.Allow(ip) {
			http.Error(w, `{"error":"too many login attempts, try again later"}`, http.StatusTooManyRequests)
			return
		}
		authH.Login(w, r)
	})
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
	// Search rate limiting: 30 requests per minute per IP
	searchLimiter := ratelimit.New(30, time.Minute)
	mux.HandleFunc("GET /api/v1/search", func(w http.ResponseWriter, r *http.Request) {
		ip := handlers.ClientIP(r)
		if !searchLimiter.Allow(ip) {
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}
		searchH.Search(w, r)
	})

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
	// Subscription check — requires auth so expired tokens trigger 401 → refresh
	mux.Handle("GET /api/v1/communities/{slug}/subscribed", requireAnyAuth(http.HandlerFunc(communityH.IsSubscribed)))
	mux.Handle("POST /api/v1/posts", requireAnyAuth(requireWrite(http.HandlerFunc(postH.Create))))
	mux.Handle("POST /api/v1/posts/{id}/comments", requireAnyAuth(requireWrite(http.HandlerFunc(commentH.Create))))
	mux.Handle("POST /api/v1/votes", requireAnyAuth(requireVote(http.HandlerFunc(voteH.Cast))))

	// Citation routes
	mux.Handle("POST /api/v1/posts/{id}/citations", requireAnyAuth(requireWrite(http.HandlerFunc(citationH.Create))))
	mux.HandleFunc("GET /api/v1/posts/{id}/citations", citationH.GetByPost)
	mux.HandleFunc("GET /api/v1/posts/{id}/graph", citationH.GetGraph)

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

	// --- Agent subscription routes (agents + humans) ---
	mux.Handle("POST /api/v1/agent-subscriptions", requireAnyAuth(requireWrite(http.HandlerFunc(agentSubH.Create))))
	mux.Handle("GET /api/v1/agent-subscriptions", requireAnyAuth(http.HandlerFunc(agentSubH.List)))
	mux.Handle("DELETE /api/v1/agent-subscriptions/{id}", requireAnyAuth(http.HandlerFunc(agentSubH.Delete)))

	// --- Agent Discovery (capability cards) ---
	mux.Handle("POST /api/v1/agent-capabilities", requireAnyAuth(requireWrite(http.HandlerFunc(capH.Register))))
	mux.Handle("DELETE /api/v1/agent-capabilities/{capability}", requireAnyAuth(http.HandlerFunc(capH.Unregister)))
	mux.Handle("GET /api/v1/agent-capabilities", requireAnyAuth(http.HandlerFunc(capH.ListMine)))
	mux.HandleFunc("GET /api/v1/discover", capH.Search)
	mux.HandleFunc("GET /api/v1/discover/{capability}", capH.SearchByCapability)
	mux.Handle("POST /api/v1/discover/{id}/invoke", requireAnyAuth(http.HandlerFunc(capH.Invoke)))
	mux.Handle("POST /api/v1/discover/{id}/rate", requireAnyAuth(http.HandlerFunc(capH.RateCapability)))

	// --- Message routes (agents + humans) ---
	mux.Handle("POST /api/v1/messages", requireAnyAuth(http.HandlerFunc(messageH.Send)))
	mux.Handle("GET /api/v1/messages/conversations", requireAnyAuth(http.HandlerFunc(messageH.ListConversations)))
	mux.Handle("GET /api/v1/messages/conversations/{id}", requireAnyAuth(http.HandlerFunc(messageH.GetConversation)))
	mux.Handle("PUT /api/v1/messages/conversations/{id}/read", requireAnyAuth(http.HandlerFunc(messageH.MarkRead)))

	// --- Research tasks ---
	researchRepo := repository.NewResearchRepo(pool)
	researchH := handlers.NewResearchHandler(researchRepo, pool)
	mux.Handle("POST /api/v1/research", requireAnyAuth(requireWrite(http.HandlerFunc(researchH.Create))))
	mux.HandleFunc("GET /api/v1/research", researchH.List)
	mux.HandleFunc("GET /api/v1/research/{id}", researchH.Get)
	mux.Handle("POST /api/v1/research/{id}/contribute", requireAnyAuth(requireWrite(http.HandlerFunc(researchH.Contribute))))
	mux.Handle("POST /api/v1/research/{id}/synthesize", requireAnyAuth(requireWrite(http.HandlerFunc(researchH.Synthesize))))

	// --- Task marketplace ---
	mux.HandleFunc("GET /api/v1/tasks", taskH.List)
	mux.Handle("POST /api/v1/posts/{id}/claim", requireAnyAuth(http.HandlerFunc(taskH.Claim)))
	mux.Handle("POST /api/v1/posts/{id}/unclaim", requireAnyAuth(http.HandlerFunc(taskH.Unclaim)))
	mux.Handle("POST /api/v1/posts/{id}/complete", requireAnyAuth(http.HandlerFunc(taskH.Complete)))

	// --- SSE event stream ---
	// SSE stream — handler validates token from ?token= query param (EventSource can't set headers)
	mux.HandleFunc("GET /api/v1/events/stream", eventH.Stream)

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

	// --- Agent Memory routes (agents + humans) ---
	memoryRepo := repository.NewAgentMemoryRepo(pool)
	memoryH := handlers.NewAgentMemoryHandler(memoryRepo)
	mux.Handle("PUT /api/v1/agent-memory/{key}", requireAnyAuth(requireWrite(http.HandlerFunc(memoryH.Set))))
	mux.Handle("GET /api/v1/agent-memory/{key}", requireAnyAuth(http.HandlerFunc(memoryH.Get)))
	mux.Handle("GET /api/v1/agent-memory", requireAnyAuth(http.HandlerFunc(memoryH.List)))
	mux.Handle("DELETE /api/v1/agent-memory/{key}", requireAnyAuth(http.HandlerFunc(memoryH.Delete)))
	mux.Handle("DELETE /api/v1/agent-memory", requireAnyAuth(http.HandlerFunc(memoryH.DeleteAll)))

	// --- Epistemic status routes ---
	epistemicRepo := repository.NewEpistemicRepo(pool)
	epistemicH := handlers.NewEpistemicHandler(epistemicRepo)
	mux.Handle("POST /api/v1/posts/{id}/epistemic", requireAnyAuth(requireVote(http.HandlerFunc(epistemicH.Vote))))
	mux.Handle("GET /api/v1/posts/{id}/epistemic", middleware.APIKeyAuth(apikeys)(middleware.OptionalAuth(cfg.JWT.Secret)(http.HandlerFunc(epistemicH.Get))))

	// --- Poll routes ---
	pollRepo := repository.NewPollRepo(pool)
	pollH := handlers.NewPollHandler(pollRepo, cfg)
	mux.Handle("POST /api/v1/posts/{id}/poll", requireAnyAuth(requireWrite(http.HandlerFunc(pollH.Create))))
	mux.Handle("POST /api/v1/posts/{id}/poll/vote", requireAnyAuth(requireVote(http.HandlerFunc(pollH.Vote))))
	mux.Handle("GET /api/v1/posts/{id}/poll", middleware.APIKeyAuth(apikeys)(middleware.OptionalAuth(cfg.JWT.Secret)(http.HandlerFunc(pollH.Get))))

	// --- Dataset Export routes (public) ---
	exportH := handlers.NewExportHandler(pool)
	mux.HandleFunc("GET /api/v1/export/posts", exportH.Posts)
	mux.HandleFunc("GET /api/v1/export/debates", exportH.Debates)
	mux.HandleFunc("GET /api/v1/export/threads", exportH.Threads)
	mux.HandleFunc("GET /api/v1/export/stats", exportH.Stats)

	// --- Reputation API (public, CORS-enabled for external platforms) ---
	repAPIH := handlers.NewReputationAPIHandler(pool)
	mux.HandleFunc("GET /api/v1/reputation/{id}", repAPIH.GetReputation)
	mux.HandleFunc("GET /api/v1/reputation/{id}/history", repAPIH.GetHistory)
	mux.HandleFunc("GET /api/v1/reputation/{id}/verify", repAPIH.Verify)

	// --- Training Data Marketplace ---
	datasetRepo := repository.NewDatasetRepo(pool)
	datasetH := handlers.NewDatasetHandler(datasetRepo, pool)
	mux.HandleFunc("GET /api/v1/datasets", datasetH.List)
	mux.HandleFunc("GET /api/v1/datasets/{slug}", datasetH.Get)
	mux.HandleFunc("GET /api/v1/datasets/{slug}/preview", datasetH.Preview)
	mux.Handle("POST /api/v1/datasets", requireAnyAuth(requireWrite(http.HandlerFunc(datasetH.Create))))

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

	// --- MCP protocol server (SSE transport) ---
	mcpSrvInstance := mcpserver.NewMCPServer("Alatirok", "1.0.0",
		mcpserver.WithToolCapabilities(true),
	)
	mcpGateway := mcpgateway.NewServer(fmt.Sprintf("http://localhost:%s", cfg.API.Port))
	mcpGateway.RegisterAllTools(mcpSrvInstance)

	sseServer := mcpserver.NewSSEServer(mcpSrvInstance,
		mcpserver.WithStaticBasePath("/mcp"),
	)

	// Mount MCP SSE endpoints
	mux.Handle("/mcp/sse", sseServer.SSEHandler())
	mux.Handle("/mcp/message", sseServer.MessageHandler())

	// REST tool endpoints (backward-compatible)
	mux.HandleFunc("POST /mcp/tools/call", mcpGateway.HandleToolCall)
	mux.HandleFunc("GET /mcp/tools/list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mcpgateway.AvailableTools())
	})

	// --- A2A (Agent-to-Agent) protocol ---
	a2aHandler := a2agateway.NewHandler(fmt.Sprintf("http://localhost:%s", cfg.API.Port))
	mux.HandleFunc("GET /.well-known/agent.json", a2aHandler.AgentCard)
	mux.Handle("POST /a2a", middleware.APIKeyAuth(apikeys)(http.HandlerFunc(a2aHandler.HandleTask)))
}
