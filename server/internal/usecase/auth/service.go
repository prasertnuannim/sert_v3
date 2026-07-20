package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	stderrors "errors"
	"fmt"
	"strings"
	"time"

	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
	"github.com/prasertnuannim/sert_v3/internal/domain/errors"
	"github.com/prasertnuannim/sert_v3/internal/usecase/dto"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

type Service struct {
	users  port.UserRepository
	tokens port.TokenRepository
	hasher port.PasswordHasher
	signer port.TokenSigner
	verify port.TokenVerifier
	oauth  port.OAuthProviderRefresher
	clock  port.Clock
}

func New(users port.UserRepository, tokens port.TokenRepository, hasher port.PasswordHasher, signer port.TokenSigner, verify port.TokenVerifier, oauth port.OAuthProviderRefresher, clock port.Clock) *Service {
	return &Service{users: users, tokens: tokens, hasher: hasher, signer: signer, verify: verify, oauth: oauth, clock: clock}
}

func (s *Service) Login(ctx context.Context, in dto.LoginInput) (*dto.LoginOutput, error) {
	if strings.TrimSpace(in.Email) == "" {
		return nil, errors.ErrEmailRequired
	}

	u, err := s.users.GetByEmail(ctx, in.Email)
	if err != nil {
		if stderrors.Is(err, errors.ErrUserNotFound) {
			return nil, errors.ErrEmailNotFound
		}
		return nil, errors.ErrInvalidCredentials
	}
	if !s.hasher.Compare(u.PasswordHash, in.Password) {
		return nil, errors.ErrPasswordIncorrect
	}

	return s.issueLoginTokens(ctx, u)
}

func (s *Service) OAuthLogin(ctx context.Context, in dto.OAuthLoginInput) (*dto.LoginOutput, error) {
	if strings.TrimSpace(in.Email) == "" {
		return nil, errors.ErrEmailRequired
	}
	if strings.TrimSpace(in.Provider) == "" || strings.TrimSpace(in.ProviderAccountID) == "" {
		return nil, errors.ErrInvalidCredentials
	}

	u, err := s.users.EnsureOAuthUser(
		ctx,
		port.OAuthAccountInput{
			Provider:              in.Provider,
			ProviderAccountID:     in.ProviderAccountID,
			Email:                 in.Email,
			Name:                  in.Name,
			Type:                  in.Type,
			AccessToken:           in.AccessToken,
			RefreshToken:          in.RefreshToken,
			ExpiresAt:             in.ExpiresAt,
			TokenType:             in.TokenType,
			Scope:                 in.Scope,
			IDToken:               in.IDToken,
			SessionState:          in.SessionState,
			RefreshTokenExpiresIn: in.RefreshTokenExpiresIn,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("ensure oauth user: %w", err)
	}

	return s.issueLoginTokens(ctx, u)
}

func (s *Service) issueLoginTokens(ctx context.Context, u *entity.User) (*dto.LoginOutput, error) {
	access, accessExp, err := s.signer.SignAccess(u.ID, u.Email, u.Role)
	if err != nil {
		return nil, fmt.Errorf("issue access token: %w", err)
	}

	refresh, refreshExp, err := s.signer.SignRefresh(u.ID)
	if err != nil {
		return nil, fmt.Errorf("issue refresh token: %w", err)
	}

	if err := s.tokens.InsertRefresh(ctx, u.ID, hashToken(refresh), refreshExp); err != nil {
		return nil, fmt.Errorf("store refresh token: %w", err)
	}

	return &dto.LoginOutput{
		UserID:       u.ID,
		Email:        u.Email,
		Name:         u.Name,
		Role:         u.Role,
		Tenant:       u.Tenant,
		Promotion:    u.Promotion,
		AccessToken:  access,
		AccessExp:    accessExp,
		RefreshToken: refresh,
		RefreshExp:   refreshExp,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, in dto.RefreshInput) (*dto.RefreshOutput, error) {
	// verify signature + exp ของ refresh ก่อน (เร็วและชัด)
	userID, err := s.verify.VerifyRefresh(in.RefreshToken)
	if err != nil {
		return nil, errors.ErrTokenRevoked
	}

	h := hashToken(in.RefreshToken)

	rt, err := s.tokens.GetByHash(ctx, h)
	if err != nil || rt.RevokedAt != nil {
		return nil, errors.ErrTokenRevoked
	}
	if s.clock.Now().After(rt.ExpiresAt) {
		return nil, errors.ErrTokenExpired
	}
	if rt.UserID != userID {
		return nil, errors.ErrTokenRevoked
	}

	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load user for token refresh: %w", err)
	}

	access, accessExp, err := s.signer.SignAccess(userID, u.Email, u.Role)
	if err != nil {
		return nil, fmt.Errorf("issue access token: %w", err)
	}

	return &dto.RefreshOutput{
		UserID:       userID,
		Email:        u.Email,
		Role:         u.Role,
		Tenant:       u.Tenant,
		Promotion:    u.Promotion,
		AccessToken:  access,
		AccessExp:    accessExp,
		RefreshToken: in.RefreshToken,
		RefreshExp:   rt.ExpiresAt,
	}, nil
}

func (s *Service) Logout(ctx context.Context, in dto.LogoutInput) error {
	refresh := strings.TrimSpace(in.RefreshToken)
	if refresh == "" {
		return nil
	}

	if err := s.tokens.RevokeByHash(ctx, hashToken(refresh), s.clock.Now()); err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

func (s *Service) Me(ctx context.Context, userID string) (*dto.MeOutput, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load user: %w", err)
	}
	return &dto.MeOutput{
		UserID:    u.ID,
		Email:     u.Email,
		Name:      u.Name,
		Role:      u.Role,
		Tenant:    u.Tenant,
		Promotion: u.Promotion,
	}, nil
}

func (s *Service) ProviderAccessToken(ctx context.Context, userID string, in dto.ProviderAccessTokenInput) (*dto.ProviderAccessTokenOutput, error) {
	provider := strings.ToLower(strings.TrimSpace(in.Provider))
	if provider == "" {
		return nil, errors.ErrOAuthProviderUnsupported
	}

	account, err := s.users.GetOAuthAccount(ctx, userID, provider)
	if err != nil {
		return nil, err
	}

	currentAccessToken := trimmedStringValue(account.AccessToken)
	if currentAccessToken != "" && !isProviderAccessTokenExpired(account.ExpiresAt, s.clock.Now()) {
		return buildProviderAccessTokenOutput(account.Provider, account.AccessToken, account.ExpiresAt, account.TokenType, account.Scope, false)
	}

	refreshToken := trimmedStringValue(account.RefreshToken)
	if refreshToken == "" {
		return nil, errors.ErrOAuthReauthorizationRequired
	}
	if s.oauth == nil {
		return nil, errors.ErrOAuthProviderNotConfigured
	}

	refreshed, err := s.oauth.Refresh(ctx, provider, refreshToken)
	if err != nil {
		return nil, err
	}

	accessToken := strings.TrimSpace(refreshed.AccessToken)
	if accessToken == "" {
		return nil, errors.ErrOAuthProviderTokenUnavailable
	}

	if err := s.users.UpdateOAuthAccountTokens(ctx, port.OAuthAccountTokenUpdate{
		AccountID:             account.ID,
		AccessToken:           stringPtr(accessToken),
		RefreshToken:          refreshed.RefreshToken,
		ExpiresAt:             refreshed.ExpiresAt,
		TokenType:             refreshed.TokenType,
		Scope:                 refreshed.Scope,
		IDToken:               refreshed.IDToken,
		RefreshTokenExpiresIn: refreshed.RefreshTokenExpiresIn,
	}); err != nil {
		return nil, fmt.Errorf("update oauth account tokens: %w", err)
	}

	return buildProviderAccessTokenOutput(provider, stringPtr(accessToken), refreshed.ExpiresAt, refreshed.TokenType, refreshed.Scope, true)
}

func hashToken(tok string) string {
	sum := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(sum[:])
}

func isProviderAccessTokenExpired(expiresAt *time.Time, now time.Time) bool {
	if expiresAt == nil {
		return false
	}
	return !expiresAt.After(now.Add(30 * time.Second))
}

func buildProviderAccessTokenOutput(provider string, accessToken *string, expiresAt *time.Time, tokenType, scope *string, refreshed bool) (*dto.ProviderAccessTokenOutput, error) {
	value := trimmedStringValue(accessToken)
	if value == "" {
		return nil, errors.ErrOAuthProviderTokenUnavailable
	}

	return &dto.ProviderAccessTokenOutput{
		Provider:    strings.ToLower(strings.TrimSpace(provider)),
		AccessToken: value,
		ExpiresAt:   expiresAt,
		TokenType:   trimmedStringValue(tokenType),
		Scope:       trimmedStringValue(scope),
		Refreshed:   refreshed,
	}, nil
}

func trimmedStringValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func stringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
