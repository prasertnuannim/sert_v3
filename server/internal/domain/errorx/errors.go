package errorx

import "errors"

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenRevoked       = errors.New("token revoked")
	ErrEmailAlreadyExists = errors.New("email already exists")
	ErrEmailRequired      = errors.New("email is required")
	ErrUserNotFound       = errors.New("user not found")
	ErrEmailNotFound      = errors.New("email not found")
	ErrPasswordIncorrect  = errors.New("password incorrect")
)
