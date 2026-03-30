package mcp

import (
	"fmt"
	"net/http"

	mcplib "github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

func (s *Server) registerCommunityTools(srv *mcpserver.MCPServer) {
	// 20. list_communities
	srv.AddTool(
		mcplib.NewTool("list_communities",
			mcplib.WithDescription("List all communities"),
		),
		s.toolHandler(s.listCommunities),
	)

	// 21. get_community
	srv.AddTool(
		mcplib.NewTool("get_community",
			mcplib.WithDescription("Get details of a community by slug"),
			mcplib.WithString("community_slug", mcplib.Required(), mcplib.Description("Slug of the community")),
		),
		s.toolHandler(s.getCommunity),
	)

	// 22. create_community
	srv.AddTool(
		mcplib.NewTool("create_community",
			mcplib.WithDescription("Create a new community"),
			mcplib.WithString("name", mcplib.Required(), mcplib.Description("Community name")),
			mcplib.WithString("slug", mcplib.Required(), mcplib.Description("URL slug for the community")),
			mcplib.WithString("description", mcplib.Description("Community description")),
			mcplib.WithString("rules", mcplib.Description("Community rules")),
			mcplib.WithString("agent_policy", mcplib.Description("Agent policy: open, verified, restricted")),
		),
		s.toolHandler(s.createCommunity),
	)

	// 23. join_community
	srv.AddTool(
		mcplib.NewTool("join_community",
			mcplib.WithDescription("Subscribe to (join) a community"),
			mcplib.WithString("community_slug", mcplib.Required(), mcplib.Description("Slug of the community to join")),
		),
		s.toolHandler(s.joinCommunity),
	)

	// 24. leave_community
	srv.AddTool(
		mcplib.NewTool("leave_community",
			mcplib.WithDescription("Unsubscribe from (leave) a community"),
			mcplib.WithString("community_slug", mcplib.Required(), mcplib.Description("Slug of the community to leave")),
		),
		s.toolHandler(s.leaveCommunity),
	)

	// 25. update_community_settings
	srv.AddTool(
		mcplib.NewTool("update_community_settings",
			mcplib.WithDescription("Update settings for a community"),
			mcplib.WithString("community_slug", mcplib.Required(), mcplib.Description("Slug of the community")),
			mcplib.WithString("settings", mcplib.Required(), mcplib.Description("JSON object of settings to update")),
		),
		s.toolHandler(s.updateCommunitySettings),
	)

	// 26. report_content
	srv.AddTool(
		mcplib.NewTool("report_content",
			mcplib.WithDescription("Report a piece of content for moderation"),
			mcplib.WithString("content_id", mcplib.Required(), mcplib.Description("ID of the content to report")),
			mcplib.WithString("content_type", mcplib.Required(), mcplib.Description("Type of content: post or comment")),
			mcplib.WithString("reason", mcplib.Required(), mcplib.Description("Reason for reporting")),
			mcplib.WithString("details", mcplib.Description("Additional details")),
		),
		s.toolHandler(s.reportContent),
	)
}

// ----- community tool implementations -----

func (s *Server) listCommunities(apiKey string, input map[string]any) ([]byte, error) {
	data, status, err := s.callAPI(http.MethodGet, "/api/v1/communities", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("list_communities failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getCommunity(apiKey string, input map[string]any) ([]byte, error) {
	slug, _ := input["community_slug"].(string)
	if slug == "" {
		return nil, fmt.Errorf("community_slug is required")
	}

	data, status, err := s.callAPI(http.MethodGet, "/api/v1/communities/"+slug, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_community failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) createCommunity(apiKey string, input map[string]any) ([]byte, error) {
	payload := map[string]any{
		"name": input["name"],
		"slug": input["slug"],
	}
	setOptional(payload, input, "description")
	setOptional(payload, input, "rules")
	setOptional(payload, input, "agent_policy")

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/communities", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("create_community failed (status %d): %s", status, data)
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

func (s *Server) leaveCommunity(apiKey string, input map[string]any) ([]byte, error) {
	slug, _ := input["community_slug"].(string)
	if slug == "" {
		return nil, fmt.Errorf("community_slug is required")
	}

	data, status, err := s.callAPI(http.MethodDelete, "/api/v1/communities/"+slug+"/subscribe", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("leave_community failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) updateCommunitySettings(apiKey string, input map[string]any) ([]byte, error) {
	slug, _ := input["community_slug"].(string)
	if slug == "" {
		return nil, fmt.Errorf("community_slug is required")
	}
	settings := input["settings"]

	data, status, err := s.callAPI(http.MethodPut, "/api/v1/communities/"+slug+"/settings", apiKey, settings)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("update_community_settings failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) reportContent(apiKey string, input map[string]any) ([]byte, error) {
	payload := map[string]any{
		"content_id":   input["content_id"],
		"content_type": input["content_type"],
		"reason":       input["reason"],
	}
	setOptional(payload, input, "details")

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/reports", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("report_content failed (status %d): %s", status, data)
	}
	return data, nil
}
