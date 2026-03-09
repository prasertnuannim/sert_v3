package model

import "time"

type RefreshTokenModel struct {
	ID        uint   `gorm:"primaryKey"`
	UserID    string `gorm:"type:varchar(36);index;not null"`
	TokenHash string `gorm:"uniqueIndex;not null"`
	RevokedAt *time.Time
	ExpiresAt time.Time `gorm:"index;not null"`
	CreatedAt time.Time
}
