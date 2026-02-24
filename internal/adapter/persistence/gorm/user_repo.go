package gormrepo

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	dbm "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm/model"
	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
)

type UserRepo struct{ db *gorm.DB }

func NewUserRepo(db *gorm.DB) *UserRepo { return &UserRepo{db: db} }

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var m dbm.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&m).Error
	if err != nil {
		return nil, err
	}
	return mapUser(m), nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*entity.User, error) {
	var m dbm.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error
	if err != nil {
		return nil, err
	}
	return mapUser(m), nil
}

func (r *UserRepo) EnsureSeedUser(ctx context.Context, email, passwordHash, name, role string) error {
	var m dbm.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&m).Error
	if err == nil {
		updates := map[string]any{}
		if m.PasswordHash == nil || *m.PasswordHash == "" {
			updates["password_hash"] = passwordHash
		}
		if m.Name == nil || *m.Name == "" {
			updates["name"] = name
		}
		if m.Role == "" {
			updates["role"] = role
		}
		if len(updates) > 0 {
			return r.db.WithContext(ctx).Model(&m).Updates(updates).Error
		}
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return r.db.WithContext(ctx).Create(&dbm.User{
		ID:           uuid.NewString(),
		Email:        &email,
		PasswordHash: &passwordHash,
		Name:         &name,
		Role:         role,
	}).Error
}

func mapUser(m dbm.User) *entity.User {
	email := ""
	if m.Email != nil {
		email = *m.Email
	}

	name := ""
	if m.Name != nil {
		name = *m.Name
	}

	passwordHash := ""
	if m.PasswordHash != nil {
		passwordHash = *m.PasswordHash
	}
	role := m.Role
	if role == "" {
		role = entity.RoleUser
	}

	return &entity.User{
		ID:           m.ID,
		Email:        email,
		PasswordHash: passwordHash,
		Name:         name,
		Role:         role,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}
