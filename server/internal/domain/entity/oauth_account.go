package entity

import "time"

type OAuthAccount struct {
	ID                    string
	UserID                string
	Type                  string
	Provider              string
	ProviderAccountID     string
	AccessToken           *string
	RefreshToken          *string
	ExpiresAt             *time.Time
	TokenType             *string
	Scope                 *string
	IDToken               *string
	SessionState          *string
	RefreshTokenExpiresIn *int64
	CreatedAt             time.Time
	UpdatedAt             time.Time
}
