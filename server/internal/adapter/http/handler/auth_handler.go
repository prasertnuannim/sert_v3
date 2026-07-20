package handler

import (
	stderrors "errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/prasertnuannim/sert_v3/internal/domain/errors"
	"github.com/prasertnuannim/sert_v3/internal/usecase/auth"
	"github.com/prasertnuannim/sert_v3/internal/usecase/dto"
)

type AuthHandler struct {
	svc *auth.Service
}

func NewAuthHandler(svc *auth.Service) *AuthHandler { return &AuthHandler{svc: svc} }

func writeLoginResponse(c *fiber.Ctx, out *dto.LoginOutput) error {
	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":        out.UserID,
			"email":     out.Email,
			"name":      out.Name,
			"role":      out.Role,
			"tenant":    out.Tenant,
			"promotion": out.Promotion,
		},
		"access_token":  out.AccessToken,
		"access_exp":    out.AccessExp.Unix(),
		"refresh_token": out.RefreshToken,
		"refresh_exp":   out.RefreshExp.Unix(),
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	out, err := h.svc.Login(c.Context(), dto.LoginInput{Email: req.Email, Password: req.Password})
	if err != nil {
		switch {
		case stderrors.Is(err, errors.ErrEmailRequired):
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		case stderrors.Is(err, errors.ErrEmailNotFound):
			return fiber.NewError(fiber.StatusNotFound, err.Error())
		case stderrors.Is(err, errors.ErrPasswordIncorrect):
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		case stderrors.Is(err, errors.ErrInvalidCredentials):
			return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "internal error")
		}
	}

	return writeLoginResponse(c, out)
}

func (h *AuthHandler) OAuthLogin(c *fiber.Ctx) error {
	var req struct {
		Provider              string  `json:"provider"`
		ProviderAccountID     string  `json:"provider_account_id"`
		Email                 string  `json:"email"`
		Name                  string  `json:"name"`
		Type                  string  `json:"type"`
		AccessToken           *string `json:"access_token"`
		RefreshToken          *string `json:"refresh_token"`
		ExpiresAt             *int64  `json:"expires_at"`
		TokenType             *string `json:"token_type"`
		Scope                 *string `json:"scope"`
		IDToken               *string `json:"id_token"`
		SessionState          *string `json:"session_state"`
		RefreshTokenExpiresIn *int64  `json:"refresh_token_expires_in"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	if strings.TrimSpace(req.Provider) == "" || strings.TrimSpace(req.ProviderAccountID) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "provider is required")
	}

	out, err := h.svc.OAuthLogin(c.Context(), dto.OAuthLoginInput{
		Provider:              req.Provider,
		ProviderAccountID:     req.ProviderAccountID,
		Email:                 req.Email,
		Name:                  req.Name,
		Type:                  req.Type,
		AccessToken:           req.AccessToken,
		RefreshToken:          req.RefreshToken,
		ExpiresAt:             req.ExpiresAt,
		TokenType:             req.TokenType,
		Scope:                 req.Scope,
		IDToken:               req.IDToken,
		SessionState:          req.SessionState,
		RefreshTokenExpiresIn: req.RefreshTokenExpiresIn,
	})
	if err != nil {
		switch {
		case stderrors.Is(err, errors.ErrEmailRequired):
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		case stderrors.Is(err, errors.ErrInvalidCredentials):
			return fiber.NewError(fiber.StatusBadRequest, "provider account is required")
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "internal error")
		}
	}

	return writeLoginResponse(c, out)
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	out, err := h.svc.Refresh(c.Context(), dto.RefreshInput{RefreshToken: req.RefreshToken})
	if err != nil {
		switch {
		case stderrors.Is(err, errors.ErrTokenExpired), stderrors.Is(err, errors.ErrTokenRevoked):
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "internal error")
		}
	}

	return c.JSON(fiber.Map{
		"user_id":       out.UserID,
		"email":         out.Email,
		"role":          out.Role,
		"tenant":        out.Tenant,
		"promotion":     out.Promotion,
		"access_token":  out.AccessToken,
		"access_exp":    out.AccessExp.Unix(),
		"refresh_token": out.RefreshToken,
		"refresh_exp":   out.RefreshExp.Unix(),
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	if strings.TrimSpace(req.RefreshToken) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refresh token is required")
	}

	if err := h.svc.Logout(c.Context(), dto.LogoutInput{RefreshToken: req.RefreshToken}); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "internal error")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	uid, _ := c.Locals("user_id").(string)

	out, err := h.svc.Me(c.Context(), uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "internal error")
	}
	return c.JSON(fiber.Map{
		"id":        out.UserID,
		"email":     out.Email,
		"name":      out.Name,
		"role":      out.Role,
		"tenant":    out.Tenant,
		"promotion": out.Promotion,
	})
}

func (h *AuthHandler) ProviderAccessToken(c *fiber.Ctx) error {
	uid, _ := c.Locals("user_id").(string)
	provider := strings.TrimSpace(c.Params("provider"))

	out, err := h.svc.ProviderAccessToken(c.Context(), uid, dto.ProviderAccessTokenInput{
		Provider: provider,
	})
	if err != nil {
		switch {
		case stderrors.Is(err, errors.ErrOAuthAccountNotFound):
			return fiber.NewError(fiber.StatusNotFound, err.Error())
		case stderrors.Is(err, errors.ErrOAuthProviderUnsupported):
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		case stderrors.Is(err, errors.ErrOAuthProviderTokenUnavailable):
			return fiber.NewError(fiber.StatusConflict, err.Error())
		case stderrors.Is(err, errors.ErrOAuthReauthorizationRequired):
			return fiber.NewError(fiber.StatusConflict, err.Error())
		case stderrors.Is(err, errors.ErrOAuthProviderNotConfigured):
			return fiber.NewError(fiber.StatusServiceUnavailable, err.Error())
		default:
			return fiber.NewError(fiber.StatusBadGateway, "failed to refresh provider token")
		}
	}

	var expiresAt *int64
	if out.ExpiresAt != nil {
		unix := out.ExpiresAt.Unix()
		expiresAt = &unix
	}

	return c.JSON(fiber.Map{
		"provider":     out.Provider,
		"access_token": out.AccessToken,
		"expires_at":   expiresAt,
		"token_type":   out.TokenType,
		"scope":        out.Scope,
		"refreshed":    out.Refreshed,
	})
}

func (h *AuthHandler) AdminOnly(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	role, _ := c.Locals("user_role").(string)
	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "admin access granted",
		"user_id": userID,
		"role":    role,
	})
}
