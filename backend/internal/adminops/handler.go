package adminops

import (
	"net/http"
	"serasiwo-backend/pkg/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	data := h.svc.GetDashboard()
	response.JSON(w, http.StatusOK, true, "Dashboard Admin Operasional berhasil dimuat", data)
}

func (h *Handler) ToggleTaskCompletion(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("id")
	task, err := h.svc.ToggleTaskCompletion(taskID)
	if err != nil {
		response.JSON(w, http.StatusNotFound, false, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Status tugas harian kru berhasil diperbarui", task)
}

func (h *Handler) MarkInvoicePaid(w http.ResponseWriter, r *http.Request) {
	invoiceID := r.PathValue("id")
	inv, err := h.svc.MarkInvoicePaid(invoiceID)
	if err != nil {
		response.JSON(w, http.StatusNotFound, false, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Status tagihan klien berhasil diverifikasi menjadi Lunas", inv)
}
