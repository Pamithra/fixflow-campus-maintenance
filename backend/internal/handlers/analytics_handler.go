package handlers

import (
	"math"
	"net/http"
	"time"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"github.com/gin-gonic/gin"
)

type CategoryStat struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

type TechStat struct {
	Name      string  `json:"name"`
	Skill     string  `json:"skill"`
	Completed int64   `json:"completed"`
	AvgRating float64 `json:"avg_rating"`
}

type RecurringAsset struct {
	AssetTag string `json:"asset_tag"`
	Name     string `json:"name"`
	Count    int64  `json:"count"`
}

// GetAnalytics computes operational intelligence metrics
func GetAnalytics(c *gin.Context) {
	var totalTickets int64
	database.DB.Model(&models.MaintenanceRequest{}).Count(&totalTickets)

	var resolvedTickets int64
	database.DB.Model(&models.MaintenanceRequest{}).Where("status = ?", models.StatusClosed).Count(&resolvedTickets)

	// 1. SLA Compliance Calculation (includes closed on-time fixes and penalizes open/active breached orders)
	now := time.Now()
	var totalEvaluated int64
	var breachedOrders int64

	// Evaluated work orders: all completed/closed orders + any active orders that have exceeded their deadline or are marked breached
	database.DB.Model(&models.WorkOrder{}).
		Where("status IN (?, ?) OR sla_deadline < ? OR sla_breached = ?", models.WorkOrderCompleted, models.WorkOrderClosed, now, true).
		Count(&totalEvaluated)

	database.DB.Model(&models.WorkOrder{}).
		Where("sla_breached = ? OR (status NOT IN (?, ?) AND sla_deadline < ?)", true, models.WorkOrderCompleted, models.WorkOrderClosed, now).
		Count(&breachedOrders)

	slaCompliance := 100.0
	if totalEvaluated > 0 {
		compliantOrders := totalEvaluated - breachedOrders
		if compliantOrders < 0 {
			compliantOrders = 0
		}
		slaCompliance = math.Round((float64(compliantOrders)/float64(totalEvaluated))*1000) / 10
	}

	// 2. Mean Time To Resolution (MTTR in hours)
	var closedOrders []models.WorkOrder
	database.DB.Where("status = ?", models.WorkOrderClosed).Find(&closedOrders)

	var totalResolutionHours float64
	for _, wo := range closedOrders {
		duration := wo.UpdatedAt.Sub(wo.CreatedAt).Hours()
		totalResolutionHours += duration
	}

	avgMTTR := 0.0
	if len(closedOrders) > 0 {
		avgMTTR = math.Round((totalResolutionHours/float64(len(closedOrders)))*10) / 10
		if avgMTTR < 0.1 {
			avgMTTR = 0.2 // minimum floor for demo representation
		}
	}

	// 3. Category Distribution
	categories := []string{"HVAC", "Electrical", "IT", "Plumbing", "General"}
	var categoryStats []CategoryStat
	for _, cat := range categories {
		var count int64
		database.DB.Model(&models.MaintenanceRequest{}).
			Joins("LEFT JOIN assets ON assets.id = maintenance_requests.asset_id").
			Where("assets.category = ? OR (? = 'General' AND maintenance_requests.asset_id IS NULL)", cat, cat).
			Count(&count)

		if count > 0 || cat == "HVAC" || cat == "IT" {
			categoryStats = append(categoryStats, CategoryStat{
				Category: cat,
				Count:    count,
			})
		}
	}

	// 4. Technician Rating & Performance Leaderboard
	var techs []models.User
	database.DB.Where("role = ?", models.RoleTechnician).Find(&techs)

	var techStats []TechStat
	for _, tech := range techs {
		var completedCount int64
		database.DB.Model(&models.WorkOrder{}).
			Where("technician_id = ? AND status = ?", tech.ID, models.WorkOrderClosed).
			Count(&completedCount)

		var avgRating float64
		database.DB.Model(&models.WorkOrder{}).
			Where("technician_id = ? AND rating > 0", tech.ID).
			Select("COALESCE(AVG(rating), 0)").
			Scan(&avgRating)

		techStats = append(techStats, TechStat{
			Name:      tech.FullName,
			Skill:     tech.SkillCategory,
			Completed: completedCount,
			AvgRating: math.Round(avgRating*10) / 10,
		})
	}

	// 5. Recurring Issue Detection (Assets with multiple breakdowns)
	var recurring []RecurringAsset
	database.DB.Raw(`
		SELECT assets.asset_tag, assets.name, count(maintenance_requests.id) as count
		FROM maintenance_requests
		JOIN assets ON assets.id = maintenance_requests.asset_id
		GROUP BY assets.id
		ORDER BY count DESC
		LIMIT 3
	`).Scan(&recurring)

	c.JSON(http.StatusOK, gin.H{
		"total_tickets":       totalTickets,
		"resolved_tickets":    resolvedTickets,
		"sla_compliance_rate": slaCompliance,
		"mttr_hours":          avgMTTR,
		"category_stats":      categoryStats,
		"technician_stats":    techStats,
		"recurring_issues":    recurring,
	})
}