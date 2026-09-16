package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
)

// TechnicianRecommendation represents a scored technician
type TechnicianRecommendation struct {
	Technician     models.User `json:"technician"`
	SkillMatch     bool        `json:"skill_match"`
	ActiveWorkload int64       `json:"active_workload"`
	MatchScore     int         `json:"match_score"`
}

// GetAllIncidents returns all campus tickets for dispatcher triage
func GetAllIncidents(c *gin.Context) {
	var tickets []models.MaintenanceRequest

	err := database.DB.
		Preload("Room.Floor.Building").
		Preload("Asset").
		Preload("Reporter").
		Preload("WorkOrder.Technician").
		Order("created_at desc").
		Find(&tickets).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch incidents"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}

// GetRecommendations scores and ranks technicians for a specific incident
func GetRecommendations(c *gin.Context) {
	ticketID := c.Param("id")

	var ticket models.MaintenanceRequest
	if err := database.DB.Preload("Asset").First(&ticket, ticketID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	// Target category: from Asset if attached, or generic
	targetCategory := "General"
	if ticket.Asset != nil && ticket.Asset.Category != "" {
		targetCategory = ticket.Asset.Category
	}

	// Fetch all active technicians
	var techs []models.User
	if err := database.DB.Where("role = ? AND is_active = ?", models.RoleTechnician, true).Find(&techs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query technicians"})
		return
	}

	var recommendations []TechnicianRecommendation

	for _, tech := range techs {
		// Count currently active work orders for this technician
		var activeJobs int64
		database.DB.Model(&models.WorkOrder{}).
			Where("technician_id = ? AND status IN (?, ?)", tech.ID, models.WorkOrderAssigned, models.WorkOrderInProgress).
			Count(&activeJobs)

		// 1. Skill Match Weight (50 pts)
		skillMatch := tech.SkillCategory == targetCategory
		score := 0
		if skillMatch {
			score += 50
		}

		// 2. Base Availability (30 pts)
		score += 30

		// 3. Workload Penalty (-10 pts per active job)
		score -= int(activeJobs * 10)
		if score < 0 {
			score = 0
		}

		recommendations = append(recommendations, TechnicianRecommendation{
			Technician:     tech,
			SkillMatch:     skillMatch,
			ActiveWorkload: activeJobs,
			MatchScore:     score,
		})
	}

	// Sort highest match score first
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].MatchScore > recommendations[j].MatchScore
	})

	c.JSON(http.StatusOK, gin.H{
		"target_category": targetCategory,
		"recommendations": recommendations,
	})
}

type AssignPayload struct {
	RequestID    uint `json:"request_id" binding:"required"`
	TechnicianID uint `json:"technician_id" binding:"required"`
}

// AssignWorkOrder dispatches the ticket and generates SLA deadline
func AssignWorkOrder(c *gin.Context) {
	adminIDVal, _ := c.Get("user_id")
	adminID := adminIDVal.(uint)

	var payload AssignPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var ticket models.MaintenanceRequest
	if err := database.DB.First(&ticket, payload.RequestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	// Calculate SLA Target Hours based on Priority
	var slaHours int
	switch ticket.CalculatedPriority {
	case models.PriorityCritical:
		slaHours = 2
	case models.PriorityHigh:
		slaHours = 8
	case models.PriorityMedium:
		slaHours = 24
	default:
		slaHours = 72
	}
	deadline := time.Now().Add(time.Duration(slaHours) * time.Hour)

	// Create or update Work Order
	workOrder := models.WorkOrder{
		RequestID:    ticket.ID,
		TechnicianID: &payload.TechnicianID,
		Status:       models.WorkOrderAssigned,
		SLADeadline:  deadline,
		SLABreached:  false,
	}

	if err := database.DB.Create(&workOrder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create work order"})
		return
	}

	// Update ticket status to APPROVED
	ticket.Status = models.StatusApproved
	database.DB.Save(&ticket)

	// Record Audit Log
	audit := models.AuditLog{
		WorkOrderID:   workOrder.ID,
		ActorID:       adminID,
		Action:        "ASSIGNED_TECHNICIAN",
		PreviousState: string(models.StatusReported),
		NewState:      string(models.WorkOrderAssigned),
	}
	database.DB.Create(&audit)

	c.JSON(http.StatusOK, gin.H{
		"message":    fmt.Sprintf("Work order created. SLA Deadline set to %d hours.", slaHours),
		"work_order": workOrder,
	})
}