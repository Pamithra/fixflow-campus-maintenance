package websocket

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow configured frontend origins
	},
}

type EventMessage struct {
	Type    string      `json:"type"` // e.g. "NEW_INCIDENT", "TICKET_ASSIGNED", "TICKET_COMPLETED"
	Message string      `json:"message"`
	Payload interface{} `json:"payload,omitempty"`
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan EventMessage
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

var GlobalHub = &Hub{
	clients:    make(map[*websocket.Conn]bool),
	broadcast:  make(chan EventMessage),
	register:   make(chan *websocket.Conn),
	unregister: make(chan *websocket.Conn),
}

func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.register:
			h.mu.Lock()
			h.clients[conn] = true
			h.mu.Unlock()
			log.Printf("🔌 WebSocket Client connected. Total active: %d", len(h.clients))

		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
				log.Printf("🔌 WebSocket Client disconnected. Total active: %d", len(h.clients))
			}
			h.mu.Unlock()

		case event := <-h.broadcast:
			h.mu.Lock()
			for conn := range h.clients {
				err := conn.WriteJSON(event)
				if err != nil {
					log.Printf("WebSocket write error: %v", err)
					conn.Close()
					delete(h.clients, conn)
				}
			}
			h.mu.Unlock()
		}
	}
}

// Broadcast dispatches a real-time event to all connected browsers
func Broadcast(eventType string, message string, payload interface{}) {
	GlobalHub.broadcast <- EventMessage{
		Type:    eventType,
		Message: message,
		Payload: payload,
	}
}

// HandleWS upgrades HTTP to a persistent WebSocket connection
func HandleWS(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}

	GlobalHub.register <- conn

	// Keep connection alive and clean up on disconnect
	go func() {
		defer func() {
			GlobalHub.unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}