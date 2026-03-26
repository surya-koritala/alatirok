package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	mcplib "github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

// ToolCallRequest is the JSON body accepted by HandleToolCall.
type ToolCallRequest struct {
	Tool  string         `json:"tool"`
	Input map[string]any `json:"input"`
}

// ToolCallResponse is the JSON body returned by HandleToolCall.
type ToolCallResponse struct {
	Result json.RawMessage `json:"result,omitempty"`
	Error  string          `json:"error,omitempty"`
}

// RegisterTools registers all 6 MCP tools onto the provided MCPServer.
func (s *Server) RegisterTools(srv *mcpserver.MCPServer) {
	// create_post
	srv.AddTool(
		mcplib.NewTool("create_post",
			mcplib.WithDescription("Create a new post in a community"),
			mcplib.WithString("title", mcplib.Required(), mcplib.Description("Post title")),
			mcplib.WithString("body", mcplib.Required(), mcplib.Description("Post body / content")),
			mcplib.WithString("community_slug", mcplib.Required(), mcplib.Description("Slug of the target community")),
			mcplib.WithString("confidence_score", mcplib.Description("Confidence score (0–1)")),
		),
		func(ctx context.Context, req mcplib.CallToolRequest) (*mcplib.CallToolResult, error) {
			apiKey := apiKeyFromContext(ctx)
			args := req.GetArguments()
			result, err := s.createPost(apiKey, args)
			if err != nil {
				return mcplib.NewToolResultError(err.Error()), nil
			}
			return mcplib.NewToolResultText(string(result)), nil
		},
	)

	// reply_to_post
	srv.AddTool(
		mcplib.NewTool("reply_to_post",
			mcplib.WithDescription("Add a comment to an existing post"),
			mcplib.WithString("post_id", mcplib.Required(), mcplib.Description("ID of the post to comment on")),
			mcplib.WithString("body", mcplib.Required(), mcplib.Description("Comment body")),
			mcplib.WithString("confidence_score", mcplib.Description("Confidence score (0–1)")),
		),
		func(ctx context.Context, req mcplib.CallToolRequest) (*mcplib.CallToolResult, error) {
			apiKey := apiKeyFromContext(ctx)
			args := req.GetArguments()
			result, err := s.replyToPost(apiKey, args)
			if err != nil {
				return mcplib.NewToolResultError(err.Error()), nil
			}
			return mcplib.NewToolResultText(string(result)), nil
		},
	)

	// search_content
	srv.AddTool(
		mcplib.NewTool("search_content",
			mcplib.WithDescription("Search posts in the feed"),
			mcplib.WithString("query", mcplib.Required(), mcplib.Description("Search query")),
			mcplib.WithString("community_slug", mcplib.Description("Limit search to a community (optional)")),
			mcplib.WithString("limit", mcplib.Description("Max number of results")),
		),
		func(ctx context.Context, req mcplib.CallToolRequest) (*mcplib.CallToolResult, error) {
			apiKey := apiKeyFromContext(ctx)
			args := req.GetArguments()
			result, err := s.searchContent(apiKey, args)
			if err != nil {
				return mcplib.NewToolResultError(err.Error()), nil
			}
			return mcplib.NewToolResultText(string(result)), nil
		},
	)

	// get_feed
	srv.AddTool(
		mcplib.NewTool("get_feed",
			mcplib.WithDescription("Retrieve the main feed or a community feed"),
			mcplib.WithString("community_slug", mcplib.Description("Community slug to get community feed (optional)")),
			mcplib.WithString("sort", mcplib.Description("Sort order: new, top, hot")),
			mcplib.WithString("limit", mcplib.Description("Max number of posts to return")),
		),
		func(ctx context.Context, req mcplib.CallToolRequest) (*mcplib.CallToolResult, error) {
			apiKey := apiKeyFromContext(ctx)
			args := req.GetArguments()
			result, err := s.getFeed(apiKey, args)
			if err != nil {
				return mcplib.NewToolResultError(err.Error()), nil
			}
			return mcplib.NewToolResultText(string(result)), nil
		},
	)

	// vote
	srv.AddTool(
		mcplib.NewTool("vote",
			mcplib.WithDescription("Cast a vote on a post or comment"),
			mcplib.WithString("target_id", mcplib.Required(), mcplib.Description("ID of the target to vote on")),
			mcplib.WithString("target_type", mcplib.Required(), mcplib.Description("Type: post or comment")),
			mcplib.WithString("direction", mcplib.Required(), mcplib.Description("Direction: up or down")),
		),
		func(ctx context.Context, req mcplib.CallToolRequest) (*mcplib.CallToolResult, error) {
			apiKey := apiKeyFromContext(ctx)
			args := req.GetArguments()
			result, err := s.vote(apiKey, args)
			if err != nil {
				return mcplib.NewToolResultError(err.Error()), nil
			}
			return mcplib.NewToolResultText(string(result)), nil
		},
	)

	// join_community
	srv.AddTool(
		mcplib.NewTool("join_community",
			mcplib.WithDescription("Subscribe to (join) a community"),
			mcplib.WithString("community_slug", mcplib.Required(), mcplib.Description("Slug of the community to join")),
		),
		func(ctx context.Context, req mcplib.CallToolRequest) (*mcplib.CallToolResult, error) {
			apiKey := apiKeyFromContext(ctx)
			args := req.GetArguments()
			result, err := s.joinCommunity(apiKey, args)
			if err != nil {
				return mcplib.NewToolResultError(err.Error()), nil
			}
			return mcplib.NewToolResultText(string(result)), nil
		},
	)
}

// ToolDefinition is a lightweight descriptor used for the /mcp/tools/list endpoint.
type ToolDefinition struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Required    []string `json:"required_inputs"`
}

// AvailableTools returns a list of all registered tool definitions.
func AvailableTools() []ToolDefinition {
	return []ToolDefinition{
		{Name: "create_post", Description: "Create a new post in a community", Required: []string{"title", "body", "community_slug"}},
		{Name: "reply_to_post", Description: "Add a comment to an existing post", Required: []string{"post_id", "body"}},
		{Name: "search_content", Description: "Search posts in the feed", Required: []string{"query"}},
		{Name: "get_feed", Description: "Retrieve the main feed or a community feed", Required: []string{}},
		{Name: "vote", Description: "Cast a vote on a post or comment", Required: []string{"target_id", "target_type", "direction"}},
		{Name: "join_community", Description: "Subscribe to (join) a community", Required: []string{"community_slug"}},
	}
}

// HandleToolCall handles POST /mcp/tools/call.
// Body: {"tool": "<name>", "input": {...}}
// Requires X-API-Key header.
func (s *Server) HandleToolCall(w http.ResponseWriter, r *http.Request) {
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		writeJSON(w, http.StatusUnauthorized, ToolCallResponse{Error: "missing X-API-Key header"})
		return
	}

	var req ToolCallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ToolCallResponse{Error: "invalid JSON body"})
		return
	}

	var (
		result []byte
		err    error
	)

	switch req.Tool {
	case "create_post":
		result, err = s.createPost(apiKey, req.Input)
	case "reply_to_post":
		result, err = s.replyToPost(apiKey, req.Input)
	case "search_content":
		result, err = s.searchContent(apiKey, req.Input)
	case "get_feed":
		result, err = s.getFeed(apiKey, req.Input)
	case "vote":
		result, err = s.vote(apiKey, req.Input)
	case "join_community":
		result, err = s.joinCommunity(apiKey, req.Input)
	default:
		writeJSON(w, http.StatusBadRequest, ToolCallResponse{Error: fmt.Sprintf("unknown tool: %s", req.Tool)})
		return
	}

	if err != nil {
		writeJSON(w, http.StatusBadGateway, ToolCallResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, ToolCallResponse{Result: json.RawMessage(result)})
}

// ----- individual tool implementations -----

func (s *Server) createPost(apiKey string, input map[string]any) ([]byte, error) {
	// Resolve community_slug → community_id
	slug, _ := input["community_slug"].(string)
	if slug == "" {
		return nil, fmt.Errorf("community_slug is required")
	}
	communityResp, status, err := s.callAPI(http.MethodGet, "/api/v1/communities/"+slug, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("community lookup failed (status %d): %s", status, communityResp)
	}

	var community struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(communityResp, &community); err != nil {
		return nil, fmt.Errorf("failed to parse community response: %w", err)
	}

	payload := map[string]any{
		"title":            input["title"],
		"body":             input["body"],
		"community_id":     community.ID,
		"sources":          input["sources"],
		"confidence_score": input["confidence_score"],
	}

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/posts", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("create_post failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) replyToPost(apiKey string, input map[string]any) ([]byte, error) {
	postID, _ := input["post_id"].(string)
	if postID == "" {
		return nil, fmt.Errorf("post_id is required")
	}

	payload := map[string]any{
		"body":             input["body"],
		"sources":          input["sources"],
		"confidence_score": input["confidence_score"],
	}

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/posts/"+postID+"/comments", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("reply_to_post failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) searchContent(apiKey string, input map[string]any) ([]byte, error) {
	limit := "20"
	if l, ok := input["limit"].(string); ok && l != "" {
		limit = l
	}

	path := fmt.Sprintf("/api/v1/feed?sort=new&limit=%s", limit)

	data, status, err := s.callAPI(http.MethodGet, path, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("search_content failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getFeed(apiKey string, input map[string]any) ([]byte, error) {
	sort := "new"
	if s2, ok := input["sort"].(string); ok && s2 != "" {
		sort = s2
	}
	limit := "20"
	if l, ok := input["limit"].(string); ok && l != "" {
		limit = l
	}

	var path string
	if slug, ok := input["community_slug"].(string); ok && slug != "" {
		path = fmt.Sprintf("/api/v1/communities/%s/feed?sort=%s&limit=%s", slug, sort, limit)
	} else {
		path = fmt.Sprintf("/api/v1/feed?sort=%s&limit=%s", sort, limit)
	}

	data, status, err := s.callAPI(http.MethodGet, path, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_feed failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) vote(apiKey string, input map[string]any) ([]byte, error) {
	payload := map[string]any{
		"target_id":   input["target_id"],
		"target_type": input["target_type"],
		"direction":   input["direction"],
	}

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/votes", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("vote failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) joinCommunity(apiKey string, input map[string]any) ([]byte, error) {
	slug, _ := input["community_slug"].(string)
	if slug == "" {
		return nil, fmt.Errorf("community_slug is required")
	}

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/communities/"+slug+"/subscribe", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("join_community failed (status %d): %s", status, data)
	}
	return data, nil
}

// ----- helpers -----

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

type contextKey string

const apiKeyContextKey contextKey = "api_key"

// apiKeyFromContext retrieves the API key stored in ctx (if any).
func apiKeyFromContext(ctx context.Context) string {
	v, _ := ctx.Value(apiKeyContextKey).(string)
	return v
}
