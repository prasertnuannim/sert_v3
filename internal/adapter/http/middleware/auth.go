package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

func RequireAuth(verifier port.TokenVerifier) fiber.Handler {
	return func(c *fiber.Ctx) error {
		h := c.Get("Authorization")
		if h == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing token")
		}
		parts := strings.SplitN(h, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid auth header")
		}

		claims, err := verifier.VerifyAccess(parts[1])
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("user_email", claims.Email)
		c.Locals("user_role", claims.Role)
		return c.Next()
	}
}
