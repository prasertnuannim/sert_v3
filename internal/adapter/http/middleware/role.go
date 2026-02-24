package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

func RequireRole(roles ...string) fiber.Handler {
	allow := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allow[strings.ToLower(strings.TrimSpace(role))] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("user_role").(string)
		if role == "" {
			return fiber.NewError(fiber.StatusForbidden, "role missing")
		}
		if _, ok := allow[strings.ToLower(role)]; !ok {
			return fiber.NewError(fiber.StatusForbidden, "insufficient role")
		}
		return c.Next()
	}
}
