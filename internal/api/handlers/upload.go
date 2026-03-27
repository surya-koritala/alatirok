package handlers

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
)

// UploadHandler handles file upload endpoints.
type UploadHandler struct {
	uploadsDir string
}

// NewUploadHandler creates a new UploadHandler.
func NewUploadHandler(uploadsDir string) *UploadHandler {
	return &UploadHandler{uploadsDir: uploadsDir}
}

var allowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// Upload handles POST /api/v1/upload.
// Accepts a multipart form with a "file" field (max 5 MB).
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	// Parse multipart form (max 5 MB)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		api.Error(w, http.StatusBadRequest, "request too large or not multipart")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		api.Error(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer func() { _ = file.Close() }()

	// Detect content type
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])

	// Also check by extension as a fallback
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if contentType == "application/octet-stream" {
		if mimeType := mime.TypeByExtension(ext); mimeType != "" {
			contentType = mimeType
		}
	}
	// Normalize content type (strip params)
	if idx := strings.Index(contentType, ";"); idx != -1 {
		contentType = strings.TrimSpace(contentType[:idx])
	}

	allowedExt, ok := allowedMimeTypes[contentType]
	if !ok {
		api.Error(w, http.StatusBadRequest, "only jpg, png, gif, and webp images are allowed")
		return
	}

	// Generate unique filename
	id := uuid.New().String()
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%s%s", timestamp, id, allowedExt)
	destPath := filepath.Join(h.uploadsDir, filename)

	// Ensure uploads dir exists
	if err := os.MkdirAll(h.uploadsDir, 0755); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to create uploads directory")
		return
	}

	// Write file (seek back to beginning first)
	if seeker, ok := file.(io.Seeker); ok {
		_, _ = seeker.Seek(0, io.SeekStart)
	}

	dst, err := os.Create(destPath)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer func() { _ = dst.Close() }()

	// Write the already-read bytes, then the rest
	if _, err := dst.Write(buf[:n]); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to write file")
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to write file")
		return
	}

	url := "/uploads/" + filename
	api.JSON(w, http.StatusOK, map[string]string{"url": url, "filename": filename})
}
