package vendor

import "time"

const DefaultVendorID = "vnd-berkah-rasa"

type VendorProfile struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	LegalName          string    `json:"legal_name"`
	Category           string    `json:"category"`
	PicName            string    `json:"pic_name"`
	PicRole            string    `json:"pic_role"`
	Phone              string    `json:"phone"`
	Email              string    `json:"email"`
	Rating             float64   `json:"rating"`
	CompletedJobs      int       `json:"completed_jobs"`
	ActiveJobs         int       `json:"active_jobs"`
	VerifiedStatus     string    `json:"verified_status"`
	NpwpNumber         string    `json:"npwp_number"`
	NibNumber          string    `json:"nib_number"`
	HalalCert          string    `json:"halal_cert"`
	HygieneCert        string    `json:"hygiene_cert"`
	KitchenCapacity    string    `json:"kitchen_capacity"`
	FleetInfo          string    `json:"fleet_info"`
	ServiceCrewTotal   string    `json:"service_crew_total"`
	KitchenAddress     string    `json:"kitchen_address"`
	BankName           string    `json:"bank_name"`
	BankBranch         string    `json:"bank_branch"`
	AccountNumber      string    `json:"account_number"`
	AccountNumberRaw   string    `json:"account_number_raw"`
	AccountHolder      string    `json:"account_holder"`
	SettlementSchedule string    `json:"settlement_schedule"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type VendorProfileUpdateRequest struct {
	Name               *string `json:"name,omitempty"`
	LegalName          *string `json:"legal_name,omitempty"`
	Category           *string `json:"category,omitempty"`
	PicName            *string `json:"pic_name,omitempty"`
	PicRole            *string `json:"pic_role,omitempty"`
	Phone              *string `json:"phone,omitempty"`
	Email              *string `json:"email,omitempty"`
	NpwpNumber         *string `json:"npwp_number,omitempty"`
	NibNumber          *string `json:"nib_number,omitempty"`
	HalalCert          *string `json:"halal_cert,omitempty"`
	HygieneCert        *string `json:"hygiene_cert,omitempty"`
	KitchenCapacity    *string `json:"kitchen_capacity,omitempty"`
	FleetInfo          *string `json:"fleet_info,omitempty"`
	ServiceCrewTotal   *string `json:"service_crew_total,omitempty"`
	KitchenAddress     *string `json:"kitchen_address,omitempty"`
	BankName           *string `json:"bank_name,omitempty"`
	BankBranch         *string `json:"bank_branch,omitempty"`
	AccountNumber      *string `json:"account_number,omitempty"`
	AccountNumberRaw   *string `json:"account_number_raw,omitempty"`
	AccountHolder      *string `json:"account_holder,omitempty"`
	SettlementSchedule *string `json:"settlement_schedule,omitempty"`
}

type VendorEventSummary struct {
	ID               string `json:"id"`
	JobID            string `json:"job_id"`
	WeddingTitle     string `json:"wedding_title"`
	BrideGroom       string `json:"bride_groom"`
	EventDate        string `json:"event_date"`
	TimeSlot         string `json:"time_slot"`
	Venue            string `json:"venue"`
	LocationCity     string `json:"location_city"`
	PortionsOrUnits  int    `json:"portions_or_units"`
	PortionUnitLabel string `json:"portion_unit_label"`
	ReadinessStatus  string `json:"readiness_status"`
	ReadinessPercent int    `json:"readiness_percent"`
	Note             string `json:"note"`
}

type VendorJob struct {
	ID               string     `json:"id"`
	EventID          string     `json:"event_id"`
	WeddingTitle     string     `json:"wedding_title"`
	BrideGroom       string     `json:"bride_groom"`
	EventDate        string     `json:"event_date"`
	TimeSlot         string     `json:"time_slot"`
	Venue            string     `json:"venue"`
	VenueAddress     string     `json:"venue_address"`
	Category         string     `json:"category"`
	PackageName      string     `json:"package_name"`
	Portions         int        `json:"portions"`
	PortionUnitLabel string     `json:"portion_unit_label"`
	MenuOrNotes      string     `json:"menu_or_notes"`
	SpecialRequest   string     `json:"special_request"`
	PayoutAmount     float64    `json:"payout_amount"`
	Status           string     `json:"status"`
	RequestedAt      time.Time  `json:"requested_at"`
	RespondedAt      *time.Time `json:"responded_at,omitempty"`
	DecisionNote     string     `json:"decision_note,omitempty"`
}

type DateBlock struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"`
	IsBlocked bool      `json:"is_blocked"`
	Reason    string    `json:"reason"`
	IsWOEvent bool      `json:"is_wo_event"`
	EventName string    `json:"event_name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type ReadinessStep struct {
	StepID      string     `json:"step_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Completed   bool       `json:"completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	UpdatedBy   string     `json:"updated_by,omitempty"`
	ProofNote   string     `json:"proof_note,omitempty"`
}

type JobReadiness struct {
	JobID           string          `json:"job_id"`
	WeddingTitle    string          `json:"wedding_title"`
	EventDate       string          `json:"event_date"`
	TimeSlot        string          `json:"time_slot"`
	Venue           string          `json:"venue"`
	Portions        int             `json:"portions"`
	UnitLabel       string          `json:"unit_label"`
	CurrentStatus   string          `json:"current_status"`
	ProgressPercent int             `json:"progress_percent"`
	Steps           []ReadinessStep `json:"steps"`
	LastUpdated     time.Time       `json:"last_updated"`
}

type VendorPayout struct {
	ID            string     `json:"id"`
	InvoiceNumber string     `json:"invoice_number"`
	JobID         string     `json:"job_id"`
	WeddingTitle  string     `json:"wedding_title"`
	EventDate     string     `json:"event_date"`
	Amount        float64    `json:"amount"`
	BankName      string     `json:"bank_name"`
	AccountHolder string     `json:"account_holder"`
	AccountNumber string     `json:"account_number"`
	InvoiceDocURL string     `json:"invoice_doc_url"`
	Status        string     `json:"status"`
	StatusLabel   string     `json:"status_label"`
	SubmittedAt   time.Time  `json:"submitted_at"`
	DisbursedAt   *time.Time `json:"disbursed_at,omitempty"`
	Notes         string     `json:"notes,omitempty"`
}

type VendorDashboardMetrics struct {
	WeeklyEventsCount   int     `json:"weekly_events_count"`
	NewBookingAlerts    int     `json:"new_booking_alerts"`
	TotalPortionsActive int     `json:"total_portions_active"`
	PendingPayoutAmount float64 `json:"pending_payout_amount"`
	SettledPayoutAmount float64 `json:"settled_payout_amount"`
	ReadinessRate       int     `json:"readiness_rate"`
}

type VendorDashboardData struct {
	VendorProfile    VendorProfile                    `json:"vendor_profile"`
	Metrics          VendorDashboardMetrics           `json:"metrics"`
	EventsThisWeek   []VendorEventSummary             `json:"events_this_week"`
	NewBookingAlerts []VendorJob                      `json:"new_booking_alerts"`
	Jobs             []VendorJob                      `json:"jobs"`
	DateBlocks       []DateBlock                      `json:"date_blocks"`
	RecentPayouts    []VendorPayout                   `json:"recent_payouts"`
	ActiveReadiness  []JobReadiness                   `json:"active_readiness"`
	LoadingSchedules map[string]VendorLoadingSchedule `json:"loading_schedules,omitempty"`
	MenuManifests    map[string]VendorMenuManifest    `json:"menu_manifests,omitempty"`
	LastSyncedAt     time.Time                        `json:"last_synced_at"`
}

type MenuManifestItem struct {
	ID          string `json:"id"`
	Category    string `json:"category"`
	Name        string `json:"name"`
	Qty         string `json:"qty"`
	ServingTemp string `json:"serving_temp"`
	QCChecked   bool   `json:"qc_checked"`
	QCCheckedAt string `json:"qc_checked_at,omitempty"`
	Notes       string `json:"notes"`
}

type VendorMenuManifest struct {
	EventID        string             `json:"event_id"`
	ManifestNumber string             `json:"manifest_number"`
	PackageName    string             `json:"package_name"`
	TotalPortions  int                `json:"total_portions"`
	VipPortions    int                `json:"vip_portions"`
	CrewPortions   int                `json:"crew_portions"`
	DepartureTime  string             `json:"departure_time"`
	VehiclePlate   string             `json:"vehicle_plate"`
	DriverPhone    string             `json:"driver_phone"`
	Items          []MenuManifestItem `json:"items"`
}

type MenuManifestUpdateRequest struct {
	Action        string `json:"action"`
	ItemID        string `json:"item_id,omitempty"`
	QCChecked     *bool  `json:"qc_checked,omitempty"`
	Notes         string `json:"notes,omitempty"`
	ServingTemp   string `json:"serving_temp,omitempty"`
	Category      string `json:"category,omitempty"`
	Name          string `json:"name,omitempty"`
	Qty           string `json:"qty,omitempty"`
	VehiclePlate  string `json:"vehicle_plate,omitempty"`
	DriverPhone   string `json:"driver_phone,omitempty"`
	DepartureTime string `json:"departure_time,omitempty"`
}

type LoadingSlot struct {
	ID          string `json:"id"`
	Time        string `json:"time"`
	Phase       string `json:"phase"`
	Title       string `json:"title"`
	Detail      string `json:"detail"`
	PIC         string `json:"pic"`
	Completed   bool   `json:"completed"`
	CompletedAt string `json:"completed_at,omitempty"`
	Note        string `json:"note,omitempty"`
}

type VendorLoadingSchedule struct {
	EventID          string        `json:"event_id"`
	DockGate         string        `json:"dock_gate"`
	MaxVehicleHeight string        `json:"max_vehicle_height"`
	SecurityPassCode string        `json:"security_pass_code"`
	StagingArea      string        `json:"staging_area"`
	FleetAssigned    string        `json:"fleet_assigned"`
	CrewCount        int           `json:"crew_count"`
	DriverLead       string        `json:"driver_lead"`
	Slots            []LoadingSlot `json:"slots"`
}

type LoadingSlotUpdateRequest struct {
	SlotID        string `json:"slot_id"`
	Completed     *bool  `json:"completed,omitempty"`
	Note          string `json:"note,omitempty"`
	FleetAssigned string `json:"fleet_assigned,omitempty"`
	DriverLead    string `json:"driver_lead,omitempty"`
}

type JobActionRequest struct {
	Action string `json:"action"`
	Reason string `json:"reason,omitempty"`
}

type DateBlockRequest struct {
	Date      string `json:"date"`
	IsBlocked bool   `json:"is_blocked"`
	Reason    string `json:"reason"`
}

type ReadinessUpdateRequest struct {
	StepID    string `json:"step_id"`
	Completed bool   `json:"completed"`
	ProofNote string `json:"proof_note,omitempty"`
}

type CreatePayoutRequest struct {
	JobID         string  `json:"job_id"`
	WeddingTitle  string  `json:"wedding_title"`
	EventDate     string  `json:"event_date"`
	InvoiceNumber string  `json:"invoice_number"`
	Amount        float64 `json:"amount"`
	BankName      string  `json:"bank_name"`
	AccountHolder string  `json:"account_holder"`
	AccountNumber string  `json:"account_number"`
	InvoiceDocURL string  `json:"invoice_doc_url"`
	Notes         string  `json:"notes"`
}

type PayoutActionRequest struct {
	Action string `json:"action"`
	Notes  string `json:"notes,omitempty"`
}
