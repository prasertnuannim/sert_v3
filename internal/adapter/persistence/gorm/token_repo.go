package gormrepo

import (
	"context"
	"time"

	"gorm.io/gorm"

	dbm "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm/model"
	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
)

type TokenRepo struct{ db *gorm.DB }

func NewTokenRepo(db *gorm.DB) *TokenRepo { return &TokenRepo{db: db} }

func (r *TokenRepo) InsertRefresh(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
	return r.db.WithContext(ctx).Create(&dbm.RefreshTokenModel{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	}).Error
}

func (r *TokenRepo) GetByHash(ctx context.Context, tokenHash string) (*entity.RefreshToken, error) {
	var m dbm.RefreshTokenModel
	if err := r.db.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&m).Error; err != nil {
		return nil, err
	}
	return &entity.RefreshToken{
		ID:        m.ID,
		UserID:    m.UserID,
		TokenHash: m.TokenHash,
		RevokedAt: m.RevokedAt,
		ExpiresAt: m.ExpiresAt,
		CreatedAt: m.CreatedAt,
	}, nil
}

func (r *TokenRepo) RevokeByHash(ctx context.Context, tokenHash string, revokedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&dbm.RefreshTokenModel{}).
		Where("token_hash = ?", tokenHash).
		Update("revoked_at", revokedAt).Error
}
