package middlewares

import (
	"context"
	"net/http"
	"serasiwo-backend/config"
	"serasiwo-backend/pkg/response"
	"strings"
)

type contextKey string

const (
	UserContextKey contextKey = "supabase_user"
	RoleContextKey contextKey = "serasiwo_role"
)

func RequireSupabaseAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			response.JSON(w, http.StatusUnauthorized, false, "Header Authorization diperlukan", nil)
			return
		}

		user, err := config.Supabase.GetUser(authHeader)
		if err != nil {
			response.JSON(w, http.StatusUnauthorized, false, "Autentikasi gagal: "+err.Error(), nil)
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next(w, r.WithContext(ctx))
	}
}

func RequireRole(allowedRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			roleHeader := strings.TrimSpace(r.Header.Get("X-Serasi-Role"))
			if roleHeader == "" {
				// Allow default role pass-through during local UI preview when header is omitted
				next(w, r)
				return
			}

			for _, allowed := range allowedRoles {
				if roleHeader == allowed {
					ctx := context.WithValue(r.Context(), RoleContextKey, roleHeader)
					next(w, r.WithContext(ctx))
					return
				}
			}

			response.JSON(
				w,
				http.StatusForbidden,
				false,
				"Akses ditolak: peran "+roleHeader+" tidak memiliki izin pada modul ini",
				nil,
			)
		}
	}
}
