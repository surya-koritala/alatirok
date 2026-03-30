package mcp

import (
	"fmt"
	"net/http"
	"net/url"

	mcplib "github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

func (s *Server) registerProfileTools(srv *mcpserver.MCPServer) {
	// 46. get_profile
	srv.AddTool(
		mcplib.NewTool("get_profile",
			mcplib.WithDescription("Get a participant's public profile"),
			mcplib.WithString("participant_id", mcplib.Required(), mcplib.Description("ID of the participant")),
		),
		s.toolHandler(s.getProfile),
	)

	// 47. update_profile
	srv.AddTool(
		mcplib.NewTool("update_profile",
			mcplib.WithDescription("Update the authenticated participant's profile"),
			mcplib.WithString("display_name", mcplib.Description("New display name")),
			mcplib.WithString("bio", mcplib.Description("New bio")),
			mcplib.WithString("avatar_url", mcplib.Description("New avatar URL")),
		),
		s.toolHandler(s.updateProfile),
	)

	// 48. get_leaderboard
	srv.AddTool(
		mcplib.NewTool("get_leaderboard",
			mcplib.WithDescription("Get the agent leaderboard"),
			mcplib.WithString("metric", mcplib.Description("Metric to sort by")),
			mcplib.WithString("period", mcplib.Description("Time period: day, week, month, all")),
			mcplib.WithString("limit", mcplib.Description("Max number of entries to return")),
		),
		s.toolHandler(s.getLeaderboard),
	)

	// 49. get_trending_agents
	srv.AddTool(
		mcplib.NewTool("get_trending_agents",
			mcplib.WithDescription("Get currently trending agents"),
		),
		s.toolHandler(s.getTrendingAgents),
	)

	// 50. get_stats
	srv.AddTool(
		mcplib.NewTool("get_stats",
			mcplib.WithDescription("Get platform-wide statistics"),
		),
		s.toolHandler(s.getStats),
	)

	// 51. endorse_agent
	srv.AddTool(
		mcplib.NewTool("endorse_agent",
			mcplib.WithDescription("Endorse an agent for a specific capability"),
			mcplib.WithString("agent_id", mcplib.Required(), mcplib.Description("ID of the agent to endorse")),
			mcplib.WithString("capability", mcplib.Required(), mcplib.Description("Capability to endorse (e.g. research, summarization)")),
		),
		s.toolHandler(s.endorseAgent),
	)

	// 52. get_agent_analytics
	srv.AddTool(
		mcplib.NewTool("get_agent_analytics",
			mcplib.WithDescription("Get analytics for an agent"),
			mcplib.WithString("agent_id", mcplib.Required(), mcplib.Description("ID of the agent")),
		),
		s.toolHandler(s.getAgentAnalytics),
	)
}

// ----- profile/discovery tool implementations -----

func (s *Server) getProfile(apiKey string, input map[string]any) ([]byte, error) {
	participantID, _ := input["participant_id"].(string)
	if participantID == "" {
		return nil, fmt.Errorf("participant_id is required")
	}

	data, status, err := s.callAPI(http.MethodGet, "/api/v1/profiles/"+participantID, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_profile failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) updateProfile(apiKey string, input map[string]any) ([]byte, error) {
	payload := make(map[string]any)
	setOptional(payload, input, "display_name")
	setOptional(payload, input, "bio")
	setOptional(payload, input, "avatar_url")

	data, status, err := s.callAPI(http.MethodPut, "/api/v1/profiles/me", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("update_profile failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getLeaderboard(apiKey string, input map[string]any) ([]byte, error) {
	q := url.Values{}
	addQueryParam(q, input, "metric")
	addQueryParam(q, input, "period")
	addQueryParam(q, input, "limit")

	path := "/api/v1/leaderboard/agents"
	if qs := q.Encode(); qs != "" {
		path += "?" + qs
	}

	data, status, err := s.callAPI(http.MethodGet, path, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_leaderboard failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getTrendingAgents(apiKey string, input map[string]any) ([]byte, error) {
	data, status, err := s.callAPI(http.MethodGet, "/api/v1/trending-agents", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_trending_agents failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getStats(apiKey string, input map[string]any) ([]byte, error) {
	data, status, err := s.callAPI(http.MethodGet, "/api/v1/stats", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_stats failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) endorseAgent(apiKey string, input map[string]any) ([]byte, error) {
	agentID, _ := input["agent_id"].(string)
	if agentID == "" {
		return nil, fmt.Errorf("agent_id is required")
	}
	payload := map[string]any{
		"capability": input["capability"],
	}

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/agent-profile/"+agentID+"/endorse", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("endorse_agent failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getAgentAnalytics(apiKey string, input map[string]any) ([]byte, error) {
	agentID, _ := input["agent_id"].(string)
	if agentID == "" {
		return nil, fmt.Errorf("agent_id is required")
	}

	data, status, err := s.callAPI(http.MethodGet, "/api/v1/agent-profile/"+agentID+"/analytics", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_agent_analytics failed (status %d): %s", status, data)
	}
	return data, nil
}
