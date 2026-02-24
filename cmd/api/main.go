package main

import (
	"context"
	"log"
	"strconv"

	gormrepo "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm"
	gormrepo_model "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm/model"
	"github.com/prasertnuannim/sert_v3/internal/app/wire"
	"github.com/prasertnuannim/sert_v3/internal/infra/config"
	"github.com/prasertnuannim/sert_v3/internal/infra/db"
	"github.com/prasertnuannim/sert_v3/internal/infra/security"
)

func main() {
	cfg := config.Load()

	gormDB, err := db.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}

	// migrate DB models
	if err := gormDB.AutoMigrate(
		&gormrepo_model.User{},
		&gormrepo_model.Account{},
		&gormrepo_model.Session{},
		&gormrepo_model.VerificationToken{},
		&gormrepo_model.Authenticator{},
		&gormrepo_model.RefreshTokenModel{},
	); err != nil {
		log.Fatal(err)
	}

	// seed admin user from .env when enabled
	if cfg.SeedEnabled {
		if cfg.SeedEmail == "" || cfg.SeedPassword == "" || cfg.SeedName == "" {
			log.Println("seed skipped: set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME in .env")
		} else {
			hasher := security.BcryptHasher{}
			hash, err := hasher.Hash(cfg.SeedPassword)
			if err != nil {
				log.Fatal(err)
			}
			userRepo := gormrepo.NewUserRepo(gormDB)
			if err := userRepo.EnsureSeedUser(
				context.Background(),
				cfg.SeedEmail,
				hash,
				cfg.SeedName,
				cfg.SeedRole,
			); err != nil {
				log.Fatal(err)
			}
		}
	}

	app := wire.BuildApp(
		gormDB,
		cfg.JWTIssuer,
		cfg.JWTAccessSecret,
		cfg.JWTRefreshSecret,
		cfg.AccessTTL,
		cfg.RefreshTTL,
	)

	addr := ":" + strconv.Itoa(cfg.AppPort)
	log.Println("listening on", addr)
	log.Fatal(app.Listen(addr))
}
