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
	PhoneNumber   string          `json:"phone_number"`
	Role          models.UserRole `json:"role"`
	SkillCategory string          `json:"skill_category,omitempty"`
}

type RegisterRequest struct {
	FullName      string          `json:"full_name" binding:"required"`
	Email         string          `json:"email" binding:"required,email"`
	Password      string          `json:"password" binding:"required,min=6"`
	PhoneNumber   string          `json:"phone_number" binding:"required"`
	Role          models.UserRole `json:"role" binding:"required"`
	SkillCategory string          `json:"skill_category"`
}

// Register creates a new user account (Student, Staff, Technician, Admin)
func Register(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide all required fields with a valid email and password (minimum 6 characters)."})
			return
		}

		// Validate role
		validRoles := map[models.UserRole]bool{
			models.RoleStudent:    true,
			models.RoleStaff:      true,
			models.RoleTechnician: true,
			models.RoleAdmin:      true,
		}
		if !validRoles[req.Role] {
			req.Role = models.RoleStudent
		}

		// Check if email already registered
		var existing models.User
		if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "An account with this email already exists. Please sign in."})
			return
		}

		// Hash password with bcrypt
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
			return
		}

		newUser := models.User{
			FullName:      req.FullName,
			Email:         req.Email,
			PasswordHash:  string(hashedBytes),
			PhoneNumber:   req.PhoneNumber,
			Role:          req.Role,
			SkillCategory: req.SkillCategory,
			IsActive:      true,
		}

		if err := database.DB.Create(&newUser).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account"})
			return
		}

		// Generate authentication token
		token, err := auth.GenerateToken(&newUser, cfg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Account created, but failed to generate token. Please sign in."})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Account created successfully!",
			"token":   token,
			"user": UserResponse{
				ID:            newUser.ID,
				Email:         newUser.Email,
				FullName:      newUser.FullName,
				PhoneNumber:   newUser.PhoneNumber,
				Role:          newUser.Role,
				SkillCategory: newUser.SkillCategory,
			},
		})
	}
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
				PhoneNumber:   user.PhoneNumber,
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
			PhoneNumber:   user.PhoneNumber,
			Role:          user.Role,
			SkillCategory: user.SkillCategory,
		},
	})
}

// GetMyNotifications returns the phone notifications for the logged-in user
func GetMyNotifications(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	var notifications []models.SMSNotification
	if err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(30).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

// MarkNotificationsRead marks notifications as read for the current user
func MarkNotificationsRead(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	type MarkReadRequest struct {
		ID uint `json:"id"`
	}
	var req MarkReadRequest
	_ = c.ShouldBindJSON(&req)

	query := database.DB.Model(&models.SMSNotification{}).Where("user_id = ?", userID)
	if req.ID > 0 {
		query = query.Where("id = ?", req.ID)
	}

	if err := query.Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notifications marked as read"})
}

type ResetPasswordRequest struct {
	Email       string `json:"email" binding:"required,email"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ResetPassword allows users to set a new password
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid email and new password (minimum 6 characters)."})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No account found with this email address."})
		return
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
		return
	}

	user.PasswordHash = string(hashedBytes)
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully. You can now sign in with your new password."})
}