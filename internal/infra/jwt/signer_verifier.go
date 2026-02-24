package jwtinfra

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

type SignerVerifier struct {
	issuer        string
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func New(issuer, accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *SignerVerifier {
	return &SignerVerifier{
		issuer:        issuer,
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

type accessClaims struct {
	UserID string `json:"uid"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type refreshClaims struct {
	UserID string `json:"uid"`
	jwt.RegisteredClaims
}

func (s *SignerVerifier) SignAccess(userID string, email string, role string) (string, time.Time, error) {
	exp := time.Now().Add(s.accessTTL)
	claims := accessClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	out, err := t.SignedString(s.accessSecret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}
	return out, exp, nil
}

func (s *SignerVerifier) SignRefresh(userID string) (string, time.Time, error) {
	exp := time.Now().Add(s.refreshTTL)
	claims := refreshClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	out, err := t.SignedString(s.refreshSecret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign refresh token: %w", err)
	}
	return out, exp, nil
}

func (s *SignerVerifier) VerifyAccess(token string) (*port.AccessClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &accessClaims{}, func(t *jwt.Token) (any, error) {
		return s.accessSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*accessClaims)
	if !ok || !parsed.Valid {
		return nil, fmt.Errorf("invalid access claims")
	}
	if claims.Issuer != s.issuer {
		return nil, fmt.Errorf("invalid issuer")
	}
	return &port.AccessClaims{UserID: claims.UserID, Email: claims.Email, Role: claims.Role}, nil
}

func (s *SignerVerifier) VerifyRefresh(token string) (string, error) {
	parsed, err := jwt.ParseWithClaims(token, &refreshClaims{}, func(t *jwt.Token) (any, error) {
		return s.refreshSecret, nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := parsed.Claims.(*refreshClaims)
	if !ok || !parsed.Valid {
		return "", fmt.Errorf("invalid refresh claims")
	}
	if claims.Issuer != s.issuer {
		return "", fmt.Errorf("invalid issuer")
	}
	return claims.UserID, nil
}
