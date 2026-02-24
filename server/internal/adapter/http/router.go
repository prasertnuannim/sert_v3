package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/prasertnuannim/sert_v3/internal/adapter/http/handler"
	"github.com/prasertnuannim/sert_v3/internal/adapter/http/middleware"
	"github.com/prasertnuannim/sert_v3/internal/domain/entity"
	"github.com/prasertnuannim/sert_v3/internal/usecase/port"
)

func Register(app *fiber.App, h *handler.AuthHandler, verifier port.TokenVerifier) {
	app.Use(recover.New())
	app.Use(cors.New())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logger())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	auth := app.Group("/auth")
	auth.Post("/login",
		limiter.New(limiter.Config{Max: 10, Expiration: time.Minute}),
		h.Login,
	)
	auth.Post("/refresh", h.Refresh)

	protected := app.Group("", middleware.RequireAuth(verifier))
	protected.Get("/me", h.Me)
	protected.Get("/admin", middleware.RequireRole(entity.RoleAdmin), h.AdminOnly)
}
