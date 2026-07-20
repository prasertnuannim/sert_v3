package gormrepo

import (
	"context"
	stderrors "errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	dbm "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm/model"
	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
	"github.com/prasertnuannim/sert_v3/internal/domain/errors"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

type UserRepo struct{ db *gorm.DB }

func NewUserRepo(db *gorm.DB) *UserRepo { return &UserRepo{db: db} }

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var m dbm.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&m).Error
	if err != nil {
		if stderrors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.ErrUserNotFound
		}
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

func (r *UserRepo) EnsureOAuthUser(ctx context.Context, in port.OAuthAccountInput) (*entity.User, error) {
	provider := strings.ToLower(strings.TrimSpace(in.Provider))
	providerAccountID := strings.TrimSpace(in.ProviderAccountID)
	email := strings.ToLower(strings.TrimSpace(in.Email))
	name := strings.TrimSpace(in.Name)
	accountType := normalizeOAuthAccountType(in.Type)
	accessToken := optionalStringPtr(in.AccessToken)
	refreshToken := optionalStringPtr(in.RefreshToken)
	expiresAt := in.ExpiresAt
	tokenType := optionalStringPtr(in.TokenType)
	scope := optionalStringPtr(in.Scope)
	idToken := optionalStringPtr(in.IDToken)
	sessionState := optionalStringPtr(in.SessionState)
	refreshTokenExpiresIn := in.RefreshTokenExpiresIn

	var user dbm.User
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var account dbm.Account
		accountErr := tx.
			Where("provider = ? AND provider_account_id = ?", provider, providerAccountID).
			First(&account).Error

		switch {
		case accountErr == nil:
			if err := tx.Where("id = ?", account.UserID).First(&user).Error; err != nil {
				return err
			}

			updates := map[string]any{}
			if email != "" && isBlankStringPtr(user.Email) {
				updates["email"] = email
			}
			if name != "" && isBlankStringPtr(user.Name) {
				updates["name"] = name
			}

			if len(updates) > 0 {
				if err := tx.Model(&dbm.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
					return err
				}
				if err := tx.Where("id = ?", user.ID).First(&user).Error; err != nil {
					return err
				}
			}
		case !stderrors.Is(accountErr, gorm.ErrRecordNotFound):
			return accountErr
		default:
			userErr := tx.Where("email = ?", email).First(&user).Error
			switch {
			case userErr == nil:
				if name != "" && isBlankStringPtr(user.Name) {
					if err := tx.Model(&dbm.User{}).Where("id = ?", user.ID).Update("name", name).Error; err != nil {
						return err
					}
					if err := tx.Where("id = ?", user.ID).First(&user).Error; err != nil {
						return err
					}
				}
			case stderrors.Is(userErr, gorm.ErrRecordNotFound):
				createdUser := dbm.User{
					ID:    uuid.NewString(),
					Email: stringPtr(email),
					Name:  stringPtr(name),
					Role:  entity.RoleUser,
				}
				if err := tx.Create(&createdUser).Error; err != nil {
					return err
				}
				user = createdUser
			default:
				return userErr
			}
		}

		account = dbm.Account{
			ID:                    uuid.NewString(),
			UserID:                user.ID,
			Type:                  accountType,
			Provider:              provider,
			ProviderAccountID:     providerAccountID,
			AccessToken:           accessToken,
			RefreshToken:          refreshToken,
			ExpiresAt:             expiresAt,
			TokenType:             tokenType,
			Scope:                 scope,
			IDToken:               idToken,
			SessionState:          sessionState,
			RefreshTokenExpiresIn: refreshTokenExpiresIn,
		}

		assignments := map[string]any{
			"user_id":    user.ID,
			"type":       accountType,
			"updated_at": time.Now().UTC(),
		}
		assignOptionalString(assignments, "access_token", accessToken)
		assignOptionalString(assignments, "refresh_token", refreshToken)
		assignOptionalInt64(assignments, "expires_at", expiresAt)
		assignOptionalString(assignments, "token_type", tokenType)
		assignOptionalString(assignments, "scope", scope)
		assignOptionalString(assignments, "id_token", idToken)
		assignOptionalString(assignments, "session_state", sessionState)
		assignOptionalInt64(assignments, "refresh_token_expires_in", refreshTokenExpiresIn)

		return tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "provider"},
				{Name: "provider_account_id"},
			},
			DoUpdates: clause.Assignments(assignments),
		}).Create(&account).Error
	})
	if err != nil {
		return nil, err
	}

	return mapUser(user), nil
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
	if !stderrors.Is(err, gorm.ErrRecordNotFound) {
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

func (r *UserRepo) GetOAuthAccount(ctx context.Context, userID, provider string) (*entity.OAuthAccount, error) {
	var account dbm.Account
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND provider = ?", strings.TrimSpace(userID), strings.ToLower(strings.TrimSpace(provider))).
		Order("updated_at desc").
		First(&account).Error
	if err != nil {
		if stderrors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.ErrOAuthAccountNotFound
		}
		return nil, err
	}

	return mapOAuthAccount(account), nil
}

func (r *UserRepo) UpdateOAuthAccountTokens(ctx context.Context, in port.OAuthAccountTokenUpdate) error {
	accountID := strings.TrimSpace(in.AccountID)
	if accountID == "" {
		return errors.ErrOAuthAccountNotFound
	}

	updates := map[string]any{
		"updated_at": time.Now().UTC(),
	}
	assignOptionalString(updates, "access_token", optionalStringPtr(in.AccessToken))
	assignOptionalString(updates, "refresh_token", optionalStringPtr(in.RefreshToken))
	assignOptionalTime(updates, "expires_at", in.ExpiresAt)
	assignOptionalString(updates, "token_type", optionalStringPtr(in.TokenType))
	assignOptionalString(updates, "scope", optionalStringPtr(in.Scope))
	assignOptionalString(updates, "id_token", optionalStringPtr(in.IDToken))
	assignOptionalString(updates, "session_state", optionalStringPtr(in.SessionState))
	assignOptionalInt64(updates, "refresh_token_expires_in", in.RefreshTokenExpiresIn)

	res := r.db.WithContext(ctx).
		Model(&dbm.Account{}).
		Where("id = ?", accountID).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.ErrOAuthAccountNotFound
	}
	return nil
}

func isBlankStringPtr(value *string) bool {
	return value == nil || strings.TrimSpace(*value) == ""
}

func stringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func optionalStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	return stringPtr(*value)
}

func normalizeOAuthAccountType(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	if trimmed == "" {
		return "oauth"
	}
	return trimmed
}

func assignOptionalString(assignments map[string]any, key string, value *string) {
	if value != nil {
		assignments[key] = *value
	}
}

func assignOptionalInt64(assignments map[string]any, key string, value *int64) {
	if value != nil {
		assignments[key] = *value
	}
}

func assignOptionalTime(assignments map[string]any, key string, value *time.Time) {
	if value != nil {
		unix := value.UTC().Unix()
		assignments[key] = unix
	}
}

func mapOAuthAccount(m dbm.Account) *entity.OAuthAccount {
	return &entity.OAuthAccount{
		ID:                    m.ID,
		UserID:                m.UserID,
		Type:                  m.Type,
		Provider:              m.Provider,
		ProviderAccountID:     m.ProviderAccountID,
		AccessToken:           m.AccessToken,
		RefreshToken:          m.RefreshToken,
		ExpiresAt:             unixPtrToTime(m.ExpiresAt),
		TokenType:             m.TokenType,
		Scope:                 m.Scope,
		IDToken:               m.IDToken,
		SessionState:          m.SessionState,
		RefreshTokenExpiresIn: m.RefreshTokenExpiresIn,
		CreatedAt:             m.CreatedAt,
		UpdatedAt:             m.UpdatedAt,
	}
}

func unixPtrToTime(value *int64) *time.Time {
	if value == nil {
		return nil
	}
	t := time.Unix(*value, 0).UTC()
	return &t
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

	tenant := ""
	if m.Tenant != nil {
		tenant = *m.Tenant
	}

	promotion := ""
	if m.Promotion != nil {
		promotion = *m.Promotion
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
		Tenant:       tenant,
		Promotion:    promotion,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}
