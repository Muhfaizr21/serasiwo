package superadmin

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

type Service interface {
	GetOverview() OverviewData
	GetMasterEvents() []MasterEvent
	ForceOverrideEvent(eventID string, req OverrideEventRequest) (*MasterEvent, error)
	GetClients() []ClientRecord
	DeleteClient(clientID string) error
	GetVendors() []VendorPartner
	GetAuditLogs() []AuditLog
}

type service struct {
	mu       sync.RWMutex
	overview OverviewData
	events   []MasterEvent
	clients  []ClientRecord
	vendors  []VendorPartner
	logs     []AuditLog
}

func NewService() Service {
	overview, events, clients, vendors, logs := buildInitialSuperAdminData()
	return &service{
		overview: overview,
		events:   events,
		clients:  clients,
		vendors:  vendors,
		logs:     logs,
	}
}

func (s *service) GetOverview() OverviewData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.overview
}

func (s *service) GetMasterEvents() []MasterEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.events
}

func (s *service) ForceOverrideEvent(eventID string, req OverrideEventRequest) (*MasterEvent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.NewDate == "" {
		return nil, errors.New("tanggal baru wajib diisi untuk melakukan override")
	}

	for i, ev := range s.events {
		if ev.ID == eventID {
			s.events[i].Date = req.NewDate
			s.events[i].CollisionWarning = false
			s.events[i].CollisionNote = "Jadwal telah di-override oleh Super Admin: " + req.Reason

			newLog := AuditLog{
				ID:        fmt.Sprintf("log-%d", time.Now().UnixNano()),
				Timestamp: time.Now().Format("2006-01-02 15:04:05"),
				Actor:     "Baskoro Adiwijaya (Super Admin)",
				Action:    "Force Override Jadwal Master",
				Target:    ev.Title,
				Note:      req.Reason,
			}
			s.logs = append([]AuditLog{newLog}, s.logs...)
			return &s.events[i], nil
		}
	}
	return nil, fmt.Errorf("acara dengan ID '%s' tidak ditemukan", eventID)
}

func (s *service) GetClients() []ClientRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.clients
}

func (s *service) DeleteClient(clientID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, c := range s.clients {
		if c.ID == clientID {
			s.clients = append(s.clients[:i], s.clients[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("klien dengan ID '%s' tidak ditemukan", clientID)
}

func (s *service) GetVendors() []VendorPartner {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.vendors
}

func (s *service) GetAuditLogs() []AuditLog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.logs
}
