package quality

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// SourceResult holds the validation result for a single URL.
type SourceResult struct {
	URL           string
	Domain        string
	Status        string // "verified", "unverified", "invalid", "blocked"
	HTTPStatus    int
	ContentType   string
	PageTitle     string
	TitleMatch    bool
	BlockedReason string
}

var titleRe = regexp.MustCompile(`(?i)<title[^>]*>(.*?)</title>`)
var ogTitleRe = regexp.MustCompile(`(?i)<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']`)
var ogDescRe = regexp.MustCompile(`(?i)<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']`)

// ValidateSource checks a single URL for validity.
// postBody is used for title/content matching.
func ValidateSource(ctx context.Context, rawURL string, postBody string) SourceResult {
	result := SourceResult{URL: rawURL}

	// Parse URL
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		result.Status = "invalid"
		result.BlockedReason = "malformed URL"
		return result
	}

	result.Domain = strings.ToLower(parsed.Hostname())

	// Check blocklist
	if blocked, reason := IsBlocked(result.Domain); blocked {
		result.Status = "blocked"
		result.BlockedReason = reason
		return result
	}

	// Go straight to limited GET for better compatibility.
	// Many sites block HEAD requests or return 403 for bot User-Agents.
	result = fetchAndMatch(ctx, rawURL, postBody, result)

	return result
}

// fetchAndMatch does a limited GET to extract page title and compare with post body.
func fetchAndMatch(ctx context.Context, rawURL string, postBody string, result SourceResult) SourceResult {
	client := &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, "GET", rawURL, nil)
	if err != nil {
		result.Status = "unverified"
		return result
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Alatirok/1.0; +https://www.alatirok.com)")

	resp, err := client.Do(req)
	if err != nil {
		result.Status = "invalid"
		result.BlockedReason = "request failed"
		return result
	}
	defer resp.Body.Close()

	result.HTTPStatus = resp.StatusCode
	result.ContentType = resp.Header.Get("Content-Type")

	if resp.StatusCode >= 400 {
		result.Status = "invalid"
		result.BlockedReason = "HTTP error"
		return result
	}

	// Non-HTML content (PDF, image, etc.) — URL resolves, mark as unverified
	if !strings.Contains(result.ContentType, "text/html") && result.ContentType != "" {
		result.Status = "unverified"
		return result
	}

	// Read first 64KB only
	limited := io.LimitReader(resp.Body, 64*1024)
	body, err := io.ReadAll(limited)
	if err != nil {
		result.Status = "unverified"
		return result
	}

	html := string(body)

	// Extract title
	if m := titleRe.FindStringSubmatch(html); len(m) > 1 {
		result.PageTitle = strings.TrimSpace(m[1])
	}
	if result.PageTitle == "" {
		if m := ogTitleRe.FindStringSubmatch(html); len(m) > 1 {
			result.PageTitle = strings.TrimSpace(m[1])
		}
	}

	// Extract OG description for matching
	var ogDesc string
	if m := ogDescRe.FindStringSubmatch(html); len(m) > 1 {
		ogDesc = strings.TrimSpace(m[1])
	}

	// Match: check if page title or OG description terms overlap with post body
	pageText := strings.ToLower(result.PageTitle + " " + ogDesc)
	postLower := strings.ToLower(postBody)

	if pageText != "" && termOverlap(pageText, postLower) > 0.15 {
		result.Status = "verified"
		result.TitleMatch = true
	} else if result.PageTitle != "" {
		result.Status = "unverified"
		result.TitleMatch = false
	} else {
		result.Status = "unverified"
	}

	return result
}

// termOverlap computes Jaccard-like overlap between significant words in two texts.
func termOverlap(a, b string) float64 {
	wordsA := significantWords(a)
	wordsB := significantWords(b)
	if len(wordsA) == 0 || len(wordsB) == 0 {
		return 0
	}

	setB := make(map[string]bool, len(wordsB))
	for _, w := range wordsB {
		setB[w] = true
	}

	matches := 0
	for _, w := range wordsA {
		if setB[w] {
			matches++
		}
	}

	return float64(matches) / float64(len(wordsA))
}

// significantWords extracts words >= 4 chars, excluding common stop words.
func significantWords(text string) []string {
	stopWords := map[string]bool{
		"the": true, "and": true, "for": true, "are": true, "but": true,
		"not": true, "you": true, "all": true, "can": true, "had": true,
		"her": true, "was": true, "one": true, "our": true, "out": true,
		"this": true, "that": true, "with": true, "have": true, "from": true,
		"they": true, "been": true, "said": true, "each": true, "which": true,
		"their": true, "will": true, "other": true, "about": true, "many": true,
		"then": true, "them": true, "these": true, "some": true, "would": true,
		"make": true, "like": true, "into": true, "more": true, "also": true,
	}

	words := strings.Fields(text)
	var result []string
	for _, w := range words {
		w = strings.Trim(w, ".,;:!?\"'()[]{}—-")
		if len(w) >= 4 && !stopWords[w] {
			result = append(result, w)
		}
	}
	return result
}
