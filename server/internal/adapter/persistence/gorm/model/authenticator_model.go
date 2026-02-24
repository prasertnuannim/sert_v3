package model

import "time"

type Authenticator struct {
	UserID            string `gorm:"type:varchar(36);not null;primaryKey"`
	CredentialID      string `gorm:"type:varchar(191);not null;primaryKey;uniqueIndex"`
	ProviderAccountID string `gorm:"type:varchar(191);not null;index"`

	CredentialPublicKey  string  `gorm:"type:text;not null"`
	Counter              int     `gorm:"not null"`
	CredentialDeviceType string  `gorm:"type:varchar(50);not null"`
	CredentialBackedUp   bool    `gorm:"not null"`
	Transports           *string `gorm:"type:varchar(255)"`

	User User `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time
}

func (Authenticator) TableName() string { return "authenticators" }
