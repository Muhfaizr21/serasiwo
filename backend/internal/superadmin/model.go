package superadmin

type FinancialSummary struct {
	GrossRevenue          float64 `json:"gross_revenue"`
	TotalExpenses         float64 `json:"total_expenses"`
	NetProfit             float64 `json:"net_profit"`
	NetMarginPercentage   float64 `json:"net_margin_percentage"`
	ActiveProjectsCount   int     `json:"active_projects_count"`
	CompletedProjectsCount int    `json:"completed_projects_count"`
	TotalClientsCount     int     `json:"total_clients_count"`
}

type MonthlyPerformance struct {
	Month    string  `json:"month"`
	Omset    float64 `json:"omset"`
	Expenses float64 `json:"expenses"`
	Profit   float64 `json:"profit"`
}

type PipelineStage struct {
	Status string  `json:"status"`
	Count  int     `json:"count"`
	Value  float64 `json:"value"`
}

type OverviewData struct {
	Financials         FinancialSummary     `json:"financials"`
	MonthlyPerformance []MonthlyPerformance `json:"monthly_performance"`
	Pipeline           []PipelineStage      `json:"pipeline"`
}

type MasterEvent struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	Date             string   `json:"date"`
	Venue            string   `json:"venue"`
	Type             string   `json:"type"`
	Status           string   `json:"status"`
	ClientName       string   `json:"client_name"`
	Budget           float64  `json:"budget"`
	VendorsAssigned  []string `json:"vendors_assigned"`
	CollisionWarning bool     `json:"collision_warning"`
	CollisionNote    string   `json:"collision_note,omitempty"`
}

type OverrideEventRequest struct {
	NewDate string `json:"new_date"`
	Reason  string `json:"reason"`
}

type ClientRecord struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Phone          string  `json:"phone"`
	Email          string  `json:"email"`
	WeddingDate    string  `json:"wedding_date"`
	Venue          string  `json:"venue"`
	PackageName    string  `json:"package_name"`
	Budget         float64 `json:"budget"`
	ContractStatus string  `json:"contract_status"`
	Notes          string  `json:"notes"`
}

type VendorPartner struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Category        string  `json:"category"`
	PicName         string  `json:"pic_name"`
	Phone           string  `json:"phone"`
	Rating          float64 `json:"rating"`
	EventsCompleted int     `json:"events_completed"`
	BaseRate        string  `json:"base_rate"`
	Status          string  `json:"status"`
}

type AuditLog struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	Actor     string `json:"actor"`
	Action    string `json:"action"`
	Target    string `json:"target"`
	Note      string `json:"note"`
}
