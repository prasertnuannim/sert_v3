package model

import "time"

type VerificationToken struct {
	Identifier string    `gorm:"type:varchar(191);not null;primaryKey"`
	Token      string    `gorm:"type:varchar(191);not null;primaryKey"`
	Expires    time.Time `gorm:"index;not null"`
	CreatedAt  time.Time
}

func (VerificationToken) TableName() string { return "verification_tokens" }
