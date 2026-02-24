package middleware

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		latency := time.Since(start)

		reqID, _ := c.Locals("request_id").(string)
		log.Printf("req_id=%s method=%s path=%s status=%d latency_ms=%d ip=%s",
			reqID, c.Method(), c.Path(), c.Response().StatusCode(),
			latency.Milliseconds(), c.IP(),
		)
		return err
	}
}