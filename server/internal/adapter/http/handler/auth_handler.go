package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/prasertnuannim/sert_v3/internal/domain/errorx"
	"github.com/prasertnuannim/sert_v3/internal/usecase/auth"
	"github.com/prasertnuannim/sert_v3/internal/usecase/dto"
)

type AuthHandler struct {
	svc *auth.Service
}

func NewAuthHandler(svc *auth.Service) *AuthHandler { return &AuthHandler{svc: svc} }

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
		case errors.Is(err, errorx.ErrEmailRequired):
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		case errors.Is(err, errorx.ErrEmailNotFound):
			return fiber.NewError(fiber.StatusNotFound, err.Error())
		case errors.Is(err, errorx.ErrPasswordIncorrect):
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		case errors.Is(err, errorx.ErrInvalidCredentials):
			return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "internal error")
		}
	}

	return c.JSON(fiber.Map{
		"user":          fiber.Map{"id": out.UserID, "email": out.Email, "name": out.Name, "role": out.Role},
		"access_token":  out.AccessToken,
		"access_exp":    out.AccessExp.Unix(),
		"refresh_token": out.RefreshToken,
		"refresh_exp":   out.RefreshExp.Unix(),
	})
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
		case errors.Is(err, errorx.ErrTokenExpired), errors.Is(err, errorx.ErrTokenRevoked):
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		default:
			return fiber.NewError(fiber.StatusInternalServerError, "internal error")
		}
	}

	return c.JSON(fiber.Map{
		"user_id":       out.UserID,
		"email":         out.Email,
		"role":          out.Role,
		"access_token":  out.AccessToken,
		"access_exp":    out.AccessExp.Unix(),
		"refresh_token": out.RefreshToken,
		"refresh_exp":   out.RefreshExp.Unix(),
	})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	uid, _ := c.Locals("user_id").(string)

	out, err := h.svc.Me(c.Context(), uid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "internal error")
	}
	return c.JSON(fiber.Map{"id": out.UserID, "email": out.Email, "name": out.Name, "role": out.Role})
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
