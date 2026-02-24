package dto

import "time"

type LoginInput struct {
	Email    string
	Password string
}

type LoginOutput struct {
	UserID       string
	Email        string
	Name         string
	Role         string
	AccessToken  string
	AccessExp    time.Time
	RefreshToken string
	RefreshExp   time.Time
}

type RefreshInput struct {
	RefreshToken string
}

type RefreshOutput struct {
	UserID       string
	Email        string
	Role         string
	AccessToken  string
	AccessExp    time.Time
	RefreshToken string
	RefreshExp   time.Time
}

type MeOutput struct {
	UserID string
	Email  string
	Name   string
	Role   string
}
