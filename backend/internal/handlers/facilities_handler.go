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

// GetAssetByTag returns a clean, flat payload for instant QR code auto-selection
func GetAssetByTag(c *gin.Context) {
	tag := c.Param("tag")

	var asset models.Asset
	if err := database.DB.Where("asset_tag = ?", tag).First(&asset).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found with that QR tag"})
		return
	}

	var room models.Room
	database.DB.First(&room, asset.RoomID)

	var floor models.Floor
	database.DB.Preload("Building").First(&floor, room.FloorID)

	// Return flat IDs and metadata so the frontend can populate fields directly
	c.JSON(http.StatusOK, gin.H{
		"building_id":   floor.BuildingID,
		"building_name": floor.Building.Name,
		"floor_id":      floor.ID,
		"floor_number":  floor.FloorNumber,
		"room_id":       room.ID,
		"room_number":   room.RoomNumber,
		"room_type":     room.RoomType,
		"asset_id":      asset.ID,
		"asset_name":    asset.Name,
		"asset_tag":     asset.AssetTag,
		"category":      asset.Category,
	})
}