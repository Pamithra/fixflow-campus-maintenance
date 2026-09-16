package models

import (
	"time"
	"gorm.io/gorm"
)

// User Entity
type User struct {
	gorm.Model
	Email         string   `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash  string   `gorm:"not null" json:"-"`
	FullName      string   `gorm:"not null" json:"full_name"`
	Role          UserRole `gorm:"type:varchar(20);not null" json:"role"`
	SkillCategory string   `gorm:"type:varchar(50)" json:"skill_category"` // HVAC, Electrical, Plumbing, IT
	IsActive      bool     `gorm:"default:true" json:"is_active"`
}

// Campus Location Entities
type Building struct {
	gorm.Model
	Name   string  `gorm:"uniqueIndex;not null" json:"name"`
	Code   string  `gorm:"uniqueIndex;not null" json:"code"` // e.g. "ENG", "MGT"
	Floors []Floor `gorm:"foreignKey:BuildingID" json:"floors,omitempty"`
}

type Floor struct {
	gorm.Model
	BuildingID  uint     `gorm:"not null" json:"building_id"`
	FloorNumber int      `gorm:"not null" json:"floor_number"`
	Rooms       []Room   `gorm:"foreignKey:FloorID" json:"rooms,omitempty"`
	Building    Building `gorm:"foreignKey:BuildingID" json:"-"`
}

type Room struct {
	gorm.Model
	FloorID    uint    `gorm:"not null" json:"floor_id"`
	RoomNumber string  `gorm:"not null" json:"room_number"` // e.g. "A204"
	RoomType   string  `json:"room_type"`                   // "Lecture Hall", "Lab", "Office"
	Floor      Floor   `gorm:"foreignKey:FloorID" json:"-"`
	Assets     []Asset `gorm:"foreignKey:RoomID" json:"assets,omitempty"`
}

// Asset Entity (Physical equipment with QR code tracking)
type Asset struct {
	gorm.Model
	AssetTag  string `gorm:"uniqueIndex;not null" json:"asset_tag"` // e.g. "AC-ENG-A204-01"
	Name      string `gorm:"not null" json:"name"`
	Category  string `gorm:"not null" json:"category"` // "HVAC", "IT", "Electrical"
	RoomID    uint   `gorm:"not null" json:"room_id"`
	Status    string `gorm:"default:'OPERATIONAL'" json:"status"`
	Room      Room   `gorm:"foreignKey:RoomID" json:"room,omitempty"`
}

// Maintenance Incident Request
type MaintenanceRequest struct {
	gorm.Model
	TicketNumber       string        `gorm:"uniqueIndex;not null" json:"ticket_number"` // e.g. "FF-10001"
	ReporterID         uint          `gorm:"not null" json:"reporter_id"`
	AssetID            *uint         `json:"asset_id"`
	RoomID             uint          `gorm:"not null" json:"room_id"`
	Description        string        `gorm:"not null" json:"description"`
	ImageURL           string        `json:"image_url"`
	
	// Deterministic Priority Engine Inputs
	SafetyRisk         bool          `gorm:"default:false" json:"safety_risk"`
	UnusableRisk       bool          `gorm:"default:false" json:"unusable_risk"`
	AffectedCount      int           `gorm:"default:1" json:"affected_count"`
	PriorityScore      int           `json:"priority_score"`
	CalculatedPriority PriorityLevel `gorm:"type:varchar(20);not null" json:"calculated_priority"`
	
	Status             RequestStatus `gorm:"type:varchar(20);default:'REPORTED'" json:"status"`
	
	Reporter           User          `gorm:"foreignKey:ReporterID" json:"reporter,omitempty"`
	Asset              *Asset        `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	Room               Room          `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	WorkOrder          *WorkOrder    `gorm:"foreignKey:RequestID" json:"work_order,omitempty"`
}

// Work Order Execution
type WorkOrder struct {
	gorm.Model
	RequestID        uint                `gorm:"uniqueIndex;not null" json:"request_id"`
	TechnicianID     *uint               `json:"technician_id"`
	Status           WorkOrderStatus     `gorm:"type:varchar(20);default:'ASSIGNED'" json:"status"`
	SLADeadline      time.Time           `json:"sla_deadline"`
	SLABreached      bool                `gorm:"default:false" json:"sla_breached"`
	AfterImageURL    string              `json:"after_image_url"`
	TechnicianNotes  string              `json:"technician_notes"`
	Rating           int                 `json:"rating"` // 1-5
	FeedbackComments string              `json:"feedback_comments"`

	Request          *MaintenanceRequest `gorm:"foreignKey:RequestID" json:"request,omitempty"`
	Technician       *User               `gorm:"foreignKey:TechnicianID" json:"technician,omitempty"`
	AuditLogs        []AuditLog          `gorm:"foreignKey:WorkOrderID" json:"audit_logs,omitempty"`
}

// Full Operational Audit Trail
type AuditLog struct {
	gorm.Model
	WorkOrderID   uint   `gorm:"not null" json:"work_order_id"`
	ActorID       uint   `gorm:"not null" json:"actor_id"`
	Action        string `gorm:"not null" json:"action"`
	PreviousState string `json:"previous_state"`
	NewState      string `json:"new_state"`
	Actor         User   `gorm:"foreignKey:ActorID" json:"actor,omitempty"`
}