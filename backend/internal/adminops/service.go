package adminops

import (
	"fmt"
	"sync"
)

type Service interface {
	GetDashboard() DashboardData
	ToggleTaskCompletion(taskID string) (*DailyTask, error)
	MarkInvoicePaid(invoiceID string) (*ClientInvoice, error)
}

type service struct {
	mu       sync.RWMutex
	tasks    []DailyTask
	rundowns []RundownItem
	invoices []ClientInvoice
}

func NewService() Service {
	tasks, rundowns, invoices := buildInitialAdminOpsData()
	return &service{
		tasks:    tasks,
		rundowns: rundowns,
		invoices: invoices,
	}
}

func (s *service) GetDashboard() DashboardData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return DashboardData{
		CoordinatorName: "Dian Paramita (Admin Operasional)",
		RoleNotice:      "Akses Create, Read, Update aktif. Otoritas Hapus (Delete) dan Laporan Laba Bersih dikunci.",
		DailyTasks:      s.tasks,
		ActiveRundowns:  s.rundowns,
		ClientInvoices:  s.invoices,
	}
}

func (s *service) ToggleTaskCompletion(taskID string) (*DailyTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, t := range s.tasks {
		if t.ID == taskID {
			s.tasks[i].Completed = !s.tasks[i].Completed
			return &s.tasks[i], nil
		}
	}
	return nil, fmt.Errorf("tugas operasional dengan ID '%s' tidak ditemukan", taskID)
}

func (s *service) MarkInvoicePaid(invoiceID string) (*ClientInvoice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, inv := range s.invoices {
		if inv.ID == invoiceID {
			s.invoices[i].Status = "Lunas"
			return &s.invoices[i], nil
		}
	}
	return nil, fmt.Errorf("invoice klien dengan ID '%s' tidak ditemukan", invoiceID)
}
