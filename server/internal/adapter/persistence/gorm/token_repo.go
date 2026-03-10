package gormrepo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	dbm "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm/model"
	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
)

type TokenRepo struct{ db *gorm.DB }

func NewTokenRepo(db *gorm.DB) *TokenRepo { return &TokenRepo{db: db} }

func (r *TokenRepo) InsertRefresh(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
	return r.db.WithContext(ctx).Create(&dbm.Session{
		ID:           uuid.NewString(),
		SessionToken: tokenHash,
		UserID:       userID,
		Expires:      expiresAt,
	}).Error
}

func (r *TokenRepo) GetByHash(ctx context.Context, tokenHash string) (*entity.RefreshToken, error) {
	var m dbm.Session
	if err := r.db.WithContext(ctx).Where("session_token = ?", tokenHash).First(&m).Error; err != nil {
		return nil, err
	}
	return &entity.RefreshToken{
		// Session primary key is string; use zero-value uint here because the domain ID is unused.
		ID:        0,
		UserID:    m.UserID,
		TokenHash: m.SessionToken,
		ExpiresAt: m.Expires,
		CreatedAt: m.CreatedAt,
	}, nil
}

func (r *TokenRepo) RevokeByHash(ctx context.Context, tokenHash string, _ time.Time) error {
	return r.db.WithContext(ctx).
		Where("session_token = ?", tokenHash).
		Delete(&dbm.Session{}).Error
}
