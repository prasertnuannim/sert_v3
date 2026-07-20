package errors

import stderrors "errors"

var (
	ErrInvalidCredentials            = stderrors.New("invalid credentials")
	ErrTokenExpired                  = stderrors.New("token expired")
	ErrTokenRevoked                  = stderrors.New("token revoked")
	ErrEmailAlreadyExists            = stderrors.New("email already exists")
	ErrEmailRequired                 = stderrors.New("email is required")
	ErrUserNotFound                  = stderrors.New("user not found")
	ErrEmailNotFound                 = stderrors.New("email not found")
	ErrPasswordIncorrect             = stderrors.New("password incorrect")
	ErrOAuthAccountNotFound          = stderrors.New("oauth account not found")
	ErrOAuthProviderUnsupported      = stderrors.New("oauth provider unsupported")
	ErrOAuthProviderNotConfigured    = stderrors.New("oauth provider not configured")
	ErrOAuthProviderTokenUnavailable = stderrors.New("oauth provider token unavailable")
	ErrOAuthProviderRefreshFailed    = stderrors.New("oauth provider refresh failed")
	ErrOAuthReauthorizationRequired  = stderrors.New("oauth reauthorization required")
)
