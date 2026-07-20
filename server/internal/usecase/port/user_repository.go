package port

import (
	"context"
	"time"

	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
)

type OAuthAccountInput struct {
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

type OAuthAccountTokenUpdate struct {
	AccountID             string
	AccessToken           *string
	RefreshToken          *string
	ExpiresAt             *time.Time
	TokenType             *string
	Scope                 *string
	IDToken               *string
	SessionState          *string
	RefreshTokenExpiresIn *int64
}

type UserRepository interface {
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	GetByID(ctx context.Context, id string) (*entity.User, error)
	EnsureOAuthUser(ctx context.Context, in OAuthAccountInput) (*entity.User, error)
	GetOAuthAccount(ctx context.Context, userID, provider string) (*entity.OAuthAccount, error)
	UpdateOAuthAccountTokens(ctx context.Context, in OAuthAccountTokenUpdate) error
	EnsureSeedUser(ctx context.Context, email, passwordHash, name, role string) error
}
