package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort int

	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBLogLevel string

	JWTIssuer        string
	JWTAccessSecret  string
	JWTRefreshSecret string
	AccessTTL        time.Duration
	RefreshTTL       time.Duration

	SeedEmail    string
	SeedPassword string
	SeedName     string
	SeedRole     string
	SeedEnabled  bool
}

func Load() Config {
	_ = godotenv.Load()

	accessMin := getEnvInt("ACCESS_TOKEN_TTL_MIN", 15)
	refreshDays := getEnvInt("REFRESH_TOKEN_TTL_DAYS", 30)

	return Config{
		AppPort: getEnvInt("APP_PORT", 8081),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvInt("DB_PORT", 5432),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "authdb"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		DBLogLevel: getEnv("DB_LOG_LEVEL", "info"),

		JWTIssuer:        getEnv("JWT_ISSUER", "auth-service"),
		JWTAccessSecret:  mustEnv("JWT_ACCESS_SECRET"),
		JWTRefreshSecret: mustEnv("JWT_REFRESH_SECRET"),
		AccessTTL:        time.Duration(accessMin) * time.Minute,
		RefreshTTL:       time.Duration(refreshDays) * 24 * time.Hour,

		SeedEmail:    getEnv("SEED_ADMIN_EMAIL", ""),
		SeedPassword: getEnv("SEED_ADMIN_PASSWORD", ""),
		SeedName:     getEnv("SEED_ADMIN_NAME", ""),
		SeedRole:     getEnv("SEED_ADMIN_ROLE", "admin"),
		SeedEnabled:  getEnvBool("SEED_ENABLED", true),
	}
}

func getEnv(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing env: %s", key)
	}
	return v
}

func getEnvInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		log.Printf("invalid int env %s=%q fallback=%d", key, v, def)
		return def
	}
	return i
}

func getEnvBool(key string, def bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		log.Printf("invalid bool env %s=%q fallback=%t", key, v, def)
		return def
	}
	return b
}
