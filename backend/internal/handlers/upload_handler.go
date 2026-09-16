package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// UploadImage handles incident photo uploads
func UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}

	// Validate file extension
	ext := filepath.Ext(file.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG, PNG, and WebP images are allowed"})
		return
	}

	// Unique filename: timestamp_filename
	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(file.Filename))
	savePath := filepath.Join("uploads", filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded image"})
		return
	}

	// Return public URL path
	fileURL := fmt.Sprintf("http://localhost:8080/uploads/%s", filename)
	c.JSON(http.StatusOK, gin.H{
		"url":      fileURL,
		"filename": filename,
	})
}