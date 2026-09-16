package handlers

import (
	"fmt"
	"net/http"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
)

type CreateTicketRequest struct {
	RoomID        uint   `json:"room_id" binding:"required"`
	AssetID       *uint  `json:"asset_id"`
	Description   string `json:"description" binding:"required"`
	ImageURL      string `json:"image_url"`
	SafetyRisk    bool   `json:"safety_risk"`
	UnusableRisk  bool   `json:"unusable_risk"`
	AffectedCount int    `json:"affected_count"`
}

// CalculatePriority executes the multi-factor scoring algorithm
func CalculatePriority(safety bool, unusable bool, affected int) (int, models.PriorityLevel) {
	score := 0

	// 1. Safety Hazard Weight (40%)
	if safety {
		score += 40
	}

	// 2. Operational Impact Weight (35%)
	if unusable {
		score += 35
	}

	// 3. Affected Users Weight (25%)
	if affected > 10 {
		score += 25
	} else if affected >= 2 {
		score += 15
	} else {
		score += 5
	}

	// Map score to Priority Level
	switch {
	case score >= 75:
		return score, models.PriorityCritical
	case score >= 50:
		return score, models.PriorityHigh
	case score >= 25:
		return score, models.PriorityMedium
	default:
		return score, models.PriorityLow
	}
}

// CreateRequest handles new maintenance issue submissions
func CreateRequest(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	var req CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Execute Smart Priority Engine
	score, priority := CalculatePriority(req.SafetyRisk, req.UnusableRisk, req.AffectedCount)

	// Generate sequential ticket number (FF-10000 + count)
	var ticketCount int64
	database.DB.Model(&models.MaintenanceRequest{}).Count(&ticketCount)
	ticketNum := fmt.Sprintf("FF-%05d", 10001+ticketCount)

	ticket := models.MaintenanceRequest{
		TicketNumber:       ticketNum,
		ReporterID:         userID,
		RoomID:             req.RoomID,
		AssetID:            req.AssetID,
		Description:        req.Description,
		ImageURL:           req.ImageURL,
		SafetyRisk:         req.SafetyRisk,
		UnusableRisk:       req.UnusableRisk,
		AffectedCount:      req.AffectedCount,
		PriorityScore:      score,
		CalculatedPriority: priority,
		Status:             models.StatusReported,
	}

	if err := database.DB.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create maintenance ticket"})
		return
	}

	// Preload relationships for response
	database.DB.Preload("Room.Floor.Building").Preload("Asset").First(&ticket, ticket.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Maintenance ticket submitted successfully",
		"ticket":  ticket,
	})
}

// GetMyRequests returns all issues submitted by the logged-in student/staff
func GetMyRequests(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	var tickets []models.MaintenanceRequest
	err := database.DB.
		Where("reporter_id = ?", userID).
		Preload("Room.Floor.Building").
		Preload("Asset").
		Preload("WorkOrder.Technician").
		Order("created_at desc").
		Find(&tickets).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your requests"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}