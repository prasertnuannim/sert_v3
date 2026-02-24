package model

import "time"

type Session struct {
	ID           string    `gorm:"type:varchar(36);primaryKey"`
	SessionToken string    `gorm:"type:varchar(191);uniqueIndex;not null"`
	UserID       string    `gorm:"type:varchar(36);index;not null"`
	Expires      time.Time `gorm:"index;not null"`

	User User `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Session) TableName() string { return "sessions" }