package vendor

import "time"

const DefaultVendorID = "vnd-berkah-rasa"

type VendorProfile struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	PicName        string  `json:"pic_name"`
	Phone          string  `json:"phone"`
	Email          string  `json:"email"`
	Rating         float64 `json:"rating"`
	CompletedJobs  int     `json:"completed_jobs"`
	ActiveJobs     int     `json:"active_jobs"`
	VerifiedStatus string  `json:"verified_status"`
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
	VendorProfile    VendorProfile          `json:"vendor_profile"`
	Metrics          VendorDashboardMetrics `json:"metrics"`
	EventsThisWeek   []VendorEventSummary   `json:"events_this_week"`
	NewBookingAlerts []VendorJob            `json:"new_booking_alerts"`
	RecentPayouts    []VendorPayout         `json:"recent_payouts"`
	ActiveReadiness  []JobReadiness         `json:"active_readiness"`
	LastSyncedAt     time.Time              `json:"last_synced_at"`
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
	InvoiceNumber string  `json:"invoice_number"`
	Amount        float64 `json:"amount"`
	BankName      string  `json:"bank_name"`
	AccountHolder string  `json:"account_holder"`
	AccountNumber string  `json:"account_number"`
	InvoiceDocURL string  `json:"invoice_doc_url"`
	Notes         string  `json:"notes"`
}
