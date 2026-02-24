package entity

import "time"

type RefreshToken struct {
	ID        uint
	UserID    string
	TokenHash string
	RevokedAt *time.Time
	ExpiresAt time.Time
	CreatedAt time.Time
}
