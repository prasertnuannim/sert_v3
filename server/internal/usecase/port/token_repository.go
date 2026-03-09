package port

import (
	"context"
	"time"

	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
)

type TokenRepository interface {
	InsertRefresh(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error
	GetByHash(ctx context.Context, tokenHash string) (*entity.RefreshToken, error)
	RevokeByHash(ctx context.Context, tokenHash string, revokedAt time.Time) error
}
