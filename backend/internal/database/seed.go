package database

import (
	"log"

	"fixflow-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	// 1. Check if database already has users
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		log.Println("🌱 Database already seeded, skipping.")
		return
	}

	log.Println("🌱 Seeding initial campus data...")

	// Helper for password hashing
	hashPassword := func(pwd string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		return string(h)
	}

	// 2. Create Initial Users (Admin, Technicians, Student)
	users := []models.User{
		{
			FullName:      "Campus Maintenance Admin",
			Email:         "admin@fixflow.edu",
			PasswordHash:  hashPassword("Admin@123"),
			Role:          models.RoleAdmin,
			SkillCategory: "",
			IsActive:      true,
		},
		{
			FullName:      "Kasun Perera",
			Email:         "kasun.hvac@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			Role:          models.RoleTechnician,
			SkillCategory: "HVAC",
			IsActive:      true,
		},
		{
			FullName:      "Nimal Silva",
			Email:         "nimal.elec@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			Role:          models.RoleTechnician,
			SkillCategory: "Electrical",
			IsActive:      true,
		},
		{
			FullName:      "Amal Fernando",
			Email:         "amal.plumb@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			Role:          models.RoleTechnician,
			SkillCategory: "Plumbing",
			IsActive:      true,
		},
		{
			FullName:      "Engineering Student",
			Email:         "student@fixflow.edu",
			PasswordHash:  hashPassword("Student@123"),
			Role:          models.RoleStudent,
			SkillCategory: "",
			IsActive:      true,
		},
	}

	for _, u := range users {
		db.Create(&u)
	}

	// 3. Create Campus Hierarchy: Buildings -> Floors -> Rooms
	engBuilding := models.Building{Name: "Faculty of Engineering", Code: "ENG"}
	mgtBuilding := models.Building{Name: "Faculty of Management", Code: "MGT"}
	db.Create(&engBuilding)
	db.Create(&mgtBuilding)

	// Engineering Floors
	engFloor1 := models.Floor{BuildingID: engBuilding.ID, FloorNumber: 1}
	engFloor2 := models.Floor{BuildingID: engBuilding.ID, FloorNumber: 2}
	db.Create(&engFloor1)
	db.Create(&engFloor2)

	// Rooms
	roomE101 := models.Room{FloorID: engFloor1.ID, RoomNumber: "E101", RoomType: "Lecture Theater"}
	roomE102 := models.Room{FloorID: engFloor1.ID, RoomNumber: "E102", RoomType: "Computer Lab"}
	roomE204 := models.Room{FloorID: engFloor2.ID, RoomNumber: "E204", RoomType: "Thermodynamics Lab"}
	db.Create(&roomE101)
	db.Create(&roomE102)
	db.Create(&roomE204)

	// 4. Create Trackable Assets (with Asset Tags for QR codes)
	assets := []models.Asset{
		{
			AssetTag: "AC-ENG-E204-01",
			Name:     "Daikin Inverter AC 24000 BTU",
			Category: "HVAC",
			RoomID:   roomE204.ID,
			Status:   "OPERATIONAL",
		},
		{
			AssetTag: "PROJ-ENG-E101-01",
			Name:     "Epson 4K Ceiling Projector",
			Category: "IT",
			RoomID:   roomE101.ID,
			Status:   "OPERATIONAL",
		},
		{
			AssetTag: "DIST-ENG-E102-01",
			Name:     "3-Phase Power Distribution Panel",
			Category: "Electrical",
			RoomID:   roomE102.ID,
			Status:   "OPERATIONAL",
		},
	}

	for _, a := range assets {
		db.Create(&a)
	}

	log.Println(" Campus infrastructure and test accounts seeded successfully!")
}