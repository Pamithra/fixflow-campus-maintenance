package main

import (
	"log"
	"net/http"

	"fixflow-backend/internal/config"
	"fixflow-backend/internal/database"
	"fixflow-backend/internal/handlers"
	"fixflow-backend/internal/middleware"
	"fixflow-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load dynamic configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// 2. Connect to database & auto-migrate & seed
	_, err = database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	// 3. Set Gin environment mode
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// 4. Dynamic CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.ClientOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// 5. API Routes
	api := r.Group("/api")
	{
		// Public Endpoints
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":      "healthy",
				"system":      "FixFlow API",
				"environment": cfg.AppEnv,
				"database":    "connected",
			})
		})

		// Auth Routes
		api.POST("/auth/login", handlers.Login(cfg))

		// Protected Routes (Require valid JWT)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			protected.GET("/auth/me", handlers.GetMe)
			protected.GET("/facilities", handlers.GetCampusHierarchy)

			// Role-Specific Test Guard
			adminOnly := protected.Group("/admin")
			adminOnly.Use(middleware.RequireRole(models.RoleAdmin))
			{
				adminOnly.GET("/ping", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"message": "Welcome Admin!"})
				})
			}
		}
	}

	// 6. Start the HTTP server
	log.Printf(" FixFlow Server running on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}