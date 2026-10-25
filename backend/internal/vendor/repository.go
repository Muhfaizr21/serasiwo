package vendor

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type persistedCalendarState struct {
	Profile          *VendorProfile                   `json:"profile,omitempty"`
	DateBlocks       []DateBlock                      `json:"date_blocks"`
	Events           []VendorEventSummary             `json:"events"`
	Jobs             []VendorJob                      `json:"jobs"`
	Readiness        []JobReadiness                   `json:"readiness,omitempty"`
	Payouts          []VendorPayout                   `json:"payouts,omitempty"`
	LoadingSchedules map[string]VendorLoadingSchedule `json:"loading_schedules,omitempty"`
	MenuManifests    map[string]VendorMenuManifest    `json:"menu_manifests,omitempty"`
}

type supabaseBlockRow struct {
	ID        string    `json:"id"`
	VendorID  string    `json:"vendor_id"`
	BlockDate string    `json:"block_date"`
	IsBlocked bool      `json:"is_blocked"`
	Reason    string    `json:"reason"`
	IsWOEvent bool      `json:"is_wo_event"`
	EventName string    `json:"event_name"`
	CreatedAt time.Time `json:"created_at"`
}

func getStoreFilePath() string {
	return filepath.Join("data", "vendor_calendar_db.json")
}

func (s *service) fetchDateBlocksFromSupabase(vendorID string) ([]DateBlock, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_date_blocks?vendor_id=eq.%s&order=block_date.asc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var rows []supabaseBlockRow
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, false
	}

	blocks := make([]DateBlock, 0, len(rows))
	for _, r := range rows {
		blocks = append(blocks, DateBlock{
			ID:        r.ID,
			Date:      r.BlockDate,
			IsBlocked: r.IsBlocked,
			Reason:    r.Reason,
			IsWOEvent: r.IsWOEvent,
			EventName: r.EventName,
			CreatedAt: r.CreatedAt,
		})
	}
	return blocks, true
}

func (s *service) fetchEventsFromSupabase(vendorID string) ([]VendorEventSummary, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_events?vendor_id=eq.%s&order=event_date.asc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var evs []VendorEventSummary
	if err := json.Unmarshal(body, &evs); err != nil {
		return nil, false
	}
	return evs, true
}

func (s *service) fetchJobsFromSupabase(vendorID string) ([]VendorJob, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_jobs?vendor_id=eq.%s&order=event_date.asc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var jobs []VendorJob
	if err := json.Unmarshal(body, &jobs); err != nil {
		return nil, false
	}
	return jobs, true
}

func (s *service) fetchReadinessFromSupabase(vendorID string) ([]JobReadiness, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_readiness?vendor_id=eq.%s&order=event_date.asc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var list []JobReadiness
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, false
	}
	return list, true
}

func (s *service) fetchPayoutsFromSupabase(vendorID string) ([]VendorPayout, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_payouts?vendor_id=eq.%s&order=submitted_at.desc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var payouts []VendorPayout
	if err := json.Unmarshal(body, &payouts); err != nil {
		return nil, false
	}
	return payouts, true
}

func (s *service) fetchLoadingSchedulesFromSupabase(vendorID string) (map[string]VendorLoadingSchedule, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_loading_schedules?vendor_id=eq.%s&order=event_id.asc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var rows []VendorLoadingSchedule
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, false
	}

	result := make(map[string]VendorLoadingSchedule, len(rows))
	for _, r := range rows {
		result[r.EventID] = r
	}
	return result, true
}

func (s *service) fetchMenuManifestsFromSupabase(vendorID string) (map[string]VendorMenuManifest, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_menu_manifests?vendor_id=eq.%s&order=event_id.asc", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var rows []VendorMenuManifest
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, false
	}

	result := make(map[string]VendorMenuManifest, len(rows))
	for _, r := range rows {
		result[r.EventID] = r
	}
	return result, true
}

func (s *service) fetchProfileFromSupabase(vendorID string) (*VendorProfile, bool) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return nil, false
	}

	body, status, err := s.sb.RestRequest(
		http.MethodGet,
		fmt.Sprintf("vendor_profiles?id=eq.%s&limit=1", vendorID),
		nil,
	)
	if err != nil || status != http.StatusOK {
		return nil, false
	}

	var rows []VendorProfile
	if err := json.Unmarshal(body, &rows); err != nil || len(rows) == 0 {
		return nil, false
	}
	return &rows[0], true
}

func (s *service) loadFromSupabase() {
	if prof, ok := s.fetchProfileFromSupabase(DefaultVendorID); ok && prof != nil {
		s.profile = *prof
	}
	if blocks, ok := s.fetchDateBlocksFromSupabase(DefaultVendorID); ok && len(blocks) > 0 {
		s.dateBlocks = blocks
	}
	if evs, ok := s.fetchEventsFromSupabase(DefaultVendorID); ok && len(evs) > 0 {
		s.events = evs
	}
	if jobs, ok := s.fetchJobsFromSupabase(DefaultVendorID); ok && len(jobs) > 0 {
		s.jobs = jobs
	}
	if rList, ok := s.fetchReadinessFromSupabase(DefaultVendorID); ok && len(rList) > 0 {
		s.readinessMap = make(map[string]*JobReadiness, len(rList))
		for i := range rList {
			item := rList[i]
			s.readinessMap[item.JobID] = &item
		}
	}
	if payouts, ok := s.fetchPayoutsFromSupabase(DefaultVendorID); ok && len(payouts) > 0 {
		s.payouts = payouts
	}
	if scheds, ok := s.fetchLoadingSchedulesFromSupabase(DefaultVendorID); ok && len(scheds) > 0 {
		s.loadingSchedules = scheds
	}
	if manifests, ok := s.fetchMenuManifestsFromSupabase(DefaultVendorID); ok && len(manifests) > 0 {
		s.menuManifests = manifests
	}
}

func (s *service) loadPersistedState() {
	path := getStoreFilePath()
	raw, err := os.ReadFile(path)
	if err == nil && len(raw) > 0 {
		var stored persistedCalendarState
		if json.Unmarshal(raw, &stored) == nil {
			if stored.Profile != nil && stored.Profile.ID != "" {
				s.profile = *stored.Profile
			}
			if len(stored.DateBlocks) > 0 {
				s.dateBlocks = stored.DateBlocks
			}
			if len(stored.Events) > 0 {
				s.events = stored.Events
			}
			if len(stored.Jobs) > 0 {
				s.jobs = stored.Jobs
			}
			if len(stored.Readiness) > 0 {
				s.readinessMap = make(map[string]*JobReadiness, len(stored.Readiness))
				for i := range stored.Readiness {
					item := stored.Readiness[i]
					s.readinessMap[item.JobID] = &item
				}
			}
			if len(stored.Payouts) > 0 {
				s.payouts = stored.Payouts
			}
		}
	}

	s.loadFromSupabase()
	s.savePersistedState()
}

func (s *service) savePersistedState() {
	path := getStoreFilePath()
	_ = os.MkdirAll(filepath.Dir(path), 0755)

	readinessSlice := make([]JobReadiness, 0, len(s.readinessMap))
	for _, r := range s.readinessMap {
		if r != nil {
			readinessSlice = append(readinessSlice, *r)
		}
	}

	profCopy := s.profile
	payload := persistedCalendarState{
		Profile:    &profCopy,
		DateBlocks: s.dateBlocks,
		Events:     s.events,
		Jobs:       s.jobs,
		Readiness:  readinessSlice,
		Payouts:    s.payouts,
	}

	bytes, err := json.MarshalIndent(payload, "", "  ")
	if err == nil {
		_ = os.WriteFile(path, bytes, 0644)
	}
}

func (s *service) upsertDateBlockToSupabase(block DateBlock) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"id":          block.ID,
		"vendor_id":   DefaultVendorID,
		"block_date":  block.Date,
		"is_blocked":  block.IsBlocked,
		"reason":      block.Reason,
		"is_wo_event": block.IsWOEvent,
		"event_name":  block.EventName,
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_date_blocks?on_conflict=vendor_id,block_date", payload)
}

func (s *service) upsertJobToSupabase(job VendorJob) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"id":                 job.ID,
		"vendor_id":          DefaultVendorID,
		"event_id":           job.EventID,
		"wedding_title":      job.WeddingTitle,
		"bride_groom":        job.BrideGroom,
		"event_date":         job.EventDate,
		"time_slot":          job.TimeSlot,
		"venue":              job.Venue,
		"venue_address":      job.VenueAddress,
		"category":           job.Category,
		"package_name":       job.PackageName,
		"portions":           job.Portions,
		"portion_unit_label": job.PortionUnitLabel,
		"menu_or_notes":      job.MenuOrNotes,
		"special_request":    job.SpecialRequest,
		"payout_amount":      job.PayoutAmount,
		"status":             job.Status,
		"decision_note":      job.DecisionNote,
		"requested_at":       job.RequestedAt,
		"responded_at":       job.RespondedAt,
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_jobs?on_conflict=id", payload)
}

func (s *service) upsertEventToSupabase(ev VendorEventSummary) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"id":                 ev.ID,
		"vendor_id":          DefaultVendorID,
		"job_id":             ev.JobID,
		"wedding_title":      ev.WeddingTitle,
		"bride_groom":        ev.BrideGroom,
		"event_date":         ev.EventDate,
		"time_slot":          ev.TimeSlot,
		"venue":              ev.Venue,
		"location_city":      ev.LocationCity,
		"portions_or_units":  ev.PortionsOrUnits,
		"portion_unit_label": ev.PortionUnitLabel,
		"readiness_status":   ev.ReadinessStatus,
		"readiness_percent":  ev.ReadinessPercent,
		"note":               ev.Note,
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_events?on_conflict=id", payload)
}

func (s *service) upsertReadinessToSupabase(r JobReadiness) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"job_id":           r.JobID,
		"vendor_id":        DefaultVendorID,
		"wedding_title":    r.WeddingTitle,
		"event_date":       r.EventDate,
		"time_slot":        r.TimeSlot,
		"venue":            r.Venue,
		"portions":         r.Portions,
		"unit_label":       r.UnitLabel,
		"current_status":   r.CurrentStatus,
		"progress_percent": r.ProgressPercent,
		"steps":            r.Steps,
		"last_updated":     r.LastUpdated,
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_readiness?on_conflict=job_id", payload)
}

func (s *service) upsertPayoutToSupabase(p VendorPayout) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"id":              p.ID,
		"vendor_id":       DefaultVendorID,
		"invoice_number":  p.InvoiceNumber,
		"job_id":          p.JobID,
		"wedding_title":   p.WeddingTitle,
		"event_date":      p.EventDate,
		"amount":          p.Amount,
		"bank_name":       p.BankName,
		"account_holder":  p.AccountHolder,
		"account_number":  p.AccountNumber,
		"invoice_doc_url": p.InvoiceDocURL,
		"status":          p.Status,
		"status_label":    p.StatusLabel,
		"notes":           p.Notes,
		"submitted_at":    p.SubmittedAt,
		"disbursed_at":    p.DisbursedAt,
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_payouts?on_conflict=id", payload)
}

func (s *service) deletePayoutFromSupabase(payoutID string) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	_, _, _ = s.sb.RestRequest(
		http.MethodDelete,
		fmt.Sprintf("vendor_payouts?id=eq.%s", payoutID),
		nil,
	)
}

func (s *service) upsertLoadingScheduleToSupabase(sched VendorLoadingSchedule) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"event_id":           sched.EventID,
		"vendor_id":          DefaultVendorID,
		"dock_gate":          sched.DockGate,
		"max_vehicle_height": sched.MaxVehicleHeight,
		"security_pass_code": sched.SecurityPassCode,
		"staging_area":       sched.StagingArea,
		"fleet_assigned":     sched.FleetAssigned,
		"crew_count":         sched.CrewCount,
		"driver_lead":        sched.DriverLead,
		"slots":              sched.Slots,
		"updated_at":         time.Now(),
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_loading_schedules?on_conflict=event_id", payload)
}

func (s *service) upsertMenuManifestToSupabase(manifest VendorMenuManifest) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"event_id":        manifest.EventID,
		"vendor_id":       DefaultVendorID,
		"manifest_number": manifest.ManifestNumber,
		"package_name":    manifest.PackageName,
		"total_portions":  manifest.TotalPortions,
		"vip_portions":    manifest.VipPortions,
		"crew_portions":   manifest.CrewPortions,
		"departure_time":  manifest.DepartureTime,
		"vehicle_plate":   manifest.VehiclePlate,
		"driver_phone":    manifest.DriverPhone,
		"items":           manifest.Items,
		"updated_at":      time.Now(),
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_menu_manifests?on_conflict=event_id", payload)
}

func (s *service) upsertProfileToSupabase(profile VendorProfile) {
	if s.sb == nil || !s.sb.IsConfigured() {
		return
	}
	payload := map[string]interface{}{
		"id":                  profile.ID,
		"name":                profile.Name,
		"legal_name":          profile.LegalName,
		"category":            profile.Category,
		"pic_name":            profile.PicName,
		"pic_role":            profile.PicRole,
		"phone":               profile.Phone,
		"email":               profile.Email,
		"rating":              profile.Rating,
		"completed_jobs":      profile.CompletedJobs,
		"active_jobs":         profile.ActiveJobs,
		"verified_status":     profile.VerifiedStatus,
		"npwp_number":         profile.NpwpNumber,
		"nib_number":          profile.NibNumber,
		"halal_cert":          profile.HalalCert,
		"hygiene_cert":        profile.HygieneCert,
		"kitchen_capacity":    profile.KitchenCapacity,
		"fleet_info":          profile.FleetInfo,
		"service_crew_total":  profile.ServiceCrewTotal,
		"kitchen_address":     profile.KitchenAddress,
		"bank_name":           profile.BankName,
		"bank_branch":         profile.BankBranch,
		"account_number":      profile.AccountNumber,
		"account_number_raw":  profile.AccountNumberRaw,
		"account_holder":      profile.AccountHolder,
		"settlement_schedule": profile.SettlementSchedule,
		"updated_at":          time.Now(),
	}
	_, _, _ = s.sb.RestRequest(http.MethodPost, "vendor_profiles?on_conflict=id", payload)
}
