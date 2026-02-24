package model

import "time"

type Account struct {
	ID                string `gorm:"type:varchar(36);primaryKey"`
	UserID            string `gorm:"type:varchar(36);index;not null"` // ✅ ไม่ unique
	Type              string `gorm:"type:varchar(50);not null"`
	Provider          string `gorm:"type:varchar(100);not null;uniqueIndex:idx_accounts_provider_provider_account_id"`
	ProviderAccountID string `gorm:"type:varchar(191);not null;uniqueIndex:idx_accounts_provider_provider_account_id"`

	RefreshToken          *string `gorm:"type:text"`
	AccessToken           *string `gorm:"type:text"`
	ExpiresAt             *int64  `gorm:"index"`
	TokenType             *string `gorm:"type:varchar(50)"`
	Scope                 *string `gorm:"type:varchar(255)"`
	IDToken               *string `gorm:"type:text"`
	SessionState          *string `gorm:"type:varchar(255)"`
	RefreshTokenExpiresIn *int64  `gorm:"index"`

	User User `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Account) TableName() string { return "accounts" }
