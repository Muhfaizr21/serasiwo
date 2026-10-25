package superadmin

import (
	"encoding/json"
	"net/http"
	"serasiwo-backend/pkg/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetOverview(w http.ResponseWriter, r *http.Request) {
	data := h.svc.GetOverview()
	response.JSON(w, http.StatusOK, true, "Ringkasan metrik Super Admin berhasil dimuat", data)
}

func (h *Handler) GetMasterEvents(w http.ResponseWriter, r *http.Request) {
	events := h.svc.GetMasterEvents()
	response.JSON(w, http.StatusOK, true, "Jadwal kalender master berhasil dimuat", events)
}

func (h *Handler) ForceOverrideEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	if eventID == "" {
		response.JSON(w, http.StatusBadRequest, false, "ID acara diperlukan", nil)
		return
	}

	var req OverrideEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format permintaan override tidak valid", nil)
		return
	}

	ev, err := h.svc.ForceOverrideEvent(eventID, req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Override jadwal acara berhasil diterapkan oleh Super Admin", ev)
}

func (h *Handler) GetClients(w http.ResponseWriter, r *http.Request) {
	clients := h.svc.GetClients()
	response.JSON(w, http.StatusOK, true, "Daftar klien dan proyek berhasil dimuat", clients)
}

func (h *Handler) DeleteClient(w http.ResponseWriter, r *http.Request) {
	clientID := r.PathValue("id")
	if err := h.svc.DeleteClient(clientID); err != nil {
		response.JSON(w, http.StatusNotFound, false, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Data klien berhasil dihapus permanen oleh Super Admin", nil)
}

func (h *Handler) GetVendors(w http.ResponseWriter, r *http.Request) {
	vendors := h.svc.GetVendors()
	response.JSON(w, http.StatusOK, true, "Daftar mitra vendor berhasil dimuat", vendors)
}

func (h *Handler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	logs := h.svc.GetAuditLogs()
	response.JSON(w, http.StatusOK, true, "Log audit aktivitas sistem berhasil dimuat", logs)
}
