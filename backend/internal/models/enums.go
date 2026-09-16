package models

// User Roles
type UserRole string

const (
	RoleStudent    UserRole = "STUDENT"
	RoleTechnician UserRole = "TECHNICIAN"
	RoleAdmin      UserRole = "ADMIN"
)

// Ticket Priority
type PriorityLevel string

const (
	PriorityLow      PriorityLevel = "LOW"
	PriorityMedium   PriorityLevel = "MEDIUM"
	PriorityHigh     PriorityLevel = "HIGH"
	PriorityCritical PriorityLevel = "CRITICAL"
)

// Request Lifecycle Statuses
type RequestStatus string

const (
	StatusReported    RequestStatus = "REPORTED"
	StatusUnderReview RequestStatus = "UNDER_REVIEW"
	StatusApproved    RequestStatus = "APPROVED"
	StatusRejected    RequestStatus = "REJECTED"
	StatusClosed      RequestStatus = "CLOSED"
)

// Work Order Lifecycle Statuses
type WorkOrderStatus string

const (
	WorkOrderAssigned   WorkOrderStatus = "ASSIGNED"
	WorkOrderInProgress WorkOrderStatus = "IN_PROGRESS"
	WorkOrderOnHold     WorkOrderStatus = "ON_HOLD"
	WorkOrderCompleted  WorkOrderStatus = "COMPLETED"
	WorkOrderVerified   WorkOrderStatus = "VERIFIED"
	WorkOrderClosed     WorkOrderStatus = "CLOSED"
)
