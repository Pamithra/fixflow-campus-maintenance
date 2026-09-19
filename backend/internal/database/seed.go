package database

import (
	"log"

	"fixflow-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	// Check if IT Faculty data is already seeded
	var itBuildingCount int64
	db.Model(&models.Building{}).Where("code IN (?, ?)", "IT-OLD", "IT-NEW").Count(&itBuildingCount)
	if itBuildingCount >= 2 {
		log.Println("🌱 IT Faculty infrastructure already seeded, skipping.")
		return
	}

	log.Println("🌱 Seeding IT Faculty campus infrastructure and test accounts...")

	// Helper for password hashing
	hashPassword := func(pwd string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		return string(h)
	}

	// 1. Seed Initial Users (Admin, Staff, Technicians, Student)
	users := []models.User{
		{
			FullName:      "Campus Maintenance Admin",
			Email:         "admin@fixflow.edu",
			PasswordHash:  hashPassword("Admin@123"),
			PhoneNumber:   "+94771112233",
			Role:          models.RoleAdmin,
			SkillCategory: "",
			IsActive:      true,
		},
		{
			FullName:      "Dr. Anura Bandara (Faculty Staff)",
			Email:         "staff@fixflow.edu",
			PasswordHash:  hashPassword("Staff@123"),
			PhoneNumber:   "+94712223344",
			Role:          models.RoleStaff,
			SkillCategory: "",
			IsActive:      true,
		},
		{
			FullName:      "Kasun Perera",
			Email:         "kasun.general@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			PhoneNumber:   "+94763334455",
			Role:          models.RoleTechnician,
			SkillCategory: "General",
			IsActive:      true,
		},
		{
			FullName:      "Nimal Silva",
			Email:         "nimal.elec@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			PhoneNumber:   "+94774445566",
			Role:          models.RoleTechnician,
			SkillCategory: "Electrical",
			IsActive:      true,
		},
		{
			FullName:      "Amal Fernando",
			Email:         "amal.plumb@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			PhoneNumber:   "+94755556677",
			Role:          models.RoleTechnician,
			SkillCategory: "Plumbing",
			IsActive:      true,
		},
		{
			FullName:      "Saman Kumara",
			Email:         "saman.it@fixflow.edu",
			PasswordHash:  hashPassword("Tech@123"),
			PhoneNumber:   "+94706667788",
			Role:          models.RoleTechnician,
			SkillCategory: "IT",
			IsActive:      true,
		},
		{
			FullName:      "Praveen Jayasinghe (Student)",
			Email:         "student@fixflow.edu",
			PasswordHash:  hashPassword("Student@123"),
			PhoneNumber:   "+94784445566",
			Role:          models.RoleStudent,
			SkillCategory: "",
			IsActive:      true,
		},
	}

	for _, u := range users {
		var existing models.User
		if err := db.Where("email = ?", u.Email).First(&existing).Error; err != nil {
			db.Create(&u)
		} else {
			existing.PhoneNumber = u.PhoneNumber
			existing.Role = u.Role
			db.Save(&existing)
		}
	}

	// 2. Create IT Faculty Buildings (Old Building & New Building)
	oldBuilding := models.Building{Name: "Old Building", Code: "IT-OLD"}
	newBuilding := models.Building{Name: "New Building", Code: "IT-NEW"}
	db.Where(models.Building{Code: "IT-OLD"}).FirstOrCreate(&oldBuilding)
	db.Where(models.Building{Code: "IT-NEW"}).FirstOrCreate(&newBuilding)

	// 3. Create Floors 0 to 4 (5 Floors) for both buildings
	oldFloors := make(map[int]models.Floor)
	newFloors := make(map[int]models.Floor)

	for floorNum := 0; floorNum <= 4; floorNum++ {
		fOld := models.Floor{BuildingID: oldBuilding.ID, FloorNumber: floorNum}
		db.Where("building_id = ? AND floor_number = ?", oldBuilding.ID, floorNum).FirstOrCreate(&fOld)
		oldFloors[floorNum] = fOld

		fNew := models.Floor{BuildingID: newBuilding.ID, FloorNumber: floorNum}
		db.Where("building_id = ? AND floor_number = ?", newBuilding.ID, floorNum).FirstOrCreate(&fNew)
		newFloors[floorNum] = fNew
	}

	// Helper to add room
	createRoom := func(floorID uint, roomNumber string, roomType string) models.Room {
		r := models.Room{FloorID: floorID, RoomNumber: roomNumber, RoomType: roomType}
		db.Where("floor_id = ? AND room_number = ?", floorID, roomNumber).FirstOrCreate(&r)
		return r
	}

	// === GROUND FLOOR (FLOOR 0) ===
	// Old Building:
	createRoom(oldFloors[0].ID, "Workshop", "Workshop")
	createRoom(oldFloors[0].ID, "Staff Room (Ground Floor)", "Staff Room")
	// New Building:
	roomERP := createRoom(newFloors[0].ID, "ERP Laboratory", "Laboratory")
	createRoom(newFloors[0].ID, "Data Sciences Laboratory", "Laboratory")
	room0LH1 := createRoom(newFloors[0].ID, "0LH01A", "Lecture Hall")
	createRoom(newFloors[0].ID, "0LH02A", "Lecture Hall")
	createRoom(newFloors[0].ID, "Staff Room (Phase 2 Ground)", "Staff Room")

	// === FIRST FLOOR (FLOOR 1) ===
	// Old Building:
	roomLab1 := createRoom(oldFloors[1].ID, "Laboratory-01", "Laboratory")
	createRoom(oldFloors[1].ID, "1LH01A", "Lecture Hall")
	createRoom(oldFloors[1].ID, "1LH02A", "Lecture Hall")
	createRoom(oldFloors[1].ID, "Staff Room (1st Floor)", "Staff Room")
	// New Building:
	createRoom(newFloors[1].ID, "Laboratory - 07", "Laboratory")
	createRoom(newFloors[1].ID, "1LH03A", "Lecture Hall")
	createRoom(newFloors[1].ID, "Staff Room (Phase 2 1st Floor)", "Staff Room")

	// === SECOND FLOOR (FLOOR 2) ===
	// Old Building:
	createRoom(oldFloors[2].ID, "Laboratory- 02", "Laboratory")
	createRoom(oldFloors[2].ID, "Multimedia Research Lab", "Laboratory")
	createRoom(oldFloors[2].ID, "2LH01A", "Lecture Hall")
	createRoom(oldFloors[2].ID, "Audio Visual Unit", "Specialized Unit")
	createRoom(oldFloors[2].ID, "Staff Room (2nd Floor)", "Staff Room")
	// New Building:
	createRoom(newFloors[2].ID, "Laboratory- 05", "Laboratory")
	createRoom(newFloors[2].ID, "HPC Laboratory", "Laboratory")
	createRoom(newFloors[2].ID, "2LH02A", "Lecture Hall")
	createRoom(newFloors[2].ID, "2LH03A", "Lecture Hall")
	createRoom(newFloors[2].ID, "Staff Room (Phase 2 2nd Floor)", "Staff Room")

	// === THIRD FLOOR (FLOOR 3) ===
	// Old Building:
	createRoom(oldFloors[3].ID, "Laboratory- 03", "Laboratory")
	createRoom(oldFloors[3].ID, "Laboratory - 04", "Laboratory")
	createRoom(oldFloors[3].ID, "Multimedia Development Lab", "Laboratory")
	createRoom(oldFloors[3].ID, "3LH01A", "Lecture Hall")
	createRoom(oldFloors[3].ID, "3LH02A", "Lecture Hall")
	createRoom(oldFloors[3].ID, "Staff Room (3rd Floor)", "Staff Room")
	// New Building:
	createRoom(newFloors[3].ID, "Laboratory - 08", "Laboratory")
	createRoom(newFloors[3].ID, "Staff Room (Phase 2 3rd Floor)", "Staff Room")

	// === FOURTH FLOOR (FLOOR 4) ===
	// Old Building:
	roomNetLab := createRoom(oldFloors[4].ID, "Network Laboratory", "Laboratory")
	createRoom(oldFloors[4].ID, "Laboratory 6", "Laboratory")
	createRoom(oldFloors[4].ID, "Hardware Lab", "Laboratory")
	createRoom(oldFloors[4].ID, "Embedded Systems Lab", "Laboratory")
	createRoom(oldFloors[4].ID, "4LH01A (Auditorium)", "Auditorium")
	createRoom(oldFloors[4].ID, "Staff Room (4th Floor)", "Staff Room")
	// New Building:
	createRoom(newFloors[4].ID, "Electronic & Embedded Systems Lab", "Laboratory")
	roomAuditorium2 := createRoom(newFloors[4].ID, "4LH02A (Auditorium)", "Auditorium")
	createRoom(newFloors[4].ID, "Staff Room (Phase 2 4th Floor)", "Staff Room")

	// 4. Create Trackable Assets with QR Asset Tags
	assets := []models.Asset{
		{
			AssetTag: "AC-IT-NEW-ERPLAB-01",
			Name:     "Daikin Inverter AC 24000 BTU",
			Category: "General",
			RoomID:   roomERP.ID,
			Status:   "OPERATIONAL",
		},
		{
			AssetTag: "PROJ-IT-NEW-0LH01A-01",
			Name:     "Epson 4K Ceiling Projector",
			Category: "IT",
			RoomID:   room0LH1.ID,
			Status:   "OPERATIONAL",
		},
		{
			AssetTag: "AC-IT-OLD-LAB1-01",
			Name:     "Panasonic 18000 BTU Air Conditioner",
			Category: "General",
			RoomID:   roomLab1.ID,
			Status:   "OPERATIONAL",
		},
		{
			AssetTag: "SW-IT-OLD-NETLAB-01",
			Name:     "Cisco Catalyst 48-Port Switch",
			Category: "Network",
			RoomID:   roomNetLab.ID,
			Status:   "OPERATIONAL",
		},
		{
			AssetTag: "AC-IT-NEW-4LH02A-01",
			Name:     "Auditorium Central AC Unit 01",
			Category: "General",
			RoomID:   roomAuditorium2.ID,
			Status:   "OPERATIONAL",
		},
	}

	for _, a := range assets {
		var existing models.Asset
		if err := db.Where("asset_tag = ?", a.AssetTag).First(&existing).Error; err != nil {
			db.Create(&a)
		}
	}

	log.Println("✅ IT Faculty infrastructure and accounts seeded successfully!")
}
