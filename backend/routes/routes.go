package routes

import (
	"net/http"
	"serasiwo-backend/config"
	"serasiwo-backend/internal/adminops"
	"serasiwo-backend/internal/auth"
	"serasiwo-backend/internal/health"
	"serasiwo-backend/internal/superadmin"
	"serasiwo-backend/internal/vendor"
	"serasiwo-backend/middlewares"
)

type ModuleHandlers struct {
	Health     *health.Handler
	Auth       *auth.Handler
	SuperAdmin *superadmin.Handler
	AdminOps   *adminops.Handler
	Vendor     *vendor.Handler
}

func NewModuleHandlers(sb *config.SupabaseClient) *ModuleHandlers {
	authSvc := auth.NewService()
	superAdminSvc := superadmin.NewService()
	adminOpsSvc := adminops.NewService()
	vendorSvc := vendor.NewService(sb)

	return &ModuleHandlers{
		Health:     health.NewHandler(sb),
		Auth:       auth.NewHandler(authSvc),
		SuperAdmin: superadmin.NewHandler(superAdminSvc),
		AdminOps:   adminops.NewHandler(adminOpsSvc),
		Vendor:     vendor.NewHandler(vendorSvc),
	}
}

func SetupRouter(sb *config.SupabaseClient) http.Handler {
	mux := http.NewServeMux()
	h := NewModuleHandlers(sb)

	// 0. System & Health Check
	mux.HandleFunc("GET /api/health", h.Health.HealthCheck)
	mux.HandleFunc("GET /api/supabase/status", h.Health.SupabaseStatus)

	// 1. Auth & Role Permission Matrix
	mux.HandleFunc("POST /api/auth/login", h.Auth.Login)
	mux.HandleFunc("GET /api/auth/me", h.Auth.GetCurrentUser)
	mux.HandleFunc("GET /api/auth/roles", h.Auth.GetAllRoles)

	// 2. Role 1: Super Admin (Pemilik WO - Full Control + Override + Laba Rugi)
	onlySuperAdmin := middlewares.RequireRole(auth.RoleSuperAdmin)
	mux.HandleFunc("GET /api/superadmin/overview", onlySuperAdmin(h.SuperAdmin.GetOverview))
	mux.HandleFunc("GET /api/superadmin/events", onlySuperAdmin(h.SuperAdmin.GetMasterEvents))
	mux.HandleFunc("POST /api/superadmin/events/{id}/override", onlySuperAdmin(h.SuperAdmin.ForceOverrideEvent))
	mux.HandleFunc("GET /api/superadmin/clients", onlySuperAdmin(h.SuperAdmin.GetClients))
	mux.HandleFunc("DELETE /api/superadmin/clients/{id}", onlySuperAdmin(h.SuperAdmin.DeleteClient))
	mux.HandleFunc("GET /api/superadmin/vendors", onlySuperAdmin(h.SuperAdmin.GetVendors))
	mux.HandleFunc("GET /api/superadmin/audit-logs", onlySuperAdmin(h.SuperAdmin.GetAuditLogs))

	// 3. Role 2: Admin Operasional (Koordinator Lapangan - Create/Read/Update, Tanpa Delete)
	onlyAdminOps := middlewares.RequireRole(auth.RoleAdminOps, auth.RoleSuperAdmin)
	mux.HandleFunc("GET /api/admin-ops/dashboard", onlyAdminOps(h.AdminOps.GetDashboard))
	mux.HandleFunc("POST /api/admin-ops/tasks/{id}/toggle", onlyAdminOps(h.AdminOps.ToggleTaskCompletion))
	mux.HandleFunc("POST /api/admin-ops/invoices/{id}/mark-paid", onlyAdminOps(h.AdminOps.MarkInvoicePaid))

	// 4. Role 3: Vendor Mitra (Katering, MUA, Dekorasi - Portal Terbatas Mitra)
	onlyVendor := middlewares.RequireRole(auth.RoleVendorMitra, auth.RoleAdminOps, auth.RoleSuperAdmin)
	mux.HandleFunc("GET /api/vendor/dashboard", onlyVendor(h.Vendor.GetDashboard))
	mux.HandleFunc("GET /api/vendor/calendar", onlyVendor(h.Vendor.GetCalendar))
	mux.HandleFunc("POST /api/vendor/calendar/toggle-block", onlyVendor(h.Vendor.ToggleDateBlock))
	mux.HandleFunc("GET /api/vendor/jobs", onlyVendor(h.Vendor.GetJobs))
	mux.HandleFunc("POST /api/vendor/jobs/{id}/action", onlyVendor(h.Vendor.ActionJob))
	mux.HandleFunc("GET /api/vendor/readiness", onlyVendor(h.Vendor.GetReadiness))
	mux.HandleFunc("POST /api/vendor/readiness/{id}/step", onlyVendor(h.Vendor.UpdateReadiness))
	mux.HandleFunc("GET /api/vendor/payouts", onlyVendor(h.Vendor.GetPayouts))
	mux.HandleFunc("POST /api/vendor/payouts", onlyVendor(h.Vendor.CreatePayout))
	mux.HandleFunc("POST /api/vendor/payouts/{id}/action", onlyVendor(h.Vendor.ActionPayout))
	mux.HandleFunc("GET /api/vendor/loading-schedules", onlyVendor(h.Vendor.GetLoadingSchedules))
	mux.HandleFunc("POST /api/vendor/loading-schedules/{eventId}/slot", onlyVendor(h.Vendor.UpdateLoadingSlot))
	mux.HandleFunc("GET /api/vendor/menu-manifests", onlyVendor(h.Vendor.GetMenuManifests))
	mux.HandleFunc("POST /api/vendor/menu-manifests/{eventId}/action", onlyVendor(h.Vendor.UpdateMenuManifest))
	mux.HandleFunc("GET /api/vendor/profile", onlyVendor(h.Vendor.GetProfile))
	mux.HandleFunc("POST /api/vendor/profile", onlyVendor(h.Vendor.UpdateProfile))

	return middlewares.CORSMiddleware(mux)
}
