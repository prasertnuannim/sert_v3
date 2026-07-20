package wire

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	httpadapter "github.com/prasertnuannim/sert_v3/internal/adapter/http"
	"github.com/prasertnuannim/sert_v3/internal/adapter/http/handler"
	gormrepo "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm"
	jwtinfra "github.com/prasertnuannim/sert_v3/internal/infra/jwt"
	oauthinfra "github.com/prasertnuannim/sert_v3/internal/infra/oauth"
	"github.com/prasertnuannim/sert_v3/internal/infra/security"
	timeinfra "github.com/prasertnuannim/sert_v3/internal/infra/time"
	"github.com/prasertnuannim/sert_v3/internal/usecase/auth"
)

type JWTConfig struct {
	Issuer        string
	AccessSecret  string
	RefreshSecret string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

func BuildApp(db *gorm.DB, issuer, accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration, googleClientID, googleClientSecret, githubClientID, githubClientSecret string) *fiber.App {
	userRepo := gormrepo.NewUserRepo(db)
	tokenRepo := gormrepo.NewTokenRepo(db)

	hasher := security.BcryptHasher{}
	j := jwtinfra.New(issuer, accessSecret, refreshSecret, accessTTL, refreshTTL)
	oauth := oauthinfra.NewProviderRefresher(googleClientID, googleClientSecret, githubClientID, githubClientSecret)

	clock := timeinfra.RealClock{}
	authSvc := auth.New(userRepo, tokenRepo, hasher, j, j, oauth, clock)

	authHandler := handler.NewAuthHandler(authSvc)
	userHandler := handler.NewUserHandler(db)

	app := fiber.New()
	httpadapter.Register(app, authHandler, userHandler, j)

	return app
}
