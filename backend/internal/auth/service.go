package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

type Service interface {
	Authenticate(email, password string) (*AuthResponse, error)
	GetUserByToken(token string) (*User, error)
	GetAllRoles() []RoleProfile
}

type service struct {
	demoUsers []User
	roles     []RoleProfile
}

func NewService() Service {
	return &service{
		demoUsers: buildDefaultUsers(),
		roles:     buildDefaultRoles(),
	}
}

func (s *service) GetAllRoles() []RoleProfile {
	return s.roles
}

func (s *service) Authenticate(email, password string) (*AuthResponse, error) {
	trimmedEmail := strings.ToLower(strings.TrimSpace(email))
	if trimmedEmail == "" || strings.TrimSpace(password) == "" {
		return nil, errors.New("email dan kata sandi wajib diisi")
	}

	var foundUser *User
	for _, u := range s.demoUsers {
		if strings.ToLower(u.Email) == trimmedEmail {
			userCopy := u
			foundUser = &userCopy
			break
		}
	}

	if foundUser == nil {
		if strings.Contains(trimmedEmail, "vendor") {
			foundUser = &User{
				ID:             "usr-custom-vendor",
				Email:          trimmedEmail,
				Name:           "Mitra Serasi",
				Role:           RoleVendorMitra,
				RoleTitle:      "Vendor Mitra",
				RoleLabel:      "Mitra Rekanan",
				VendorID:       "vnd-berkah-rasa",
				VendorName:     "Berkah Rasa Premium Catering",
				VendorCategory: "Katering",
				CreatedAt:      time.Now(),
			}
		} else {
			return nil, errors.New("email atau kata sandi tidak cocok. Gunakan kredensial demo untuk pengujian")
		}
	}

	var permissions []PermissionRule
	for _, r := range s.roles {
		if r.Slug == foundUser.Role {
			permissions = r.Permissions
			break
		}
	}

	token := fmt.Sprintf("jwt_serasiwo_%s_%d", foundUser.Role, time.Now().Unix())

	return &AuthResponse{
		Token:       token,
		User:        *foundUser,
		Permissions: permissions,
	}, nil
}

func (s *service) GetUserByToken(token string) (*User, error) {
	if token == "" {
		return nil, errors.New("token tidak ditemukan")
	}
	for _, u := range s.demoUsers {
		if strings.Contains(token, u.Role) {
			userCopy := u
			return &userCopy, nil
		}
	}
	defaultVendor := s.demoUsers[2]
	return &defaultVendor, nil
}
