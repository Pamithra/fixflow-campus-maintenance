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
	"fixflow-backend/internal/websocket" // <-- 1. WebSocket package

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

	// 2. Start Background Workers
	services.StartSLAWorker()
	go websocket.GlobalHub.Run() // <-- 2. Start WebSocket Hub goroutine

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Static("/uploads", "./uploads")

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
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

		// 3. Register WebSocket Endpoint (Public)
		api.GET("/ws", websocket.HandleWS)

		// Public Auth Endpoints
		api.POST("/auth/login", handlers.Login(cfg))
		api.POST("/auth/register", handlers.Register(cfg))
		api.POST("/auth/reset-password", handlers.ResetPassword)

		// Public Asset and Facilities resolution (supports instant QR pre-scans)
		api.GET("/facilities", handlers.GetCampusHierarchy)
		api.GET("/assets/:tag", handlers.GetAssetByTag)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			protected.GET("/auth/me", handlers.GetMe)
			protected.GET("/notifications/my", handlers.GetMyNotifications)
			protected.PATCH("/notifications/read", handlers.MarkNotificationsRead)
			protected.POST("/upload", handlers.UploadImage)

			// Incident Requests
			protected.POST("/requests", handlers.CreateRequest)
			protected.GET("/requests/my", handlers.GetMyRequests)
			protected.POST("/requests/:id/feedback", handlers.SubmitFeedback)

			// Technician Workbench (Technicians & Admins)
			techOnly := protected.Group("/technician")
			techOnly.Use(middleware.RequireRole(models.RoleTechnician, models.RoleAdmin))
			{
				techOnly.GET("/tasks", handlers.GetTechnicianTasks)
				techOnly.PATCH("/tasks/:id/start", handlers.StartTask)
				techOnly.POST("/tasks/:id/complete", handlers.CompleteTask)
			}

			// Admin Command Center
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
