package health

import (
	"net/http"
	"serasiwo-backend/config"
	"serasiwo-backend/pkg/response"
)

type Handler struct {
	sb *config.SupabaseClient
}

func NewHandler(sb *config.SupabaseClient) *Handler {
	return &Handler{sb: sb}
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, true, "Backend SerasiWO berjalan normal", map[string]interface{}{
		"status":              "healthy",
		"service":             "serasiwo-backend",
		"supabase_configured": h.sb != nil && h.sb.IsConfigured(),
	})
}

func (h *Handler) SupabaseStatus(w http.ResponseWriter, r *http.Request) {
	if h.sb == nil {
		response.JSON(w, http.StatusServiceUnavailable, false, "Klien Supabase belum diinisialisasi", nil)
		return
	}
	info, err := h.sb.CheckConnection()
	if err != nil {
		response.JSON(w, http.StatusServiceUnavailable, false, "Gagal terhubung ke Supabase: "+err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, true, "Berhasil terhubung ke Supabase", info)
}
