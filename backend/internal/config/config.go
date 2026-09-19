package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	ClientOrigin string
	AppEnv       string

	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	DBSSLMode string

	JWTSecret string
	JWTExpHrs int
}

func LoadConfig() (*Config, error) {
	// Try loading .env from current directory first, then parent
	if err := godotenv.Load(".env"); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("⚠️  Notice: No .env file loaded, using system/fallback defaults")
		} else {
			log.Println(" Loaded .env from parent directory")
		}
	} else {
		log.Println(" Loaded .env from current directory")
	}

	jwtExp, _ := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))

	cfg := &Config{
		Port:         getEnv("PORT", "8080"),
		ClientOrigin: getEnv("CLIENT_ORIGIN", "http://localhost:3000"),
		AppEnv:       getEnv("APP_ENV", "development"),

		DBHost:    getEnv("DB_HOST", "localhost"),
		DBPort:    getEnv("DB_PORT", "5433"), // Default to 5433
		DBUser:    getEnv("DB_USER", "fixflow_user"),
		DBPass:    getEnv("DB_PASSWORD", "fixflow_secure_pass_2026"),
		DBName:    getEnv("DB_NAME", "fixflow_db"),
		DBSSLMode: getEnv("DB_SSLMODE", "disable"),

		JWTSecret: getEnv("JWT_SECRET", "default_dev_secret_key_change_me"),
		JWTExpHrs: jwtExp,
	}

	log.Printf("📡 Database Target: %s:%s (DB: %s, User: %s)", cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBUser)

	return cfg, nil
}

func (c *Config) GetDSN() string {
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		return dbURL
	}
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Colombo",
		c.DBHost, c.DBUser, c.DBPass, c.DBName, c.DBPort, c.DBSSLMode,
	)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
