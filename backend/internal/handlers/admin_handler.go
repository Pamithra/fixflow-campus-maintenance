package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"fixflow-backend/internal/services"
	"fixflow-backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

// TechnicianRecommendation represents a scored technician
type TechnicianRecommendation struct {
	Technician     models.User `json:"technician"`
	SkillMatch     bool        `json:"skill_match"`
	ActiveWorkload int64       `json:"active_workload"`
	IsAvailable    bool        `json:"is_available"` // True if 0 active jobs (free to take work)
	MatchScore     int         `json:"match_score"`
}

// GetAllIncidents returns all campus tickets for dispatcher triage
func GetAllIncidents(c *gin.Context) {
	var tickets []models.MaintenanceRequest

	err := database.DB.
		Preload("Room").
		Preload("Room.Floor").
		Preload("Room.Floor.Building").
		Preload("Asset").
		Preload("Reporter").
		Preload("WorkOrder").
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

	// Target category: from Asset if attached, or mapped from EquipmentCategory
	targetCategory := "General"
	if ticket.Asset != nil && ticket.Asset.Category != "" {
		targetCategory = ticket.Asset.Category
	} else if ticket.EquipmentCategory != "" {
		eq := strings.ToUpper(ticket.EquipmentCategory)
		if strings.Contains(eq, "AIR CONDITIONER") || strings.Contains(eq, "AC") || strings.Contains(eq, "HVAC") || strings.Contains(eq, "COOLING") {
			targetCategory = "General"
		} else if strings.Contains(eq, "IT") || strings.Contains(eq, "COMPUTER") || strings.Contains(eq, "PROJECTOR") || strings.Contains(eq, "NETWORK") || strings.Contains(eq, "WI-FI") {
			targetCategory = "IT"
		} else if strings.Contains(eq, "ELECTRICAL") || strings.Contains(eq, "LIGHTING") || strings.Contains(eq, "POWER") {
			targetCategory = "Electrical"
		} else if strings.Contains(eq, "PLUMBING") || strings.Contains(eq, "WASHROOM") || strings.Contains(eq, "WATER") {
			targetCategory = "Plumbing"
		} else {
			targetCategory = "General"
		}
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

		isAvailable := activeJobs == 0
		score := 0

		// 1. Availability Bonus (50 pts if 100% free / 0 active tasks)
		if isAvailable {
			score += 50
		} else {
			penalty := int(activeJobs * 15)
			if penalty > 40 {
				penalty = 40
			}
			score += (40 - penalty)
		}

		// 2. Skill Match Weight (50 pts for exact specialty match)
		skillMatch := tech.SkillCategory == targetCategory
		if skillMatch {
			score += 50
		} else if tech.SkillCategory == "General" {
			score += 20 // General maintenance can take general tasks
		}

		recommendations = append(recommendations, TechnicianRecommendation{
			Technician:     tech,
			SkillMatch:     skillMatch,
			ActiveWorkload: activeJobs,
			IsAvailable:    isAvailable,
			MatchScore:     score,
		})
	}

	// Sort available technicians with matching skills first
	sort.Slice(recommendations, func(i, j int) bool {
		if recommendations[i].IsAvailable != recommendations[j].IsAvailable {
			return recommendations[i].IsAvailable // available (free) first!
		}
		if recommendations[i].MatchScore != recommendations[j].MatchScore {
			return recommendations[i].MatchScore > recommendations[j].MatchScore
		}
		return recommendations[i].ActiveWorkload < recommendations[j].ActiveWorkload
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
	if err := database.DB.Preload("Reporter").Preload("Room").Preload("Room.Floor").Preload("Room.Floor.Building").Preload("Asset").First(&ticket, payload.RequestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	// Calculate SLA Target Hours based on Priority (Campus Standards)
	var slaHours int
	switch ticket.CalculatedPriority {
	case models.PriorityCritical:
		slaHours = 1 // 1 Hour for Critical / Immediate
	case models.PriorityHigh:
		slaHours = 4 // 4 Hours for High Urgency
	case models.PriorityMedium:
		slaHours = 8 // 8 Hours (Same Day) for Medium
	default:
		slaHours = 24 // 24 Hours (Next Day) for Low Routine
	}
	deadline := time.Now().Add(time.Duration(slaHours) * time.Hour)

	// Create or update Work Order (reassignment support)
	var workOrder models.WorkOrder
	isReassignment := false
	if err := database.DB.Where("request_id = ?", ticket.ID).First(&workOrder).Error; err == nil {
		isReassignment = true
		workOrder.TechnicianID = &payload.TechnicianID
		workOrder.Status = models.WorkOrderAssigned
		workOrder.SLADeadline = deadline
		workOrder.SLABreached = false
		if err := database.DB.Save(&workOrder).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reassign work order"})
			return
		}
	} else {
		workOrder = models.WorkOrder{
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
	}

	// Update ticket status to APPROVED
	ticket.Status = models.StatusApproved
	database.DB.Save(&ticket)

	// Record Audit Log
	actionName := "ASSIGNED_TECHNICIAN"
	if isReassignment {
		actionName = "REASSIGNED_TECHNICIAN"
	}
	audit := models.AuditLog{
		WorkOrderID:   workOrder.ID,
		ActorID:       adminID,
		Action:        actionName,
		PreviousState: string(models.StatusReported),
		NewState:      string(models.WorkOrderAssigned),
	}
	database.DB.Create(&audit)

	// Broadcast real-time assignment update
	websocket.Broadcast(
		"WORK_ORDER_ASSIGNED",
		fmt.Sprintf("⚡ %s assigned to technician", ticket.TicketNumber),
		workOrder,
	)

	// Look up assigned technician details
	var tech models.User
	database.DB.First(&tech, payload.TechnicianID)

	// Identify equipment name clearly
	equipName := ticket.CustomEquipmentName
	if equipName == "" && ticket.Asset != nil {
		equipName = ticket.Asset.Name
	}
	if equipName == "" && ticket.EquipmentCategory != "" {
		equipName = ticket.EquipmentCategory
	}
	if equipName == "" {
		equipName = "Equipment"
	}

	floorDisplay := fmt.Sprintf("Floor %d", ticket.Room.Floor.FloorNumber)
	if ticket.Room.Floor.FloorNumber == 0 {
		floorDisplay = "Ground Floor (Floor 0)"
	}

	// Send message to the user's phone number
	assignWord := "assigned"
	if isReassignment {
		assignWord = "reassigned"
	}
	smsMsg := fmt.Sprintf(
		"FixFlow Alert: Your reported issue (%s) for %s in %s, %s (%s) has been %s to technician %s.",
		ticket.TicketNumber,
		equipName,
		ticket.Room.RoomNumber,
		ticket.Room.Floor.Building.Name,
		floorDisplay,
		assignWord,
		tech.FullName,
	)
	services.SendSMS(ticket.ReporterID, ticket.Reporter.PhoneNumber, ticket.Reporter.FullName, smsMsg, "ASSIGNMENT", ticket.TicketNumber)

	respMsg := fmt.Sprintf("Work order dispatched to %s. SLA Deadline set to %d hours.", tech.FullName, slaHours)
	if isReassignment {
		respMsg = fmt.Sprintf("Work order successfully reassigned to %s. SLA Deadline refreshed to %d hours.", tech.FullName, slaHours)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    respMsg,
		"work_order": workOrder,
	})
}

// VerifyAndCloseWorkOrder approves the repair and closes the ticket
func VerifyAndCloseWorkOrder(c *gin.Context) {
	adminIDVal, _ := c.Get("user_id")
	adminID := adminIDVal.(uint)
	taskID := c.Param("id")

	var wo models.WorkOrder
	if err := database.DB.First(&wo, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	if wo.Status != models.WorkOrderCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only COMPLETED work orders can be verified"})
		return
	}

	wo.Status = models.WorkOrderClosed
	database.DB.Save(&wo)

	// Update the parent request status to CLOSED
	var req models.MaintenanceRequest
	if err := database.DB.Preload("Reporter").Preload("Room").Preload("Room.Floor").Preload("Room.Floor.Building").Preload("Asset").First(&req, wo.RequestID).Error; err == nil {
		req.Status = models.StatusClosed
		database.DB.Save(&req)

		equipName := req.CustomEquipmentName
		if equipName == "" && req.Asset != nil {
			equipName = req.Asset.Name
		}
		if equipName == "" && req.EquipmentCategory != "" {
			equipName = req.EquipmentCategory
		}
		if equipName == "" {
			equipName = "Equipment"
		}

		floorDisplay := fmt.Sprintf("Floor %d", req.Room.Floor.FloorNumber)
		if req.Room.Floor.FloorNumber == 0 {
			floorDisplay = "Ground Floor (Floor 0)"
		}

		completionMsg := fmt.Sprintf(
			"FixFlow Alert: Maintenance for %s in %s (%s) is completed! Please open FixFlow to rate the service (1-5 stars) and confirm if the equipment is working properly.",
			equipName,
			req.Room.RoomNumber,
			floorDisplay,
		)
		services.SendSMS(req.ReporterID, req.Reporter.PhoneNumber, req.Reporter.FullName, completionMsg, "COMPLETION", req.TicketNumber)
	}

	// Record Audit Log
	audit := models.AuditLog{
		WorkOrderID:   wo.ID,
		ActorID:       adminID,
		Action:        "VERIFIED_AND_CLOSED",
		PreviousState: string(models.WorkOrderCompleted),
		NewState:      string(models.WorkOrderClosed),
	}
	database.DB.Create(&audit)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Work order verified, incident closed, and completion SMS notification sent to user.",
		"work_order": wo,
	})
}

// ReopenWorkOrder sends the ticket back to the technician if repair failed inspection
func ReopenWorkOrder(c *gin.Context) {
	adminIDVal, _ := c.Get("user_id")
	adminID := adminIDVal.(uint)
	taskID := c.Param("id")

	var wo models.WorkOrder
	if err := database.DB.First(&wo, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	wo.Status = models.WorkOrderInProgress
	database.DB.Save(&wo)

	// Record Audit Log
	audit := models.AuditLog{
		WorkOrderID:   wo.ID,
		ActorID:       adminID,
		Action:        "REOPENED_BY_ADMIN",
		PreviousState: string(models.WorkOrderCompleted),
		NewState:      string(models.WorkOrderInProgress),
	}
	database.DB.Create(&audit)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Work order reopened and sent back to technician",
		"work_order": wo,
	})
}
