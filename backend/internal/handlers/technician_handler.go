package handlers

import (
	"fmt"
	"net/http"
	"time"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
	"fixflow-backend/internal/websocket"
)

// GetTechnicianTasks returns all work orders assigned to the logged-in technician
func GetTechnicianTasks(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	techID := userIDVal.(uint)

	var workOrders []models.WorkOrder
	err := database.DB.
		Where("technician_id = ?", techID).
		Preload("Request.Room.Floor.Building").
		Preload("Request.Asset").
		Preload("Request.Reporter").
		Preload("AuditLogs.Actor").
		Order("created_at desc").
		Find(&workOrders).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch technician tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"work_orders": workOrders})
}

// StartTask moves work order from ASSIGNED to IN_PROGRESS
func StartTask(c *gin.Context) {
	techIDVal, _ := c.Get("user_id")
	techID := techIDVal.(uint)
	taskID := c.Param("id")

	var wo models.WorkOrder
	if err := database.DB.Where("id = ? AND technician_id = ?", taskID, techID).First(&wo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found or unauthorized"})
		return
	}

	if wo.Status != models.WorkOrderAssigned {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task can only be started from ASSIGNED state"})
		return
	}

	// Update Status
	wo.Status = models.WorkOrderInProgress
	database.DB.Save(&wo)

	// Record Audit Log
	audit := models.AuditLog{
		WorkOrderID:   wo.ID,
		ActorID:       techID,
		Action:        "WORK_STARTED",
		PreviousState: string(models.WorkOrderAssigned),
		NewState:      string(models.WorkOrderInProgress),
	}
	database.DB.Create(&audit)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Work started on incident",
		"work_order": wo,
	})
}

type CompleteTaskPayload struct {
	TechnicianNotes string `json:"technician_notes" binding:"required"`
	AfterImageURL   string `json:"after_image_url"`
}

// CompleteTask records notes and after-photo, moving status to COMPLETED
func CompleteTask(c *gin.Context) {
	techIDVal, _ := c.Get("user_id")
	techID := techIDVal.(uint)
	taskID := c.Param("id")

	var payload CompleteTaskPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Technician notes are required to complete a job"})
		return
	}

	var wo models.WorkOrder
	if err := database.DB.Where("id = ? AND technician_id = ?", taskID, techID).First(&wo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found or unauthorized"})
		return
	}

	if wo.Status != models.WorkOrderInProgress {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task can only be completed from IN_PROGRESS state"})
		return
	}

	// Check if SLA was breached
	now := time.Now()
	slaBreached := now.After(wo.SLADeadline)

	wo.Status = models.WorkOrderCompleted
	wo.TechnicianNotes = payload.TechnicianNotes
	wo.AfterImageURL = payload.AfterImageURL
	wo.SLABreached = slaBreached
	database.DB.Save(&wo)

	// Record Audit Log
	audit := models.AuditLog{
		WorkOrderID:   wo.ID,
		ActorID:       techID,
		Action:        "WORK_COMPLETED",
		PreviousState: string(models.WorkOrderInProgress),
		NewState:      string(models.WorkOrderCompleted),
	}
	database.DB.Create(&audit)

	// Broadcast real-time completion alert to Admin
	websocket.Broadcast(
		"WORK_ORDER_COMPLETED",
		fmt.Sprintf("✅ Work order #%d completed. Awaiting admin verification.", wo.ID),
		wo,
	)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Work order marked as COMPLETED. Awaiting supervisor verification.",
		"work_order": wo,
	})
}