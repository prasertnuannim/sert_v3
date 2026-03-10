package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/prasertnuannim/sert_v3/internal/domain/errorx"
	"github.com/prasertnuannim/sert_v3/internal/usecase/dto"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

type Service struct {
	users  port.UserRepository
	tokens port.TokenRepository
	hasher port.PasswordHasher
	signer port.TokenSigner
	verify port.TokenVerifier
	clock  port.Clock
}

func New(users port.UserRepository, tokens port.TokenRepository, hasher port.PasswordHasher, signer port.TokenSigner, verify port.TokenVerifier, clock port.Clock) *Service {
	return &Service{users: users, tokens: tokens, hasher: hasher, signer: signer, verify: verify, clock: clock}
}

func (s *Service) Login(ctx context.Context, in dto.LoginInput) (*dto.LoginOutput, error) {
	if strings.TrimSpace(in.Email) == "" {
		return nil, errorx.ErrEmailRequired
	}

	u, err := s.users.GetByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, errorx.ErrUserNotFound) {
			return nil, errorx.ErrEmailNotFound
		}
		return nil, errorx.ErrInvalidCredentials
	}
	if !s.hasher.Compare(u.PasswordHash, in.Password) {
		return nil, errorx.ErrPasswordIncorrect
	}

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
		return nil, errorx.ErrTokenRevoked
	}

	h := hashToken(in.RefreshToken)

	rt, err := s.tokens.GetByHash(ctx, h)
	if err != nil || rt.RevokedAt != nil {
		return nil, errorx.ErrTokenRevoked
	}
	if s.clock.Now().After(rt.ExpiresAt) {
		return nil, errorx.ErrTokenExpired
	}
	if rt.UserID != userID {
		return nil, errorx.ErrTokenRevoked
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

func hashToken(tok string) string {
	sum := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(sum[:])
}
