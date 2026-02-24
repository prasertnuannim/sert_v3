package model

import "time"

type User struct {
	ID            string     `gorm:"type:varchar(36);primaryKey"`
	Name          *string    `gorm:"type:varchar(255)"`
	Username      *string    `gorm:"type:varchar(191);uniqueIndex"`
	Email         *string    `gorm:"type:varchar(191);uniqueIndex"`
	PasswordHash  *string    `gorm:"type:varchar(255)"`
	Role          string     `gorm:"type:varchar(32);not null;default:user"`
	EmailVerified *time.Time
	Image         *string    `gorm:"type:text"`

	Accounts       []Account       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Sessions       []Session       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Authenticators []Authenticator `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (User) TableName() string { return "users" }
