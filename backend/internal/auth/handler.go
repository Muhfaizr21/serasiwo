package auth

import (
	"encoding/json"
	"net/http"
	"serasiwo-backend/pkg/response"
	"strings"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, false, "Format data login tidak valid", nil)
		return
	}

	authRes, err := h.svc.Authenticate(req.Email, req.Password)
	if err != nil {
		response.JSON(w, http.StatusUnauthorized, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Autentikasi berhasil", authRes)
}

func (h *Handler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == "" {
		response.JSON(w, http.StatusUnauthorized, false, "Token otorisasi diperlukan", nil)
		return
	}

	user, err := h.svc.GetUserByToken(token)
	if err != nil {
		response.JSON(w, http.StatusUnauthorized, false, err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, true, "Data profil pengguna berhasil dimuat", user)
}

func (h *Handler) GetAllRoles(w http.ResponseWriter, r *http.Request) {
	roles := h.svc.GetAllRoles()
	response.JSON(w, http.StatusOK, true, "Daftar hak akses peran SerasiWO", roles)
}
