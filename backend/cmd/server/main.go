package main

import (
	"log"
	"net/http"

	"fixflow-backend/internal/config"
	"fixflow-backend/internal/database"
	"fixflow-backend/internal/handlers"
	"fixflow-backend/internal/middleware"
	"fixflow-backend/internal/models"
	"fixflow-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	_, err = database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	// Start Background SLA Escalation Goroutine
	services.StartSLAWorker()

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Static("/uploads", "./uploads")

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

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":      "healthy",
				"system":      "FixFlow API",
				"environment": cfg.AppEnv,
				"database":    "connected",
			})
		})

		api.POST("/auth/login", handlers.Login(cfg))

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			protected.GET("/auth/me", handlers.GetMe)
			protected.GET("/facilities", handlers.GetCampusHierarchy)
			protected.GET("/assets/:tag", handlers.GetAssetByTag)
			protected.POST("/upload", handlers.UploadImage)

			// Incident Requests & Feedback
			protected.POST("/requests", handlers.CreateRequest)
			protected.GET("/requests/my", handlers.GetMyRequests)
			protected.POST("/requests/:id/feedback", handlers.SubmitFeedback)

			// Technician Field Workbench
			techOnly := protected.Group("/technician")
			techOnly.Use(middleware.RequireRole(models.RoleTechnician))
			{
				techOnly.GET("/tasks", handlers.GetTechnicianTasks)
				techOnly.PATCH("/tasks/:id/start", handlers.StartTask)
				techOnly.POST("/tasks/:id/complete", handlers.CompleteTask)
			}

			// Admin Command Center & Verification
			adminOnly := protected.Group("/admin")
			adminOnly.Use(middleware.RequireRole(models.RoleAdmin))
			{
				adminOnly.GET("/incidents", handlers.GetAllIncidents)
				adminOnly.GET("/incidents/:id/recommendations", handlers.GetRecommendations)
				adminOnly.POST("/assign", handlers.AssignWorkOrder)
				adminOnly.POST("/work-orders/:id/verify", handlers.VerifyAndCloseWorkOrder)
				adminOnly.POST("/work-orders/:id/reopen", handlers.ReopenWorkOrder)
				adminOnly.GET("/analytics", handlers.GetAnalytics)
			}
		}
	}

	log.Printf(" FixFlow Server running on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
