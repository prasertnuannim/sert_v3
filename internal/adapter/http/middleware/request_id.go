package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const HeaderRequestID = "X-Request-Id"

func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get(HeaderRequestID)
		if id == "" {
			id = uuid.NewString()
		}
		c.Set(HeaderRequestID, id)
		c.Locals("request_id", id)
		return c.Next()
	}
}