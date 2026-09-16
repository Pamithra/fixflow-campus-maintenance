package handlers

import (
	"net/http"

	"fixflow-backend/internal/auth"
	"fixflow-backend/internal/config"
	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID            uint            `json:"id"`
	Email         string          `json:"email"`
	FullName      string          `json:"full_name"`
	Role          models.UserRole `json:"role"`
	SkillCategory string          `json:"skill_category,omitempty"`
}

// Login handles user authentication and returns a signed JWT
func Login(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload. Email and password are required."})
			return
		}

		var user models.User
		if err := database.DB.Where("email = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		// Verify bcrypt password hash
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		token, err := auth.GenerateToken(&user, cfg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user": UserResponse{
				ID:            user.ID,
				Email:         user.Email,
				FullName:      user.FullName,
				Role:          user.Role,
				SkillCategory: user.SkillCategory,
			},
		})
	}
}

// GetMe returns the authenticated user's profile
func GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			FullName:      user.FullName,
			Role:          user.Role,
			SkillCategory: user.SkillCategory,
		},
	})
}