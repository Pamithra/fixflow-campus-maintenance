package services

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"fixflow-backend/internal/database"
	"fixflow-backend/internal/models"
	"fixflow-backend/internal/websocket"
)

// dispatchTwilio sends a real SMS message via Twilio REST API
func dispatchTwilio(sid, token, from, to, message string) error {
	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", sid)

	v := url.Values{}
	v.Set("To", to)
	v.Set("From", from)
	v.Set("Body", message)

	req, err := http.NewRequest("POST", endpoint, strings.NewReader(v.Encode()))
	if err != nil {
		return err
	}
	req.SetBasicAuth(sid, token)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Twilio error (status %d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// dispatchNotifyLK sends a real SMS message via Notify.lk (Sri Lanka SMS Gateway)
func dispatchNotifyLK(userId, apiKey, senderId, to, message string) error {
	endpoint := "https://app.notify.lk/api/v1/send"

	v := url.Values{}
	v.Set("user_id", userId)
	v.Set("api_key", apiKey)
	v.Set("message", message)
	v.Set("to", to)
	if senderId != "" {
		v.Set("sender_id", senderId)
	} else {
		v.Set("sender_id", "NotifyDEMO")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.PostForm(endpoint, v)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Notify.lk error (status %d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// SendSMS dispatches a phone notification, stores it in the database, and alerts real-time clients
func SendSMS(userID uint, phone string, recipientName string, message string, msgType string, ticketNumber string) (*models.SMSNotification, error) {
	if phone == "" {
		phone = "+94 77 000 0000"
	}

	notification := models.SMSNotification{
		UserID:         userID,
		RecipientPhone: phone,
		RecipientName:  recipientName,
		Message:        message,
		Type:           msgType,
		TicketNumber:   ticketNumber,
		Delivered:      true,
	}

	if err := database.DB.Create(&notification).Error; err != nil {
		log.Printf("❌ Failed to save SMS notification: %v", err)
		return nil, err
	}

	// 1. Check for real SMS gateway configurations
	twilioSID := os.Getenv("TWILIO_ACCOUNT_SID")
	twilioToken := os.Getenv("TWILIO_AUTH_TOKEN")
	twilioFrom := os.Getenv("TWILIO_PHONE_NUMBER")

	notifyUserId := os.Getenv("NOTIFYLK_USER_ID")
	notifyApiKey := os.Getenv("NOTIFYLK_API_KEY")
	notifySenderId := os.Getenv("NOTIFYLK_SENDER_ID")

	var dispatchErr error

	if twilioSID != "" && twilioToken != "" && twilioFrom != "" {
		log.Printf("📡 Dispatching live SMS via Twilio to %s...", phone)
		dispatchErr = dispatchTwilio(twilioSID, twilioToken, twilioFrom, phone, message)
		if dispatchErr != nil {
			log.Printf("⚠️ Twilio dispatch failed: %v", dispatchErr)
		} else {
			log.Printf("✅ Twilio SMS successfully delivered to %s", phone)
		}
	} else if notifyUserId != "" && notifyApiKey != "" {
		log.Printf("📡 Dispatching live SMS via Notify.lk to %s...", phone)
		dispatchErr = dispatchNotifyLK(notifyUserId, notifyApiKey, notifySenderId, phone, message)
		if dispatchErr != nil {
			log.Printf("⚠️ Notify.lk dispatch failed: %v", dispatchErr)
		} else {
			log.Printf("✅ Notify.lk SMS successfully delivered to %s", phone)
		}
	} else {
		// High-visibility terminal output for simulated SMS gateway
		log.Printf("=================================================================")
		log.Printf("📱 [SIMULATED SMS GATEWAY] To: %s (%s)", phone, recipientName)
		log.Printf("📝 Message: %s", message)
		log.Printf("💡 To deliver live SMS to physical phones, configure TWILIO_* or NOTIFYLK_* in backend/.env")
		log.Printf("=================================================================")
	}

	// Broadcast via WebSocket so user sees the in-app notification instantly
	websocket.Broadcast(
		"SMS_NOTIFICATION",
		fmt.Sprintf("📱 Alert for %s: %s", phone, message),
		notification,
	)

	return &notification, nil
}
