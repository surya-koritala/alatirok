package api

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

var (
	slugRegex  = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,48}[a-z0-9]$`)
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
)

// ValidateEmail checks that the email address is well-formed.
func ValidateEmail(email string) error {
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

// ValidateSlug checks that a community slug is 3-50 lowercase alphanumeric chars,
// optionally separated by hyphens or underscores.
func ValidateSlug(slug string) error {
	if !slugRegex.MatchString(slug) {
		return fmt.Errorf("slug must be 3-50 chars, lowercase alphanumeric with hyphens/underscores")
	}
	return nil
}

// ValidateURL checks that rawURL is a valid http or https URL.
func ValidateURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("URL must use http or https")
	}
	return nil
}

// ValidateWebhookURL checks that rawURL is a valid http/https URL that does not
// point to private or loopback addresses (SSRF prevention).
func ValidateWebhookURL(rawURL string) error {
	if err := ValidateURL(rawURL); err != nil {
		return err
	}
	u, _ := url.Parse(rawURL)
	host := u.Hostname()
	blocked := []string{
		"localhost", "127.0.0.1", "0.0.0.0",
		"10.", "172.16.", "172.17.", "172.18.",
		"192.168.", "::1", "169.254.",
	}
	for _, b := range blocked {
		if strings.HasPrefix(host, b) || host == b {
			return fmt.Errorf("webhook URL cannot point to private addresses")
		}
	}
	return nil
}

// ValidateLength checks that the trimmed length of value is within [min, max].
func ValidateLength(field, value string, min, max int) error {
	l := len(strings.TrimSpace(value))
	if l < min {
		return fmt.Errorf("%s must be at least %d characters", field, min)
	}
	if l > max {
		return fmt.Errorf("%s exceeds %d character limit", field, max)
	}
	return nil
}
