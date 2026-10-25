package vendor

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

func resolveVendorID(r *http.Request) string {
	if id := r.URL.Query().Get("vendor_id"); id != "" {
		return id
	}
	return DefaultVendorID
}

func (h *Handler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.GetDashboard(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat dashboard vendor", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Dashboard vendor berhasil dimuat", data)
}

func (h *Handler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	blocks, events, err := h.svc.GetCalendar(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat kalender vendor", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Kalender vendor berhasil dimuat", map[string]interface{}{
		"blocked_dates": blocks,
		"wo_events":     events,
	})
}

func (h *Handler) ToggleDateBlock(w http.ResponseWriter, r *http.Request) {
	var req DateBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format permintaan tanggal tidak valid", nil)
		return
	}

	block, err := h.svc.ToggleDateBlock(resolveVendorID(r), req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	actionMsg := "Tanggal berhasil diblokir"
	if !req.IsBlocked {
		actionMsg = "Blokir tanggal berhasil dibuka"
	}
	response.JSON(w, http.StatusOK, true, actionMsg, block)
}

func (h *Handler) GetJobs(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	jobs, err := h.svc.GetJobs(resolveVendorID(r), status)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal mengambil daftar pekerjaan", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Daftar pekerjaan vendor berhasil dimuat", jobs)
}

func (h *Handler) ActionJob(w http.ResponseWriter, r *http.Request) {
	jobID := r.PathValue("id")
	if jobID == "" {
		response.JSON(w, http.StatusBadRequest, false, "ID pekerjaan diperlukan", nil)
		return
	}

	var req JobActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format aksi tidak valid", nil)
		return
	}

	job, err := h.svc.UpdateJobAction(resolveVendorID(r), jobID, req.Action, req.Reason)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	msg := "Pesanan pekerjaan berhasil diterima dan masuk ke jadwal produksi"
	if req.Action == "tolak" {
		msg = "Pesanan pekerjaan ditolak. WO akan diberi tahu untuk menugaskan vendor alternatif."
	}
	response.JSON(w, http.StatusOK, true, msg, job)
}

func (h *Handler) GetReadiness(w http.ResponseWriter, r *http.Request) {
	readinessList, err := h.svc.GetReadiness(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat status kesiapan", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Status kesiapan operasional berhasil dimuat", readinessList)
}

func (h *Handler) UpdateReadiness(w http.ResponseWriter, r *http.Request) {
	jobID := r.PathValue("id")
	if jobID == "" {
		response.JSON(w, http.StatusBadRequest, false, "ID pekerjaan diperlukan", nil)
		return
	}

	var req ReadinessUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format update kesiapan tidak valid", nil)
		return
	}

	updated, err := h.svc.UpdateReadinessStep(resolveVendorID(r), jobID, req.StepID, req.Completed, req.ProofNote)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Status progres kesiapan berhasil diperbarui", updated)
}

func (h *Handler) GetPayouts(w http.ResponseWriter, r *http.Request) {
	payouts, err := h.svc.GetPayouts(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat riwayat payout", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Riwayat pencairan payout berhasil dimuat", payouts)
}

func (h *Handler) CreatePayout(w http.ResponseWriter, r *http.Request) {
	var req CreatePayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format pengajuan invoice tidak valid", nil)
		return
	}

	payout, err := h.svc.CreatePayout(resolveVendorID(r), req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusCreated, true, "Invoice tagihan berhasil diunggah dan masuk antrian verifikasi WO", payout)
}

func (h *Handler) ActionPayout(w http.ResponseWriter, r *http.Request) {
	payoutID := r.PathValue("id")
	if payoutID == "" {
		response.JSON(w, http.StatusBadRequest, false, "ID tagihan diperlukan", nil)
		return
	}

	var req PayoutActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format aksi tagihan tidak valid", nil)
		return
	}

	updated, err := h.svc.UpdatePayoutAction(resolveVendorID(r), payoutID, req.Action, req.Notes)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	msg := "Status tagihan berhasil diperbarui"
	switch req.Action {
	case "verifikasi", "proses":
		msg = "Faktur berhasil diverifikasi dan diteruskan ke antrian pencairan WO"
	case "cairkan":
		msg = "Dana tagihan berhasil dicairkan (lunas) ke rekening mitra"
	case "batalkan":
		msg = "Pengajuan faktur berhasil dibatalkan"
	}
	response.JSON(w, http.StatusOK, true, msg, updated)
}

func (h *Handler) GetLoadingSchedules(w http.ResponseWriter, r *http.Request) {
	schedules, err := h.svc.GetLoadingSchedules(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat jadwal loading dapur", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Jadwal loading dapur berhasil dimuat", schedules)
}

func (h *Handler) UpdateLoadingSlot(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	if eventID == "" {
		response.JSON(w, http.StatusBadRequest, false, "ID acara diperlukan", nil)
		return
	}

	var req LoadingSlotUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format pembaruan jadwal loading tidak valid", nil)
		return
	}

	updated, err := h.svc.UpdateLoadingSlot(resolveVendorID(r), eventID, req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Jadwal loading dapur berhasil diperbarui", updated)
}

func (h *Handler) GetMenuManifests(w http.ResponseWriter, r *http.Request) {
	manifests, err := h.svc.GetMenuManifests(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat manifest hidangan", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Manifest hidangan & surat jalan berhasil dimuat", manifests)
}

func (h *Handler) UpdateMenuManifest(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	if eventID == "" {
		response.JSON(w, http.StatusBadRequest, false, "ID acara diperlukan", nil)
		return
	}

	var req MenuManifestUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format pembaruan manifest hidangan tidak valid", nil)
		return
	}

	updated, err := h.svc.UpdateMenuManifest(resolveVendorID(r), eventID, req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Manifest hidangan berhasil diperbarui", updated)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	prof, err := h.svc.GetProfile(resolveVendorID(r))
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, false, "Gagal memuat profil vendor", nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Profil vendor berhasil dimuat", prof)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req VendorProfileUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format pembaruan profil tidak valid", nil)
		return
	}

	updated, err := h.svc.UpdateProfile(resolveVendorID(r), req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Profil badan usaha & kapasitas dapur berhasil diperbarui", updated)
}
