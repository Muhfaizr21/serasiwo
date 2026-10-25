package vendor

import (
	"errors"
	"fmt"
	"serasiwo-backend/config"
	"sort"
	"strings"
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
	UpdatePayoutAction(vendorID string, payoutID string, action string, notes string) (*VendorPayout, error)
	GetLoadingSchedules(vendorID string) (map[string]VendorLoadingSchedule, error)
	UpdateLoadingSlot(vendorID string, eventID string, req LoadingSlotUpdateRequest) (*VendorLoadingSchedule, error)
	GetMenuManifests(vendorID string) (map[string]VendorMenuManifest, error)
	UpdateMenuManifest(vendorID string, eventID string, req MenuManifestUpdateRequest) (*VendorMenuManifest, error)
	GetProfile(vendorID string) (*VendorProfile, error)
	UpdateProfile(vendorID string, req VendorProfileUpdateRequest) (*VendorProfile, error)
}

type service struct {
	mu               sync.RWMutex
	sb               *config.SupabaseClient
	profile          VendorProfile
	events           []VendorEventSummary
	jobs             []VendorJob
	dateBlocks       []DateBlock
	readinessMap     map[string]*JobReadiness
	payouts          []VendorPayout
	loadingSchedules map[string]VendorLoadingSchedule
	menuManifests    map[string]VendorMenuManifest
}

func NewService(sb *config.SupabaseClient) Service {
	profile, events, jobs, dateBlocks, readinessMap, payouts := buildInitialVendorData(time.Now())
	svc := &service{
		sb:               sb,
		profile:          profile,
		events:           events,
		jobs:             jobs,
		dateBlocks:       dateBlocks,
		readinessMap:     readinessMap,
		payouts:          payouts,
		loadingSchedules: make(map[string]VendorLoadingSchedule),
		menuManifests:    make(map[string]VendorMenuManifest),
	}
	svc.loadPersistedState()
	return svc
}

func buildDefaultReadinessForJob(j VendorJob, now time.Time) *JobReadiness {
	unitLabel := j.PortionUnitLabel
	if unitLabel == "" {
		unitLabel = "Porsi"
	}
	return &JobReadiness{
		JobID:           j.ID,
		WeddingTitle:    j.WeddingTitle,
		EventDate:       j.EventDate,
		TimeSlot:        j.TimeSlot,
		Venue:           j.Venue,
		Portions:        j.Portions,
		UnitLabel:       unitLabel,
		CurrentStatus:   "Menunggu Persiapan",
		ProgressPercent: 0,
		LastUpdated:     now,
		Steps: []ReadinessStep{
			{
				StepID:      "step-1",
				Title:       "Bahan Mentah Siap",
				Description: "Bahan pangan segar, bumbu marinasi, dan bahan basah selesai sortir serta pengecekan kualitas.",
				Completed:   false,
			},
			{
				StepID:      "step-2",
				Title:       "Loading & Pengangkutan",
				Description: "Peralatan chafing dish, warmers, dan kontainer makanan termal telah dimuat ke armada mobil.",
				Completed:   false,
			},
			{
				StepID:      "step-3",
				Title:       "Standby di Venue",
				Description: "Tim katering tiba di venue, meja buffet terpasang, pemanas dinyalakan, dan plating siap.",
				Completed:   false,
			},
			{
				StepID:      "step-4",
				Title:       "Selesai & Serah Terima",
				Description: "Layanan jamuan paripurna selesai, buffet dibersihkan, dan serah terima checklist dengan kru WO.",
				Completed:   false,
			},
		},
	}
}

func (s *service) GetDashboard(vendorID string) (*VendorDashboardData, error) {
	s.mu.Lock()
	if prof, ok := s.fetchProfileFromSupabase(vendorID); ok && prof != nil {
		s.profile = *prof
	}
	if jobs, ok := s.fetchJobsFromSupabase(vendorID); ok && len(jobs) > 0 {
		s.jobs = jobs
	}
	if evs, ok := s.fetchEventsFromSupabase(vendorID); ok && len(evs) > 0 {
		s.events = evs
	}
	if blocks, ok := s.fetchDateBlocksFromSupabase(vendorID); ok && len(blocks) > 0 {
		s.dateBlocks = blocks
	}
	if rList, ok := s.fetchReadinessFromSupabase(vendorID); ok && len(rList) > 0 {
		s.readinessMap = make(map[string]*JobReadiness, len(rList))
		for i := range rList {
			item := rList[i]
			s.readinessMap[item.JobID] = &item
		}
	}
	if payouts, ok := s.fetchPayoutsFromSupabase(vendorID); ok && len(payouts) > 0 {
		s.payouts = payouts
	}
	if scheds, ok := s.fetchLoadingSchedulesFromSupabase(vendorID); ok && len(scheds) > 0 {
		s.loadingSchedules = scheds
	}
	if manifests, ok := s.fetchMenuManifestsFromSupabase(vendorID); ok && len(manifests) > 0 {
		s.menuManifests = manifests
	}
	defer s.mu.Unlock()

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
	totalProgress := 0
	for _, r := range s.readinessMap {
		if r != nil {
			activeReadiness = append(activeReadiness, *r)
			totalProgress += r.ProgressPercent
		}
	}
	sort.Slice(activeReadiness, func(i, j int) bool {
		return activeReadiness[i].EventDate < activeReadiness[j].EventDate
	})

	readinessRate := 0
	if len(activeReadiness) > 0 {
		readinessRate = totalProgress / len(activeReadiness)
	}

	metrics := VendorDashboardMetrics{
		WeeklyEventsCount:   len(s.events),
		NewBookingAlerts:    len(newBookingAlerts),
		TotalPortionsActive: totalPortions,
		PendingPayoutAmount: pendingPayout,
		SettledPayoutAmount: settledPayout,
		ReadinessRate:       readinessRate,
	}

	return &VendorDashboardData{
		VendorProfile:    s.profile,
		Metrics:          metrics,
		EventsThisWeek:   s.events,
		NewBookingAlerts: newBookingAlerts,
		Jobs:             s.jobs,
		DateBlocks:       s.dateBlocks,
		RecentPayouts:    s.payouts,
		ActiveReadiness:  activeReadiness,
		LoadingSchedules: s.loadingSchedules,
		MenuManifests:    s.menuManifests,
		LastSyncedAt:     time.Now(),
	}, nil
}

func (s *service) GetCalendar(vendorID string) ([]DateBlock, []VendorEventSummary, error) {
	s.mu.Lock()
	if blocks, ok := s.fetchDateBlocksFromSupabase(vendorID); ok && len(blocks) > 0 {
		s.dateBlocks = blocks
	}
	if evs, ok := s.fetchEventsFromSupabase(vendorID); ok && len(evs) > 0 {
		s.events = evs
	}

	sortedBlocks := make([]DateBlock, len(s.dateBlocks))
	copy(sortedBlocks, s.dateBlocks)
	sortedEvents := make([]VendorEventSummary, len(s.events))
	copy(sortedEvents, s.events)
	s.mu.Unlock()

	sort.Slice(sortedBlocks, func(i, j int) bool {
		return sortedBlocks[i].Date < sortedBlocks[j].Date
	})
	sort.Slice(sortedEvents, func(i, j int) bool {
		return sortedEvents[i].EventDate < sortedEvents[j].EventDate
	})

	return sortedBlocks, sortedEvents, nil
}

func (s *service) ToggleDateBlock(vendorID string, req DateBlockRequest) (*DateBlock, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cleanDate := strings.TrimSpace(req.Date)
	if cleanDate == "" {
		return nil, errors.New("tanggal wajib diisi")
	}

	if _, err := time.Parse("2006-01-02", cleanDate); err != nil {
		return nil, errors.New("format tanggal harus YYYY-MM-DD")
	}

	for _, ev := range s.events {
		if ev.EventDate == cleanDate {
			return nil, fmt.Errorf("tanggal %s sudah terkunci untuk acara resmi SerasiWO (%s)", cleanDate, ev.WeddingTitle)
		}
	}

	reason := strings.TrimSpace(req.Reason)
	if req.IsBlocked && reason == "" {
		reason = "Full booked pesanan mandiri di luar WO"
	}

	for i, b := range s.dateBlocks {
		if b.Date == cleanDate {
			if b.IsWOEvent {
				return nil, errors.New("tidak dapat mengubah tanggal yang telah memiliki pesanan resmi SerasiWO")
			}
			s.dateBlocks[i].IsBlocked = req.IsBlocked
			s.dateBlocks[i].Reason = reason
			s.upsertDateBlockToSupabase(s.dateBlocks[i])
			s.savePersistedState()
			return &s.dateBlocks[i], nil
		}
	}

	newBlock := DateBlock{
		ID:        fmt.Sprintf("blk-%d", time.Now().UnixNano()),
		Date:      cleanDate,
		IsBlocked: req.IsBlocked,
		Reason:    reason,
		IsWOEvent: false,
		CreatedAt: time.Now(),
	}
	s.dateBlocks = append(s.dateBlocks, newBlock)
	s.upsertDateBlockToSupabase(newBlock)
	s.savePersistedState()
	return &newBlock, nil
}

func (s *service) GetJobs(vendorID string, status string) ([]VendorJob, error) {
	s.mu.Lock()
	if jobs, ok := s.fetchJobsFromSupabase(vendorID); ok && len(jobs) > 0 {
		s.jobs = jobs
	}
	currentJobs := make([]VendorJob, len(s.jobs))
	copy(currentJobs, s.jobs)
	s.mu.Unlock()

	if status == "" || status == "semua" {
		return currentJobs, nil
	}

	filtered := make([]VendorJob, 0)
	for _, j := range currentJobs {
		if j.Status == status {
			filtered = append(filtered, j)
		}
	}
	return filtered, nil
}

func (s *service) UpdateJobAction(vendorID string, jobID string, action string, reason string) (*VendorJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if jobs, ok := s.fetchJobsFromSupabase(vendorID); ok && len(jobs) > 0 {
		s.jobs = jobs
	}

	cleanReason := strings.TrimSpace(reason)
	now := time.Now()

	for i, j := range s.jobs {
		if j.ID == jobID {
			if action == "terima" {
				s.jobs[i].Status = "diterima"
				s.jobs[i].RespondedAt = &now
				if cleanReason != "" {
					s.jobs[i].DecisionNote = cleanReason
				} else {
					s.jobs[i].DecisionNote = "Pesanan telah dikonfirmasi dan disetujui oleh mitra."
				}

				s.upsertJobToSupabase(s.jobs[i])

				// Sinkronisasi otomatis ke tabel vendor_events (Kalender Acara WO)
				newEvent := VendorEventSummary{
					ID:               j.EventID,
					JobID:            j.ID,
					WeddingTitle:     j.WeddingTitle,
					BrideGroom:       j.BrideGroom,
					EventDate:        j.EventDate,
					TimeSlot:         j.TimeSlot,
					Venue:            j.Venue,
					LocationCity:     "Jakarta",
					PortionsOrUnits:  j.Portions,
					PortionUnitLabel: j.PortionUnitLabel,
					ReadinessStatus:  "Bahan Mentah Siap",
					ReadinessPercent: 25,
					Note:             j.MenuOrNotes,
				}

				eventExists := false
				for idx, ev := range s.events {
					if ev.JobID == jobID || ev.ID == j.EventID {
						s.events[idx] = newEvent
						eventExists = true
						break
					}
				}
				if !eventExists {
					s.events = append(s.events, newEvent)
				}
				s.upsertEventToSupabase(newEvent)

				// Kunci otomatis tanggal pada vendor_date_blocks sebagai acara WO resmi
				woBlock := DateBlock{
					ID:        fmt.Sprintf("blk-wo-%s", j.ID),
					Date:      j.EventDate,
					IsBlocked: true,
					Reason:    fmt.Sprintf("Jadwal Acara SerasiWO: %s", j.WeddingTitle),
					IsWOEvent: true,
					EventName: fmt.Sprintf("%s (%d Porsi)", j.WeddingTitle, j.Portions),
					CreatedAt: now,
				}
				blockUpdated := false
				for bIdx, b := range s.dateBlocks {
					if b.Date == j.EventDate {
						woBlock.ID = b.ID
						s.dateBlocks[bIdx] = woBlock
						blockUpdated = true
						break
					}
				}
				if !blockUpdated {
					s.dateBlocks = append(s.dateBlocks, woBlock)
				}
				s.upsertDateBlockToSupabase(woBlock)

				if _, exists := s.readinessMap[jobID]; !exists {
					newReadiness := buildDefaultReadinessForJob(j, now)
					newReadiness.CurrentStatus = "Bahan Mentah Siap"
					newReadiness.ProgressPercent = 25
					newReadiness.Steps[0].Completed = true
					newReadiness.Steps[0].CompletedAt = &now
					newReadiness.Steps[0].UpdatedBy = "Hendra Kusuma (Vendor)"
					newReadiness.Steps[0].ProofNote = "Pesanan diterima, persiapan bahan dimulai."
					s.readinessMap[jobID] = newReadiness
				}
				s.upsertReadinessToSupabase(*s.readinessMap[jobID])
				s.savePersistedState()
				return &s.jobs[i], nil
			} else if action == "tolak" {
				if cleanReason == "" {
					return nil, errors.New("alasan penolakan wajib diisi agar tim WO dapat menugaskan vendor pengganti")
				}
				s.jobs[i].Status = "ditolak"
				s.jobs[i].RespondedAt = &now
				s.jobs[i].DecisionNote = cleanReason
				delete(s.readinessMap, jobID)
				s.upsertJobToSupabase(s.jobs[i])
				s.savePersistedState()
				return &s.jobs[i], nil
			}
			return nil, fmt.Errorf("aksi '%s' tidak valid. Pilih 'terima' atau 'tolak'", action)
		}
	}
	return nil, fmt.Errorf("pekerjaan dengan ID '%s' tidak ditemukan", jobID)
}

func (s *service) GetReadiness(vendorID string) ([]JobReadiness, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if jobs, ok := s.fetchJobsFromSupabase(vendorID); ok && len(jobs) > 0 {
		s.jobs = jobs
	}
	if rList, ok := s.fetchReadinessFromSupabase(vendorID); ok && len(rList) > 0 {
		s.readinessMap = make(map[string]*JobReadiness, len(rList))
		for i := range rList {
			item := rList[i]
			s.readinessMap[item.JobID] = &item
		}
	}

	now := time.Now()
	rejectedMap := make(map[string]bool)
	for _, j := range s.jobs {
		if j.Status == "ditolak" || j.Status == "menunggu" {
			rejectedMap[j.ID] = true
		}
		if j.Status == "diterima" {
			if _, exists := s.readinessMap[j.ID]; !exists {
				created := buildDefaultReadinessForJob(j, now)
				s.readinessMap[j.ID] = created
				s.upsertReadinessToSupabase(*created)
			}
		}
	}

	result := make([]JobReadiness, 0, len(s.readinessMap))
	for id, r := range s.readinessMap {
		if r != nil && !rejectedMap[id] {
			result = append(result, *r)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].EventDate < result[j].EventDate
	})

	return result, nil
}

func (s *service) UpdateReadinessStep(vendorID string, jobID string, stepID string, completed bool, proofNote string) (*JobReadiness, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if rList, ok := s.fetchReadinessFromSupabase(vendorID); ok && len(rList) > 0 {
		s.readinessMap = make(map[string]*JobReadiness, len(rList))
		for i := range rList {
			item := rList[i]
			s.readinessMap[item.JobID] = &item
		}
	}
	if evs, ok := s.fetchEventsFromSupabase(vendorID); ok && len(evs) > 0 {
		s.events = evs
	}

	now := time.Now()
	readiness, exists := s.readinessMap[jobID]
	if !exists {
		for _, j := range s.jobs {
			if j.ID == jobID && j.Status == "diterima" {
				readiness = buildDefaultReadinessForJob(j, now)
				s.readinessMap[jobID] = readiness
				exists = true
				break
			}
		}
		if !exists {
			return nil, fmt.Errorf("tracker kesiapan untuk pekerjaan '%s' tidak ditemukan", jobID)
		}
	}

	cleanNote := strings.TrimSpace(proofNote)
	defaultNotes := map[string]string{
		"step-1": "Bahan baku segar, daging, dan bumbu telah lulus pemeriksaan QC dapur utama.",
		"step-2": "Seluruh peralatan prasmanan, pemanas, dan kontainer makanan telah dimuat ke armada.",
		"step-3": "Tim operasional katering telah tiba di lokasi, jalur buffet dan stall siap saji.",
		"step-4": "Jamuan selesai tepat waktu, area bersih, dan berita acara serah terima ditandatangani WO.",
	}

	if stepID == "all_complete" {
		for i := range readiness.Steps {
			readiness.Steps[i].Completed = true
			if readiness.Steps[i].CompletedAt == nil {
				readiness.Steps[i].CompletedAt = &now
			}
			readiness.Steps[i].UpdatedBy = "Hendra Kusuma (Vendor)"
			if cleanNote != "" {
				readiness.Steps[i].ProofNote = cleanNote
			} else if readiness.Steps[i].ProofNote == "" {
				readiness.Steps[i].ProofNote = defaultNotes[readiness.Steps[i].StepID]
			}
		}
	} else if stepID == "reset_all" {
		for i := range readiness.Steps {
			readiness.Steps[i].Completed = false
			readiness.Steps[i].CompletedAt = nil
			readiness.Steps[i].UpdatedBy = ""
			readiness.Steps[i].ProofNote = ""
		}
	} else {
		targetIdx := -1
		for i, step := range readiness.Steps {
			if step.StepID == stepID {
				targetIdx = i
				break
			}
		}
		if targetIdx == -1 {
			return nil, fmt.Errorf("tahapan '%s' tidak valid", stepID)
		}

		if completed {
			// Validasi urutan tahapan: tahapan sebelumnya wajib selesai lebih dulu
			for prevIdx := 0; prevIdx < targetIdx; prevIdx++ {
				if !readiness.Steps[prevIdx].Completed {
					return nil, fmt.Errorf(
						"Tahapan '%s' (Langkah %d) wajib diselesaikan terlebih dahulu sebelum menandai '%s'",
						readiness.Steps[prevIdx].Title,
						prevIdx+1,
						readiness.Steps[targetIdx].Title,
					)
				}
			}

			wasAlreadyCompleted := readiness.Steps[targetIdx].Completed
			readiness.Steps[targetIdx].Completed = true
			if !wasAlreadyCompleted || readiness.Steps[targetIdx].CompletedAt == nil {
				readiness.Steps[targetIdx].CompletedAt = &now
			}
			readiness.Steps[targetIdx].UpdatedBy = "Hendra Kusuma (Vendor)"
			if cleanNote != "" {
				readiness.Steps[targetIdx].ProofNote = cleanNote
			} else if readiness.Steps[targetIdx].ProofNote == "" {
				readiness.Steps[targetIdx].ProofNote = defaultNotes[stepID]
			}
		} else {
			// Jika tahapan dibatalkan (uncheck), batalkan juga tahapan setelahnya secara berurutan
			for i := targetIdx; i < len(readiness.Steps); i++ {
				readiness.Steps[i].Completed = false
				readiness.Steps[i].CompletedAt = nil
			}
			if cleanNote != "" {
				readiness.Steps[targetIdx].ProofNote = cleanNote
			}
		}
	}

	completedCount := 0
	for _, step := range readiness.Steps {
		if step.Completed {
			completedCount++
		}
	}

	if len(readiness.Steps) > 0 {
		readiness.ProgressPercent = (completedCount * 100) / len(readiness.Steps)
	}
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
	default:
		readiness.CurrentStatus = "Selesai & Serah Terima"
	}

	s.upsertReadinessToSupabase(*readiness)

	// Sinkronkan juga status kesiapan ke tabel vendor_events (Kalender & Dashboard)
	for evIdx := range s.events {
		if s.events[evIdx].JobID == jobID {
			s.events[evIdx].ReadinessStatus = readiness.CurrentStatus
			s.events[evIdx].ReadinessPercent = readiness.ProgressPercent
			s.upsertEventToSupabase(s.events[evIdx])
			break
		}
	}

	s.savePersistedState()
	return readiness, nil
}

func (s *service) GetPayouts(vendorID string) ([]VendorPayout, error) {
	s.mu.Lock()
	if payouts, ok := s.fetchPayoutsFromSupabase(vendorID); ok && len(payouts) > 0 {
		s.payouts = payouts
	}
	result := make([]VendorPayout, len(s.payouts))
	copy(result, s.payouts)
	s.mu.Unlock()

	sort.Slice(result, func(i, j int) bool {
		return result[i].SubmittedAt.After(result[j].SubmittedAt)
	})
	return result, nil
}

func (s *service) CreatePayout(vendorID string, req CreatePayoutRequest) (*VendorPayout, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if payouts, ok := s.fetchPayoutsFromSupabase(vendorID); ok && len(payouts) > 0 {
		s.payouts = payouts
	}

	cleanInv := strings.TrimSpace(req.InvoiceNumber)
	if cleanInv == "" {
		return nil, errors.New("nomor invoice wajib diisi")
	}
	if req.Amount <= 0 {
		return nil, errors.New("nominal tagihan harus lebih besar dari Rp 0")
	}

	for _, existing := range s.payouts {
		if strings.EqualFold(strings.TrimSpace(existing.InvoiceNumber), cleanInv) {
			return nil, fmt.Errorf("nomor invoice '%s' sudah pernah diajukan. Gunakan nomor faktur yang unik", cleanInv)
		}
	}

	jobID := strings.TrimSpace(req.JobID)
	if jobID == "" {
		jobID = "job-general"
	}

	weddingTitle := strings.TrimSpace(req.WeddingTitle)
	eventDate := strings.TrimSpace(req.EventDate)

	if weddingTitle == "" || eventDate == "" {
		for _, j := range s.jobs {
			if j.ID == jobID {
				if weddingTitle == "" {
					weddingTitle = j.WeddingTitle
				}
				if eventDate == "" {
					eventDate = j.EventDate
				}
				break
			}
		}
	}
	if weddingTitle == "" {
		weddingTitle = "Tagihan Layanan Katering SerasiWO"
	}
	if eventDate == "" {
		eventDate = time.Now().Format("2006-01-02")
	}

	bankName := strings.TrimSpace(req.BankName)
	if bankName == "" {
		bankName = "Bank Central Asia (BCA)"
	}
	accountHolder := strings.TrimSpace(req.AccountHolder)
	if accountHolder == "" {
		accountHolder = "CV Berkah Rasa Nusantara"
	}
	accountNumber := strings.TrimSpace(req.AccountNumber)
	if accountNumber == "" {
		accountNumber = "521-0988-123"
	}
	docURL := strings.TrimSpace(req.InvoiceDocURL)
	if docURL == "" {
		docURL = "https://serasiwo.storage/invoices/uploaded-invoice.pdf"
	}

	newPayout := VendorPayout{
		ID:            fmt.Sprintf("pay-%d", time.Now().UnixNano()),
		InvoiceNumber: cleanInv,
		JobID:         jobID,
		WeddingTitle:  weddingTitle,
		EventDate:     eventDate,
		Amount:        req.Amount,
		BankName:      bankName,
		AccountHolder: accountHolder,
		AccountNumber: accountNumber,
		InvoiceDocURL: docURL,
		Status:        "tertunda",
		StatusLabel:   "Tertunda (Menunggu Verifikasi WO)",
		SubmittedAt:   time.Now(),
		Notes:         strings.TrimSpace(req.Notes),
	}

	s.payouts = append([]VendorPayout{newPayout}, s.payouts...)
	s.upsertPayoutToSupabase(newPayout)
	s.savePersistedState()
	return &newPayout, nil
}

func (s *service) UpdatePayoutAction(vendorID string, payoutID string, action string, notes string) (*VendorPayout, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if payouts, ok := s.fetchPayoutsFromSupabase(vendorID); ok && len(payouts) > 0 {
		s.payouts = payouts
	}

	cleanNotes := strings.TrimSpace(notes)
	now := time.Now()

	for i, p := range s.payouts {
		if p.ID == payoutID {
			switch action {
			case "verifikasi", "proses":
				if p.Status == "dicairkan" {
					return nil, errors.New("faktur ini sudah berstatus dicairkan (lunas)")
				}
				s.payouts[i].Status = "diproses"
				s.payouts[i].StatusLabel = "Sedang Diproses Keuangan WO"
				if cleanNotes != "" {
					s.payouts[i].Notes = cleanNotes
				} else {
					s.payouts[i].Notes = "Berkas faktur terverifikasi oleh Admin Ops, menunggu jadwal transfer batch keuangan WO."
				}
				s.upsertPayoutToSupabase(s.payouts[i])
				s.savePersistedState()
				return &s.payouts[i], nil

			case "cairkan":
				s.payouts[i].Status = "dicairkan"
				s.payouts[i].StatusLabel = "Dicairkan (Lunas)"
				s.payouts[i].DisbursedAt = &now
				if cleanNotes != "" {
					s.payouts[i].Notes = cleanNotes
				} else {
					s.payouts[i].Notes = fmt.Sprintf("Dana lunas ditransfer ke rekening %s (%s) pada %s WIB.", p.BankName, p.AccountNumber, now.Format("15:04"))
				}
				s.upsertPayoutToSupabase(s.payouts[i])
				s.savePersistedState()
				return &s.payouts[i], nil

			case "update_catatan":
				if cleanNotes == "" {
					return nil, errors.New("catatan tagihan tidak boleh kosong")
				}
				s.payouts[i].Notes = cleanNotes
				s.upsertPayoutToSupabase(s.payouts[i])
				s.savePersistedState()
				return &s.payouts[i], nil

			case "batalkan":
				if p.Status == "dicairkan" {
					return nil, errors.New("tagihan yang sudah dicairkan (lunas) tidak dapat dibatalkan")
				}
				cancelled := s.payouts[i]
				s.payouts = append(s.payouts[:i], s.payouts[i+1:]...)
				s.deletePayoutFromSupabase(payoutID)
				s.savePersistedState()
				return &cancelled, nil

			default:
				return nil, fmt.Errorf("aksi '%s' tidak dikenali", action)
			}
		}
	}

	return nil, fmt.Errorf("data tagihan dengan ID '%s' tidak ditemukan", payoutID)
}

func buildDefaultLoadingSchedule(ev VendorEventSummary) VendorLoadingSchedule {
	passSuffix := strings.ToUpper(strings.ReplaceAll(ev.ID, "-", ""))
	crewCount := 14
	if ev.PortionsOrUnits >= 1000 {
		crewCount = 18
	}
	return VendorLoadingSchedule{
		EventID:          ev.ID,
		DockGate:         fmt.Sprintf("Gate Loading Utama %s (Akses Logistik Katering)", ev.Venue),
		MaxVehicleHeight: "3,5 Meter (Truk Chiller & Blindvan)",
		SecurityPassCode: fmt.Sprintf("SRWO-%s-2026", passSuffix),
		StagingArea:      "Koridor Servis Utama & Pantri Pendamping Ballroom",
		FleetAssigned:    "2 Unit Isuzu Elf Chiller (B 9821 TDF & B 9410 TDF)",
		CrewCount:        crewCount,
		DriverLead:       "Supriyanto (0812-9988-1122)",
		Slots: []LoadingSlot{
			{
				ID:        fmt.Sprintf("%s-slot-1", ev.ID),
				Time:      "05:00 WIB",
				Phase:     "Kedatangan Armada",
				Title:     "Armada Chiller & Logistik Tiba di Loading Dock",
				Detail:    "Pemeriksaan surat jalan resmi SerasiWO oleh petugas keamanan venue dan penukaran ID kru.",
				PIC:       "Bayu Pratama (PIC Logistik WO)",
				Completed: false,
			},
			{
				ID:        fmt.Sprintf("%s-slot-2", ev.ID),
				Time:      "06:30 WIB",
				Phase:     "Instalasi Jalur Buffet",
				Title:     "Penataan Meja Prasmanan Utama, Skirting, & Chafing Dish",
				Detail:    "Instalasi pemanas hidangan dan penataan jalur antrean dua sisi di area jamuan.",
				PIC:       "Hendra Kusuma (Kapten Katering)",
				Completed: false,
			},
			{
				ID:        fmt.Sprintf("%s-slot-3", ev.ID),
				Time:      "08:30 WIB",
				Phase:     "Uji Kelayakan & Suhu",
				Title:     "Inspeksi Higienitas, Suhu Saji (>= 65°C), & Food Tasting Keluarga",
				Detail:    "Verifikasi kematangan dan suhu hidangan bersama koordinator WO sebelum tamu hadir.",
				PIC:       "Dian Paramita (Lead Coordinator WO)",
				Completed: false,
			},
			{
				ID:        fmt.Sprintf("%s-slot-4", ev.ID),
				Time:      "10:00 WIB",
				Phase:     "Operasional Jamuan",
				Title:     "Seluruh Jalur Buffet & Pondokan Siap Saji (Full Standby)",
				Detail:    "Seluruh kru pramusaji berseragam lengkap, bermasker, dan standby menjaga pengisian ulang.",
				PIC:       "Siti Anggraini (PIC Meja VIP)",
				Completed: false,
			},
			{
				ID:        fmt.Sprintf("%s-slot-5", ev.ID),
				Time:      "14:30 WIB",
				Phase:     "Bongkar & Serah Terima",
				Title:     "Clearance Peralatan, Pengemasan Sisa Hidangan, & Sanitasi Area",
				Detail:    "Serah terima sisa makanan layak konsumsi kepada keluarga dan pembersihan pantri venue.",
				PIC:       "Bayu Pratama (PIC Logistik WO)",
				Completed: false,
			},
		},
	}
}

func (s *service) GetLoadingSchedules(vendorID string) (map[string]VendorLoadingSchedule, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if evs, ok := s.fetchEventsFromSupabase(vendorID); ok && len(evs) > 0 {
		s.events = evs
	}
	if scheds, ok := s.fetchLoadingSchedulesFromSupabase(vendorID); ok && len(scheds) > 0 {
		s.loadingSchedules = scheds
	}

	if s.loadingSchedules == nil {
		s.loadingSchedules = make(map[string]VendorLoadingSchedule)
	}

	// Pastikan setiap acara terjadwal di vendor_events otomatis memiliki jadwal loading di database
	for _, ev := range s.events {
		if _, exists := s.loadingSchedules[ev.ID]; !exists {
			created := buildDefaultLoadingSchedule(ev)
			s.loadingSchedules[ev.ID] = created
			s.upsertLoadingScheduleToSupabase(created)
		}
	}

	out := make(map[string]VendorLoadingSchedule, len(s.loadingSchedules))
	for k, v := range s.loadingSchedules {
		out[k] = v
	}
	return out, nil
}

func (s *service) UpdateLoadingSlot(vendorID string, eventID string, req LoadingSlotUpdateRequest) (*VendorLoadingSchedule, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if scheds, ok := s.fetchLoadingSchedulesFromSupabase(vendorID); ok && len(scheds) > 0 {
		s.loadingSchedules = scheds
	}
	if s.loadingSchedules == nil {
		s.loadingSchedules = make(map[string]VendorLoadingSchedule)
	}

	sched, exists := s.loadingSchedules[eventID]
	if !exists {
		for _, ev := range s.events {
			if ev.ID == eventID {
				sched = buildDefaultLoadingSchedule(ev)
				exists = true
				break
			}
		}
		if !exists {
			return nil, fmt.Errorf("jadwal loading untuk acara '%s' tidak ditemukan", eventID)
		}
	}

	nowStr := time.Now().Format("15:04") + " WIB"
	cleanNote := strings.TrimSpace(req.Note)

	if req.SlotID == "update_fleet" {
		if strings.TrimSpace(req.FleetAssigned) != "" {
			sched.FleetAssigned = strings.TrimSpace(req.FleetAssigned)
		}
		if strings.TrimSpace(req.DriverLead) != "" {
			sched.DriverLead = strings.TrimSpace(req.DriverLead)
		}
		s.loadingSchedules[eventID] = sched
		s.upsertLoadingScheduleToSupabase(sched)
		s.savePersistedState()
		return &sched, nil
	}

	if req.SlotID == "all_complete" {
		for i := range sched.Slots {
			sched.Slots[i].Completed = true
			if sched.Slots[i].CompletedAt == "" {
				sched.Slots[i].CompletedAt = nowStr
			}
			if cleanNote != "" {
				sched.Slots[i].Note = cleanNote
			}
		}
	} else if req.SlotID == "reset_all" {
		for i := range sched.Slots {
			sched.Slots[i].Completed = false
			sched.Slots[i].CompletedAt = ""
			sched.Slots[i].Note = ""
		}
	} else {
		found := false
		for i, sl := range sched.Slots {
			if sl.ID == req.SlotID {
				found = true
				nextState := !sl.Completed
				if req.Completed != nil {
					nextState = *req.Completed
				}
				sched.Slots[i].Completed = nextState
				if nextState {
					if sched.Slots[i].CompletedAt == "" {
						sched.Slots[i].CompletedAt = nowStr
					}
					if cleanNote != "" {
						sched.Slots[i].Note = cleanNote
					}
				} else {
					sched.Slots[i].CompletedAt = ""
					if cleanNote != "" {
						sched.Slots[i].Note = cleanNote
					}
				}
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("slot tahapan '%s' tidak ditemukan pada jadwal ini", req.SlotID)
		}
	}

	s.loadingSchedules[eventID] = sched
	s.upsertLoadingScheduleToSupabase(sched)
	s.savePersistedState()
	return &sched, nil
}

func buildDefaultMenuManifest(ev VendorEventSummary) VendorMenuManifest {
	docSuffix := strings.ToUpper(strings.ReplaceAll(ev.ID, "-", ""))
	portions := ev.PortionsOrUnits
	if portions <= 0 {
		portions = 800
	}
	vipPortions := portions / 8
	if vipPortions < 50 {
		vipPortions = 50
	}
	crewPortions := 60
	if portions >= 1000 {
		crewPortions = 80
	}
	qtyLabel := fmt.Sprintf("%d Porsi", portions)
	stallQtyLabel := fmt.Sprintf("%d Porsi", portions/3)

	return VendorMenuManifest{
		EventID:        ev.ID,
		ManifestNumber: fmt.Sprintf("SJ/BRC/2026/%s", docSuffix),
		PackageName:    fmt.Sprintf("Paket Katering Resmi (%s)", ev.PortionUnitLabel),
		TotalPortions:  portions,
		VipPortions:    vipPortions,
		CrewPortions:   crewPortions,
		DepartureTime:  "04:30 WIB dari Dapur Sentral Tebet",
		VehiclePlate:   "B 9821 TDF & B 9410 TDF (Isuzu Elf Chiller)",
		DriverPhone:    "Supriyanto (0812-9988-1122)",
		Items: []MenuManifestItem{
			{
				ID:          fmt.Sprintf("%s-m-1", ev.ID),
				Category:    "Buffet Utama",
				Name:        "Nasi Putih Pandan Wangi & Nasi Goreng Rempah Nusantara",
				Qty:         qtyLabel,
				ServingTemp: "Panas (>= 68°C)",
				QCChecked:   false,
				Notes:       "Disimpan dalam termos nasi kedap suhu dan chafing dish elektrik.",
			},
			{
				ID:          fmt.Sprintf("%s-m-2", ev.ID),
				Category:    "Buffet Utama",
				Name:        "Hidangan Utama Daging Sapi Has Dalam & Ayam Bakar Madu",
				Qty:         qtyLabel,
				ServingTemp: "Kuah Panas (>= 72°C)",
				QCChecked:   false,
				Notes:       "Saus dan kuah dipisah dalam kontainer termal food-grade.",
			},
			{
				ID:          fmt.Sprintf("%s-m-3", ev.ID),
				Category:    "Stall Pondokan",
				Name:        "Pondokan Spesial Kambing Guling / Zuppa Soup / Sate Nusantara",
				Qty:         stallQtyLabel,
				ServingTemp: "Live Cooking (>= 75°C)",
				QCChecked:   false,
				Notes:       "Peralatan pemanggang smokeless dan chef khusus telah disiapkan.",
			},
			{
				ID:          fmt.Sprintf("%s-m-4", ev.ID),
				Category:    "Dessert & Minuman",
				Name:        "Aneka Puding Vla, Buah Segar Potong, & Minuman Dingin",
				Qty:         qtyLabel,
				ServingTemp: "Dingin (<= 4°C)",
				QCChecked:   false,
				Notes:       "Pendingin chiller portabel dan dry ice telah diverifikasi.",
			},
		},
	}
}

func (s *service) GetMenuManifests(vendorID string) (map[string]VendorMenuManifest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if evs, ok := s.fetchEventsFromSupabase(vendorID); ok && len(evs) > 0 {
		s.events = evs
	}
	if manifests, ok := s.fetchMenuManifestsFromSupabase(vendorID); ok && len(manifests) > 0 {
		s.menuManifests = manifests
	}

	if s.menuManifests == nil {
		s.menuManifests = make(map[string]VendorMenuManifest)
	}

	for _, ev := range s.events {
		if _, exists := s.menuManifests[ev.ID]; !exists {
			created := buildDefaultMenuManifest(ev)
			s.menuManifests[ev.ID] = created
			s.upsertMenuManifestToSupabase(created)
		}
	}

	out := make(map[string]VendorMenuManifest, len(s.menuManifests))
	for k, v := range s.menuManifests {
		out[k] = v
	}
	return out, nil
}

func (s *service) UpdateMenuManifest(vendorID string, eventID string, req MenuManifestUpdateRequest) (*VendorMenuManifest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if manifests, ok := s.fetchMenuManifestsFromSupabase(vendorID); ok && len(manifests) > 0 {
		s.menuManifests = manifests
	}
	if s.menuManifests == nil {
		s.menuManifests = make(map[string]VendorMenuManifest)
	}

	manifest, exists := s.menuManifests[eventID]
	if !exists {
		for _, ev := range s.events {
			if ev.ID == eventID {
				manifest = buildDefaultMenuManifest(ev)
				exists = true
				break
			}
		}
		if !exists {
			return nil, fmt.Errorf("manifest hidangan untuk acara '%s' tidak ditemukan", eventID)
		}
	}

	nowStr := time.Now().Format("15:04") + " WIB"
	action := strings.TrimSpace(req.Action)
	if action == "" {
		action = "toggle_qc"
	}

	switch action {
	case "update_logistics":
		if strings.TrimSpace(req.VehiclePlate) != "" {
			manifest.VehiclePlate = strings.TrimSpace(req.VehiclePlate)
		}
		if strings.TrimSpace(req.DriverPhone) != "" {
			manifest.DriverPhone = strings.TrimSpace(req.DriverPhone)
		}
		if strings.TrimSpace(req.DepartureTime) != "" {
			manifest.DepartureTime = strings.TrimSpace(req.DepartureTime)
		}

	case "all_complete":
		for i := range manifest.Items {
			manifest.Items[i].QCChecked = true
			if manifest.Items[i].QCCheckedAt == "" {
				manifest.Items[i].QCCheckedAt = nowStr
			}
		}

	case "reset_all":
		for i := range manifest.Items {
			manifest.Items[i].QCChecked = false
			manifest.Items[i].QCCheckedAt = ""
		}

	case "add_item":
		cleanName := strings.TrimSpace(req.Name)
		if cleanName == "" {
			return nil, errors.New("nama hidangan wajib diisi")
		}
		cat := strings.TrimSpace(req.Category)
		if cat == "" {
			cat = "Buffet Utama"
		}
		qty := strings.TrimSpace(req.Qty)
		if qty == "" {
			qty = fmt.Sprintf("%d Porsi", manifest.TotalPortions)
		}
		temp := strings.TrimSpace(req.ServingTemp)
		if temp == "" {
			temp = "Panas (>= 65°C)"
		}
		newItem := MenuManifestItem{
			ID:          fmt.Sprintf("m-%d", time.Now().UnixNano()/1e6),
			Category:    cat,
			Name:        cleanName,
			Qty:         qty,
			ServingTemp: temp,
			QCChecked:   false,
			Notes:       strings.TrimSpace(req.Notes),
		}
		manifest.Items = append(manifest.Items, newItem)

	case "delete_item":
		targetID := strings.TrimSpace(req.ItemID)
		found := false
		for i, item := range manifest.Items {
			if item.ID == targetID {
				manifest.Items = append(manifest.Items[:i], manifest.Items[i+1:]...)
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("item hidangan '%s' tidak ditemukan", targetID)
		}

	case "update_item", "toggle_qc":
		targetID := strings.TrimSpace(req.ItemID)
		found := false
		for i, item := range manifest.Items {
			if item.ID == targetID {
				found = true
				if action == "toggle_qc" {
					nextQC := !item.QCChecked
					if req.QCChecked != nil {
						nextQC = *req.QCChecked
					}
					manifest.Items[i].QCChecked = nextQC
					if nextQC {
						manifest.Items[i].QCCheckedAt = nowStr
					} else {
						manifest.Items[i].QCCheckedAt = ""
					}
				} else if req.QCChecked != nil {
					manifest.Items[i].QCChecked = *req.QCChecked
					if *req.QCChecked && manifest.Items[i].QCCheckedAt == "" {
						manifest.Items[i].QCCheckedAt = nowStr
					} else if !*req.QCChecked {
						manifest.Items[i].QCCheckedAt = ""
					}
				}
				if strings.TrimSpace(req.Notes) != "" || action == "update_item" {
					manifest.Items[i].Notes = strings.TrimSpace(req.Notes)
				}
				if strings.TrimSpace(req.ServingTemp) != "" {
					manifest.Items[i].ServingTemp = strings.TrimSpace(req.ServingTemp)
				}
				if strings.TrimSpace(req.Qty) != "" {
					manifest.Items[i].Qty = strings.TrimSpace(req.Qty)
				}
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("item hidangan '%s' tidak ditemukan", targetID)
		}

	default:
		return nil, fmt.Errorf("aksi manifest '%s' tidak dikenali", action)
	}

	s.menuManifests[eventID] = manifest
	s.upsertMenuManifestToSupabase(manifest)
	s.savePersistedState()
	return &manifest, nil
}

func (s *service) GetProfile(vendorID string) (*VendorProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if prof, ok := s.fetchProfileFromSupabase(vendorID); ok && prof != nil {
		s.profile = *prof
	}

	profCopy := s.profile
	return &profCopy, nil
}

func (s *service) UpdateProfile(vendorID string, req VendorProfileUpdateRequest) (*VendorProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if prof, ok := s.fetchProfileFromSupabase(vendorID); ok && prof != nil {
		s.profile = *prof
	}

	applyStr := func(dst *string, src *string) {
		if src != nil {
			trimmed := strings.TrimSpace(*src)
			if trimmed != "" {
				*dst = trimmed
			}
		}
	}

	applyStr(&s.profile.Name, req.Name)
	applyStr(&s.profile.LegalName, req.LegalName)
	applyStr(&s.profile.Category, req.Category)
	applyStr(&s.profile.PicName, req.PicName)
	applyStr(&s.profile.PicRole, req.PicRole)
	applyStr(&s.profile.Phone, req.Phone)
	applyStr(&s.profile.Email, req.Email)
	applyStr(&s.profile.NpwpNumber, req.NpwpNumber)
	applyStr(&s.profile.NibNumber, req.NibNumber)
	applyStr(&s.profile.HalalCert, req.HalalCert)
	applyStr(&s.profile.HygieneCert, req.HygieneCert)
	applyStr(&s.profile.KitchenCapacity, req.KitchenCapacity)
	applyStr(&s.profile.FleetInfo, req.FleetInfo)
	applyStr(&s.profile.ServiceCrewTotal, req.ServiceCrewTotal)
	applyStr(&s.profile.KitchenAddress, req.KitchenAddress)
	applyStr(&s.profile.BankName, req.BankName)
	applyStr(&s.profile.BankBranch, req.BankBranch)
	applyStr(&s.profile.AccountNumber, req.AccountNumber)
	applyStr(&s.profile.AccountNumberRaw, req.AccountNumberRaw)
	applyStr(&s.profile.AccountHolder, req.AccountHolder)
	applyStr(&s.profile.SettlementSchedule, req.SettlementSchedule)

	if s.profile.ID == "" {
		s.profile.ID = vendorID
	}
	s.profile.UpdatedAt = time.Now()

	s.upsertProfileToSupabase(s.profile)
	s.savePersistedState()

	profCopy := s.profile
	return &profCopy, nil
}
