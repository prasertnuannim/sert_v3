package dto

import "time"

type LoginInput struct {
	Email    string
	Password string
}

type OAuthLoginInput struct {
	Provider              string
	ProviderAccountID     string
	Email                 string
	Name                  string
	Type                  string
	AccessToken           *string
	RefreshToken          *string
	ExpiresAt             *int64
	TokenType             *string
	Scope                 *string
	IDToken               *string
	SessionState          *string
	RefreshTokenExpiresIn *int64
}

type LoginOutput struct {
	UserID       string
	Email        string
	Name         string
	Role         string
	Tenant       string
	Promotion    string
	AccessToken  string
	AccessExp    time.Time
	RefreshToken string
	RefreshExp   time.Time
}

type RefreshInput struct {
	RefreshToken string
}

type LogoutInput struct {
	RefreshToken string
}

type RefreshOutput struct {
	UserID       string
	Email        string
	Role         string
	Tenant       string
	Promotion    string
	AccessToken  string
	AccessExp    time.Time
	RefreshToken string
	RefreshExp   time.Time
}

type MeOutput struct {
	UserID    string
	Email     string
	Name      string
	Role      string
	Tenant    string
	Promotion string
}

type ProviderAccessTokenInput struct {
	Provider string
}

type ProviderAccessTokenOutput struct {
	Provider    string
	AccessToken string
	ExpiresAt   *time.Time
	TokenType   string
	Scope       string
	Refreshed   bool
}
