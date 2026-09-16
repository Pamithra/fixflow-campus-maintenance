package middleware

import (
	"net/http"
	"strings"

	"fixflow-backend/internal/auth"
	"fixflow-backend/internal/config"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT and sets user context
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format. Use 'Bearer <token>'"})
			c.Abort()
			return
		}

		claims, err := auth.ValidateToken(parts[1], cfg.JWTSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Attach user context to the request
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("user_name", claims.FullName)

		c.Next()
	}
}

// RequireRole restricts endpoint access to specified roles
func RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access"})
			c.Abort()
			return
		}

		userRole := roleVal.(models.UserRole)
		for _, r := range allowedRoles {
			if userRole == r {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: insufficient role permissions"})
		c.Abort()
	}
}