package handlers

import (
	"net/http"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
)

// GetCampusHierarchy returns all buildings with nested floors, rooms, and assets
func GetCampusHierarchy(c *gin.Context) {
	var buildings []models.Building

	err := database.DB.
		Preload("Floors.Rooms.Assets").
		Find(&buildings).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load campus facilities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"buildings": buildings})
}