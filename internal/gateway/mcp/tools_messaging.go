package mcp

import (
	"fmt"
	"net/http"
	"net/url"

	mcplib "github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

func (s *Server) registerMessagingTools(srv *mcpserver.MCPServer) {
	// 38. send_message
	srv.AddTool(
		mcplib.NewTool("send_message",
			mcplib.WithDescription("Send a direct message to another participant"),
			mcplib.WithString("recipient_id", mcplib.Required(), mcplib.Description("ID of the recipient")),
			mcplib.WithString("body", mcplib.Required(), mcplib.Description("Message body")),
		),
		s.toolHandler(s.sendMessage),
	)

	// 39. list_conversations
	srv.AddTool(
		mcplib.NewTool("list_conversations",
			mcplib.WithDescription("List all conversations for the authenticated participant"),
		),
		s.toolHandler(s.listConversations),
	)

	// 40. get_conversation
	srv.AddTool(
		mcplib.NewTool("get_conversation",
			mcplib.WithDescription("Get messages in a conversation"),
			mcplib.WithString("conversation_id", mcplib.Required(), mcplib.Description("ID of the conversation")),
			mcplib.WithString("limit", mcplib.Description("Max number of messages to return")),
			mcplib.WithString("offset", mcplib.Description("Offset for pagination")),
		),
		s.toolHandler(s.getConversation),
	)

	// 41. mark_conversation_read
	srv.AddTool(
		mcplib.NewTool("mark_conversation_read",
			mcplib.WithDescription("Mark all messages in a conversation as read"),
			mcplib.WithString("conversation_id", mcplib.Required(), mcplib.Description("ID of the conversation")),
		),
		s.toolHandler(s.markConversationRead),
	)
}

// ----- messaging tool implementations -----

func (s *Server) sendMessage(apiKey string, input map[string]any) ([]byte, error) {
	payload := map[string]any{
		"recipient_id": input["recipient_id"],
		"body":         input["body"],
	}

	data, status, err := s.callAPI(http.MethodPost, "/api/v1/messages", apiKey, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("send_message failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) listConversations(apiKey string, input map[string]any) ([]byte, error) {
	data, status, err := s.callAPI(http.MethodGet, "/api/v1/messages/conversations", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("list_conversations failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) getConversation(apiKey string, input map[string]any) ([]byte, error) {
	convID, _ := input["conversation_id"].(string)
	if convID == "" {
		return nil, fmt.Errorf("conversation_id is required")
	}
	q := url.Values{}
	addQueryParam(q, input, "limit")
	addQueryParam(q, input, "offset")

	path := "/api/v1/messages/conversations/" + convID
	if qs := q.Encode(); qs != "" {
		path += "?" + qs
	}

	data, status, err := s.callAPI(http.MethodGet, path, apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("get_conversation failed (status %d): %s", status, data)
	}
	return data, nil
}

func (s *Server) markConversationRead(apiKey string, input map[string]any) ([]byte, error) {
	convID, _ := input["conversation_id"].(string)
	if convID == "" {
		return nil, fmt.Errorf("conversation_id is required")
	}

	data, status, err := s.callAPI(http.MethodPut, "/api/v1/messages/conversations/"+convID+"/read", apiKey, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("mark_conversation_read failed (status %d): %s", status, data)
	}
	return data, nil
}
