package port

import (
	"context"
	"time"
)

type OAuthProviderRefreshResult struct {
	AccessToken           string
	RefreshToken          *string
	ExpiresAt             *time.Time
	TokenType             *string
	Scope                 *string
	IDToken               *string
	RefreshTokenExpiresIn *int64
}

type OAuthProviderRefresher interface {
	Refresh(ctx context.Context, provider, refreshToken string) (*OAuthProviderRefreshResult, error)
}
