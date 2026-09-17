package database

import (
	"log"

	"fixflow-backend/internal/config"
	"fixflow-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *config.Config) (*gorm.DB, error) {
	var gormLogger logger.Interface = logger.Default.LogMode(logger.Warn)
	if cfg.AppEnv == "development" {
		gormLogger = logger.Default.LogMode(logger.Info)
	}

	db, err := gorm.Open(postgres.Open(cfg.GetDSN()), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, err
	}

	log.Println("🔌 Successfully connected to PostgreSQL database")

	// Automatically run database migrations
	err = db.AutoMigrate(
		&models.User{},
		&models.Building{},
		&models.Floor{},
		&models.Room{},
		&models.Asset{},
		&models.MaintenanceRequest{},
		&models.WorkOrder{},
		&models.AuditLog{},
		&models.SMSNotification{},
	)
	if err != nil {
		log.Fatalf("❌ Failed to run database auto-migrations: %v", err)
	}

	log.Println(" Database schema auto-migrated successfully")

	// Seed initial data
	Seed(db)

	DB = db
	return db, nil
}
