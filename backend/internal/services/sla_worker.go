package services

import (
	"log"
	"time"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
)

// StartSLAWorker initiates a background goroutine to monitor deadlines
func StartSLAWorker() {
	ticker := time.NewTicker(30 * time.Second)

	go func() {
		for range ticker.C {
			checkSLABreaches()
		}
	}()

	log.Println("⏱️  SLA Escalation Background Worker started (checking every 30s)")
}

func checkSLABreaches() {
	now := time.Now()

	var overdueOrders []models.WorkOrder
	err := database.DB.
		Where("status IN (?, ?) AND sla_deadline < ? AND sla_breached = ?",
			models.WorkOrderAssigned, models.WorkOrderInProgress, now, false).
		Find(&overdueOrders).Error

	if err != nil {
		log.Printf("⚠️ SLA worker query error: %v", err)
		return
	}

	for _, wo := range overdueOrders {
		wo.SLABreached = true
		database.DB.Save(&wo)

		// Record an automatic escalation audit log
		audit := models.AuditLog{
			WorkOrderID:   wo.ID,
			ActorID:       1, // System Admin
			Action:        "SLA_BREACH_ESCALATED",
			PreviousState: string(wo.Status),
			NewState:      "OVERDUE",
		}
		database.DB.Create(&audit)

		log.Printf("🚨 SLA BREACH DETECTED for Work Order #%d (Deadline was %s)", wo.ID, wo.SLADeadline.Format(time.RFC822))
	}
}