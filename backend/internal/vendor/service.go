package vendor

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

type Service interface {
	GetDashboard(vendorID string) (*VendorDashboardData, error)
	GetCalendar(vendorID string) ([]DateBlock, []VendorEventSummary, error)
	ToggleDateBlock(vendorID string, req DateBlockRequest) (*DateBlock, error)
	GetJobs(vendorID string, status string) ([]VendorJob, error)
	UpdateJobAction(vendorID string, jobID string, action string, reason string) (*VendorJob, error)
	GetReadiness(vendorID string) ([]JobReadiness, error)
	UpdateReadinessStep(vendorID string, jobID string, stepID string, completed bool, proofNote string) (*JobReadiness, error)
	GetPayouts(vendorID string) ([]VendorPayout, error)
	CreatePayout(vendorID string, req CreatePayoutRequest) (*VendorPayout, error)
}

type service struct {
	mu           sync.RWMutex
	profile      VendorProfile
	events       []VendorEventSummary
	jobs         []VendorJob
	dateBlocks   []DateBlock
	readinessMap map[string]*JobReadiness
	payouts      []VendorPayout
}

func NewService() Service {
	profile, events, jobs, dateBlocks, readinessMap, payouts := buildInitialVendorData(time.Now())
	return &service{
		profile:      profile,
		events:       events,
		jobs:         jobs,
		dateBlocks:   dateBlocks,
		readinessMap: readinessMap,
		payouts:      payouts,
	}
}

func (s *service) GetDashboard(vendorID string) (*VendorDashboardData, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var newBookingAlerts []VendorJob
	for _, j := range s.jobs {
		if j.Status == "menunggu" {
			newBookingAlerts = append(newBookingAlerts, j)
		}
	}

	var totalPortions int
	for _, ev := range s.events {
		totalPortions += ev.PortionsOrUnits
	}

	var pendingPayout float64
	var settledPayout float64
	for _, p := range s.payouts {
		if p.Status == "tertunda" || p.Status == "diproses" {
			pendingPayout += p.Amount
		} else if p.Status == "dicairkan" {
			settledPayout += p.Amount
		}
	}

	var activeReadiness []JobReadiness
	for _, r := range s.readinessMap {
		activeReadiness = append(activeReadiness, *r)
	}

	metrics := VendorDashboardMetrics{
		WeeklyEventsCount:   len(s.events),
		NewBookingAlerts:    len(newBookingAlerts),
		TotalPortionsActive: totalPortions,
		PendingPayoutAmount: pendingPayout,
		SettledPayoutAmount: settledPayout,
		ReadinessRate:       88,
	}

	return &VendorDashboardData{
		VendorProfile:    s.profile,
		Metrics:          metrics,
		EventsThisWeek:   s.events,
		NewBookingAlerts: newBookingAlerts,
		RecentPayouts:    s.payouts,
		ActiveReadiness:  activeReadiness,
		LastSyncedAt:     time.Now(),
	}, nil
}

func (s *service) GetCalendar(vendorID string) ([]DateBlock, []VendorEventSummary, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.dateBlocks, s.events, nil
}

func (s *service) ToggleDateBlock(vendorID string, req DateBlockRequest) (*DateBlock, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.Date == "" {
		return nil, errors.New("tanggal wajib diisi")
	}

	for i, b := range s.dateBlocks {
		if b.Date == req.Date {
			if b.IsWOEvent {
				return nil, errors.New("tidak dapat mengubah tanggal yang telah memiliki pesanan resmi SerasiWO")
			}
			s.dateBlocks[i].IsBlocked = req.IsBlocked
			if req.Reason != "" {
				s.dateBlocks[i].Reason = req.Reason
			}
			return &s.dateBlocks[i], nil
		}
	}

	newBlock := DateBlock{
		ID:        fmt.Sprintf("blk-%d", time.Now().UnixNano()),
		Date:      req.Date,
		IsBlocked: req.IsBlocked,
		Reason:    req.Reason,
		IsWOEvent: false,
		CreatedAt: time.Now(),
	}
	s.dateBlocks = append(s.dateBlocks, newBlock)
	return &newBlock, nil
}

func (s *service) GetJobs(vendorID string, status string) ([]VendorJob, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if status == "" || status == "semua" {
		return s.jobs, nil
	}

	var filtered []VendorJob
	for _, j := range s.jobs {
		if j.Status == status {
			filtered = append(filtered, j)
		}
	}
	return filtered, nil
}

func (s *service) UpdateJobAction(vendorID string, jobID string, action string, reason string) (*VendorJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for i, j := range s.jobs {
		if j.ID == jobID {
			if action == "terima" {
				s.jobs[i].Status = "diterima"
				s.jobs[i].RespondedAt = &now
				s.jobs[i].DecisionNote = "Pesanan telah dikonfirmasi dan disetujui oleh mitra."

				if _, exists := s.readinessMap[jobID]; !exists {
					s.readinessMap[jobID] = &JobReadiness{
						JobID:           jobID,
						WeddingTitle:    j.WeddingTitle,
						EventDate:       j.EventDate,
						TimeSlot:        j.TimeSlot,
						Venue:           j.Venue,
						Portions:        j.Portions,
						UnitLabel:       j.PortionUnitLabel,
						CurrentStatus:   "Bahan Mentah Siap",
						ProgressPercent: 25,
						LastUpdated:     now,
						Steps: []ReadinessStep{
							{
								StepID:      "step-1",
								Title:       "Bahan Mentah Siap",
								Description: "Bahan pangan segar, bumbu marinasi, dan bahan basah selesai sortir & pengecekan kualitas.",
								Completed:   true,
								CompletedAt: &now,
								UpdatedBy:   "Hendra Kusuma",
								ProofNote:   "Pesanan diterima, persiapan bahan dimulai.",
							},
							{
								StepID:      "step-2",
								Title:       "Loading & Pengangkutan",
								Description: "Peralatan chafing dish, warmers, dan kontainer termal dimuat ke armada.",
								Completed:   false,
							},
							{
								StepID:      "step-3",
								Title:       "Standby di Venue",
								Description: "Tim tiba di lokasi, penataan buffet dan pemanasan hidangan.",
								Completed:   false,
							},
							{
								StepID:      "step-4",
								Title:       "Selesai & Serah Terima",
								Description: "Layanan selesai dan serah terima form checklist kru WO.",
								Completed:   false,
							},
						},
					}
				}
				return &s.jobs[i], nil
			} else if action == "tolak" {
				s.jobs[i].Status = "ditolak"
				s.jobs[i].RespondedAt = &now
				s.jobs[i].DecisionNote = reason
				return &s.jobs[i], nil
			}
			return nil, fmt.Errorf("aksi '%s' tidak valid. Pilih 'terima' atau 'tolak'", action)
		}
	}
	return nil, fmt.Errorf("pekerjaan dengan ID '%s' tidak ditemukan", jobID)
}

func (s *service) GetReadiness(vendorID string) ([]JobReadiness, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []JobReadiness
	for _, r := range s.readinessMap {
		result = append(result, *r)
	}
	return result, nil
}

func (s *service) UpdateReadinessStep(vendorID string, jobID string, stepID string, completed bool, proofNote string) (*JobReadiness, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	readiness, exists := s.readinessMap[jobID]
	if !exists {
		return nil, fmt.Errorf("tracker kesiapan untuk job '%s' tidak ditemukan", jobID)
	}

	now := time.Now()
	completedCount := 0
	for i, step := range readiness.Steps {
		if step.StepID == stepID {
			readiness.Steps[i].Completed = completed
			if completed {
				readiness.Steps[i].CompletedAt = &now
				readiness.Steps[i].UpdatedBy = "Hendra Kusuma (Vendor)"
				if proofNote != "" {
					readiness.Steps[i].ProofNote = proofNote
				}
			} else {
				readiness.Steps[i].CompletedAt = nil
			}
		}
		if readiness.Steps[i].Completed {
			completedCount++
		}
	}

	readiness.ProgressPercent = (completedCount * 100) / len(readiness.Steps)
	readiness.LastUpdated = now

	switch completedCount {
	case 0:
		readiness.CurrentStatus = "Menunggu Persiapan"
	case 1:
		readiness.CurrentStatus = "Bahan Mentah Siap"
	case 2:
		readiness.CurrentStatus = "Loading & Pengangkutan"
	case 3:
		readiness.CurrentStatus = "Standby di Venue"
	case 4:
		readiness.CurrentStatus = "Selesai & Serah Terima"
	}

	return readiness, nil
}

func (s *service) GetPayouts(vendorID string) ([]VendorPayout, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.payouts, nil
}

func (s *service) CreatePayout(vendorID string, req CreatePayoutRequest) (*VendorPayout, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.InvoiceNumber == "" || req.Amount <= 0 {
		return nil, errors.New("nomor invoice dan nominal tagihan wajib diisi")
	}

	newPayout := VendorPayout{
		ID:            fmt.Sprintf("pay-%d", time.Now().UnixNano()),
		InvoiceNumber: req.InvoiceNumber,
		JobID:         req.JobID,
		WeddingTitle:  "Tagihan Layanan Katering SerasiWO",
		EventDate:     time.Now().Format("2006-01-02"),
		Amount:        req.Amount,
		BankName:      req.BankName,
		AccountHolder: req.AccountHolder,
		AccountNumber: req.AccountNumber,
		InvoiceDocURL: req.InvoiceDocURL,
		Status:        "tertunda",
		StatusLabel:   "Tertunda (Menunggu Verifikasi WO)",
		SubmittedAt:   time.Now(),
		Notes:         req.Notes,
	}

	s.payouts = append([]VendorPayout{newPayout}, s.payouts...)
	return &newPayout, nil
}
