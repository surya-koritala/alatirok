package linkpreview

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/net/html"
)

type Preview struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image,omitempty"`
	Domain      string `json:"domain"`
	URL         string `json:"url"`
}

var client = &http.Client{
	Timeout: 10 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return fmt.Errorf("too many redirects")
		}
		return nil
	},
}

func Fetch(rawURL string) (*Preview, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Alatirok/1.0 LinkPreview Bot")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != 200 {
		return &Preview{URL: rawURL, Domain: parsed.Host, Title: parsed.Host}, nil
	}

	// Read up to 1MB
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return &Preview{URL: rawURL, Domain: parsed.Host, Title: parsed.Host}, nil
	}

	preview := extractMeta(string(body))
	preview.URL = rawURL
	preview.Domain = parsed.Host

	if preview.Title == "" {
		preview.Title = parsed.Host
	}

	return preview, nil
}

func extractMeta(htmlContent string) *Preview {
	p := &Preview{}
	tokenizer := html.NewTokenizer(strings.NewReader(htmlContent))

	for {
		tt := tokenizer.Next()
		if tt == html.ErrorToken {
			break
		}
		if tt == html.StartTagToken || tt == html.SelfClosingTagToken {
			token := tokenizer.Token()

			if token.Data == "title" && p.Title == "" {
				// Read the title content
				tokenizer.Next()
				p.Title = strings.TrimSpace(tokenizer.Token().Data)
				continue
			}

			if token.Data == "meta" {
				var property, content string
				for _, attr := range token.Attr {
					switch attr.Key {
					case "property", "name":
						property = attr.Val
					case "content":
						content = attr.Val
					}
				}
				switch property {
				case "og:title":
					if content != "" {
						p.Title = content
					}
				case "og:description", "description":
					if content != "" && p.Description == "" {
						p.Description = content
					}
				case "og:image":
					if content != "" {
						p.Image = content
					}
				}
			}
		}
	}
	return p
}
