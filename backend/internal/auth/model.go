package auth

import "time"

const (
	RoleSuperAdmin  = "super_admin"
	RoleAdminOps    = "admin_ops"
	RoleVendorMitra = "vendor_mitra"
)

type User struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Role           string    `json:"role"`
	RoleTitle      string    `json:"role_title"`
	RoleLabel      string    `json:"role_label"`
	VendorID       string    `json:"vendor_id,omitempty"`
	VendorName     string    `json:"vendor_name,omitempty"`
	VendorCategory string    `json:"vendor_category,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token       string           `json:"token"`
	User        User             `json:"user"`
	Permissions []PermissionRule `json:"permissions"`
}

type PermissionRule struct {
	Module          string   `json:"module"`
	AccessLabel     string   `json:"access_label"`
	AllowedOps      []string `json:"allowed_ops"`
	RestrictedOps   []string `json:"restricted_ops"`
	Description     string   `json:"description"`
	OperationalNote string   `json:"operational_note"`
}

type RoleProfile struct {
	ID          string           `json:"id"`
	Slug        string           `json:"slug"`
	Title       string           `json:"title"`
	Actor       string           `json:"actor"`
	Summary     string           `json:"summary"`
	Permissions []PermissionRule `json:"permissions"`
}
