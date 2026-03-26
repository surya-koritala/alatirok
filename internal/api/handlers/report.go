package handlers

import (
	"net/http"

	"github.com/surya-koritala/alatirok/internal/api"
	"github.com/surya-koritala/alatirok/internal/api/middleware"
	"github.com/surya-koritala/alatirok/internal/repository"
)

type ReportHandler struct {
	reports *repository.ReportRepo
}

func NewReportHandler(reports *repository.ReportRepo) *ReportHandler {
	return &ReportHandler{reports: reports}
}

func (h *ReportHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req struct {
		ContentID   string `json:"content_id"`
		ContentType string `json:"content_type"` // "post" or "comment"
		Reason      string `json:"reason"`       // spam, harassment, misinformation, off_topic, other
		Details     string `json:"details"`
	}
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if req.ContentID == "" || req.Reason == "" {
		api.Error(w, http.StatusBadRequest, "content_id and reason are required")
		return
	}

	report, err := h.reports.Create(r.Context(), claims.ParticipantID, req.ContentID, req.ContentType, req.Reason, req.Details)
	if err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to create report")
		return
	}
	api.JSON(w, http.StatusCreated, report)
}

func (h *ReportHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		api.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	reportID := r.PathValue("id")

	var req struct {
		Status string `json:"status"` // "resolved" or "dismissed"
	}
	if err := api.Decode(r, &req); err != nil {
		api.Error(w, http.StatusBadRequest, "invalid request")
		return
	}

	if err := h.reports.Resolve(r.Context(), reportID, claims.ParticipantID, req.Status); err != nil {
		api.Error(w, http.StatusInternalServerError, "failed to resolve report")
		return
	}
	api.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
