package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type SupabaseClient struct {
	BaseURL        string
	PublishableKey string
	SecretKey      string
	JWKSURL        string
	HTTPClient     *http.Client
}

var Supabase *SupabaseClient

func InitSupabase(cfg *Config) *SupabaseClient {
	Supabase = &SupabaseClient{
		BaseURL:        strings.TrimRight(cfg.SupabaseURL, "/"),
		PublishableKey: cfg.SupabasePublishableKey,
		SecretKey:      cfg.SupabaseSecretKey,
		JWKSURL:        cfg.SupabaseJWKSURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
	return Supabase
}

func (s *SupabaseClient) IsConfigured() bool {
	return s != nil && s.BaseURL != "" && (s.SecretKey != "" || s.PublishableKey != "")
}

func (s *SupabaseClient) apiKey() string {
	if s.SecretKey != "" {
		return s.SecretKey
	}
	return s.PublishableKey
}

// CheckConnection verifies that the Supabase project is reachable via JWKS or REST endpoint.
func (s *SupabaseClient) CheckConnection() (map[string]interface{}, error) {
	if !s.IsConfigured() {
		return nil, fmt.Errorf("konfigurasi SUPABASE_URL atau API Key belum diatur di .env")
	}

	targetURL := s.JWKSURL
	if targetURL == "" {
		targetURL = fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", s.BaseURL)
	}

	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.apiKey())

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return map[string]interface{}{
		"connected":    resp.StatusCode >= 200 && resp.StatusCode < 400,
		"supabase_url": s.BaseURL,
		"jwks_url":     targetURL,
		"http_status":  resp.StatusCode,
	}, nil
}

// RestRequest performs a request against Supabase PostgREST (/rest/v1/<table>)
func (s *SupabaseClient) RestRequest(method, tablePath string, body interface{}) ([]byte, int, error) {
	if !s.IsConfigured() {
		return nil, http.StatusInternalServerError, fmt.Errorf("supabase belum dikonfigurasi")
	}

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, http.StatusBadRequest, err
		}
		reqBody = bytes.NewReader(b)
	}

	url := fmt.Sprintf("%s/rest/v1/%s", s.BaseURL, strings.TrimLeft(tablePath, "/"))
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	key := s.apiKey()
	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, http.StatusBadGateway, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	return respBytes, resp.StatusCode, err
}

// GetUser verifies a user's access token against Supabase Auth (/auth/v1/user)
func (s *SupabaseClient) GetUser(accessToken string) (map[string]interface{}, error) {
	if !s.IsConfigured() {
		return nil, fmt.Errorf("supabase belum dikonfigurasi")
	}

	url := fmt.Sprintf("%s/auth/v1/user", s.BaseURL)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", s.PublishableKey)
	req.Header.Set("Authorization", "Bearer "+strings.TrimPrefix(accessToken, "Bearer "))

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token tidak valid (status %d)", resp.StatusCode)
	}

	var user map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return user, nil
}
