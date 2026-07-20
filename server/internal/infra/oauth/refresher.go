package oauthinfra

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/prasertnuannim/sert_v3/internal/domain/errors"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

const (
	googleTokenEndpoint = "https://oauth2.googleapis.com/token"
	githubTokenEndpoint = "https://github.com/login/oauth/access_token"
)

type ProviderRefresher struct {
	httpClient *http.Client

	googleClientID     string
	googleClientSecret string
	githubClientID     string
	githubClientSecret string
}

func NewProviderRefresher(googleClientID, googleClientSecret, githubClientID, githubClientSecret string) *ProviderRefresher {
	return &ProviderRefresher{
		httpClient:         &http.Client{Timeout: 10 * time.Second},
		googleClientID:     strings.TrimSpace(googleClientID),
		googleClientSecret: strings.TrimSpace(googleClientSecret),
		githubClientID:     strings.TrimSpace(githubClientID),
		githubClientSecret: strings.TrimSpace(githubClientSecret),
	}
}

func (r *ProviderRefresher) Refresh(ctx context.Context, provider, refreshToken string) (*port.OAuthProviderRefreshResult, error) {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "google":
		return r.refreshGoogle(ctx, refreshToken)
	case "github":
		return r.refreshGitHub(ctx, refreshToken)
	default:
		return nil, errors.ErrOAuthProviderUnsupported
	}
}

func (r *ProviderRefresher) refreshGoogle(ctx context.Context, refreshToken string) (*port.OAuthProviderRefreshResult, error) {
	if r.googleClientID == "" || r.googleClientSecret == "" {
		return nil, errors.ErrOAuthProviderNotConfigured
	}

	values := url.Values{
		"client_id":     {r.googleClientID},
		"client_secret": {r.googleClientSecret},
		"grant_type":    {"refresh_token"},
		"refresh_token": {strings.TrimSpace(refreshToken)},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, googleTokenEndpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, fmt.Errorf("build google refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	var payload struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
		IDToken     string `json:"id_token"`
		Error       string `json:"error"`
		Description string `json:"error_description"`
	}

	if err := r.doJSON(req, &payload); err != nil {
		return nil, err
	}
	if payload.Error != "" {
		return nil, wrapProviderRefreshError(payload.Error, payload.Description)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return nil, errors.ErrOAuthProviderRefreshFailed
	}

	return &port.OAuthProviderRefreshResult{
		AccessToken: strings.TrimSpace(payload.AccessToken),
		ExpiresAt:   expiresAtFromNow(payload.ExpiresIn),
		TokenType:   optionalTrimmedString(payload.TokenType),
		Scope:       optionalTrimmedString(payload.Scope),
		IDToken:     optionalTrimmedString(payload.IDToken),
	}, nil
}

func (r *ProviderRefresher) refreshGitHub(ctx context.Context, refreshToken string) (*port.OAuthProviderRefreshResult, error) {
	if r.githubClientID == "" || r.githubClientSecret == "" {
		return nil, errors.ErrOAuthProviderNotConfigured
	}

	values := url.Values{
		"client_id":     {r.githubClientID},
		"client_secret": {r.githubClientSecret},
		"grant_type":    {"refresh_token"},
		"refresh_token": {strings.TrimSpace(refreshToken)},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, githubTokenEndpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, fmt.Errorf("build github refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	var payload struct {
		AccessToken           string `json:"access_token"`
		RefreshToken          string `json:"refresh_token"`
		ExpiresIn             int64  `json:"expires_in"`
		RefreshTokenExpiresIn int64  `json:"refresh_token_expires_in"`
		TokenType             string `json:"token_type"`
		Scope                 string `json:"scope"`
		Error                 string `json:"error"`
		ErrorDescription      string `json:"error_description"`
		ErrorURI              string `json:"error_uri"`
	}

	if err := r.doJSON(req, &payload); err != nil {
		return nil, err
	}
	if payload.Error != "" {
		description := payload.ErrorDescription
		if description == "" {
			description = payload.ErrorURI
		}
		return nil, wrapProviderRefreshError(payload.Error, description)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return nil, errors.ErrOAuthProviderRefreshFailed
	}

	return &port.OAuthProviderRefreshResult{
		AccessToken:           strings.TrimSpace(payload.AccessToken),
		RefreshToken:          optionalTrimmedString(payload.RefreshToken),
		ExpiresAt:             expiresAtFromNow(payload.ExpiresIn),
		TokenType:             optionalTrimmedString(payload.TokenType),
		Scope:                 optionalTrimmedString(payload.Scope),
		RefreshTokenExpiresIn: optionalPositiveInt64(payload.RefreshTokenExpiresIn),
	}, nil
}

func (r *ProviderRefresher) doJSON(req *http.Request, out any) error {
	res, err := r.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("provider refresh request failed: %w", err)
	}
	defer res.Body.Close()

	if err := json.NewDecoder(res.Body).Decode(out); err != nil {
		return fmt.Errorf("decode provider refresh response: %w", err)
	}

	if res.StatusCode >= http.StatusBadRequest {
		return errors.ErrOAuthProviderRefreshFailed
	}
	return nil
}

func wrapProviderRefreshError(code, description string) error {
	if code == "" && description == "" {
		return errors.ErrOAuthProviderRefreshFailed
	}

	message := strings.TrimSpace(code)
	if desc := strings.TrimSpace(description); desc != "" {
		if message != "" {
			message += ": " + desc
		} else {
			message = desc
		}
	}
	if message == "" {
		return errors.ErrOAuthProviderRefreshFailed
	}

	low := strings.ToLower(message)
	if strings.Contains(low, "invalid_grant") || strings.Contains(low, "expired") || strings.Contains(low, "revoked") {
		return fmt.Errorf("%w: %s", errors.ErrOAuthReauthorizationRequired, message)
	}
	return fmt.Errorf("%w: %s", errors.ErrOAuthProviderRefreshFailed, message)
}

func expiresAtFromNow(expiresInSeconds int64) *time.Time {
	if expiresInSeconds <= 0 {
		return nil
	}
	expiresAt := time.Now().Add(time.Duration(expiresInSeconds) * time.Second).UTC()
	return &expiresAt
}

func optionalTrimmedString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func optionalPositiveInt64(value int64) *int64 {
	if value <= 0 {
		return nil
	}
	return &value
}

var _ port.OAuthProviderRefresher = (*ProviderRefresher)(nil)
