package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/linkpreview"
)

type LinkPreviewHandler struct{}

func NewLinkPreviewHandler() *LinkPreviewHandler {
	return &LinkPreviewHandler{}
}

func (h *LinkPreviewHandler) Fetch(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		api.Error(w, http.StatusBadRequest, "url parameter is required")
		return
	}

	preview, err := linkpreview.Fetch(url)
	if err != nil {
		api.Error(w, http.StatusBadGateway, "failed to fetch link preview")
		return
	}

	api.JSON(w, http.StatusOK, preview)
}
