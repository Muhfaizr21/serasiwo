package controllers

import (
	"net/http"
	"serasiwo-backend/views"
)

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	views.RenderJSON(w, http.StatusOK, true, "Backend SerasiWO berjalan normal", map[string]string{
		"status":  "healthy",
		"service": "serasiwo-backend",
	})
}
