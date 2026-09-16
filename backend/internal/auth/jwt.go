package auth

import (
	"errors"
	"time"

	"fixflow-backend/internal/config"
	"fixflow-backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   uint            `json:"user_id"`
	Email    string          `json:"email"`
	Role     models.UserRole `json:"role"`
	FullName string          `json:"full_name"`
	jwt.RegisteredClaims
}

// GenerateToken generates a signed JWT token for a user
func GenerateToken(user *models.User, cfg *config.Config) (string, error) {
	expirationTime := time.Now().Add(time.Duration(cfg.JWTExpHrs) * time.Hour)

	claims := &Claims{
		UserID:   user.ID,
		Email:    user.Email,
		Role:     user.Role,
		FullName: user.FullName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "fixflow-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

// ValidateToken parses and validates a token string
func ValidateToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid or expired token")
}