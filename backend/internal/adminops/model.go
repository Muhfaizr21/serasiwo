package adminops

type DailyTask struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	EventTitle  string `json:"event_title"`
	DueTime     string `json:"due_time"`
	Priority    string `json:"priority"`
	Completed   bool   `json:"completed"`
	AssignedPIC string `json:"assigned_pic"`
}

type RundownItem struct {
	ID          string `json:"id"`
	EventID     string `json:"event_id"`
	EventTitle  string `json:"event_title"`
	TimeSlot    string `json:"time_slot"`
	SessionName string `json:"session_name"`
	CrewInCharge string `json:"crew_in_charge"`
	Status      string `json:"status"`
}

type ClientInvoice struct {
	ID            string  `json:"id"`
	InvoiceNumber string  `json:"invoice_number"`
	ClientName    string  `json:"client_name"`
	TerminLabel   string  `json:"termin_label"`
	Amount        float64 `json:"amount"`
	DueDate       string  `json:"due_date"`
	Status        string  `json:"status"`
}

type DashboardData struct {
	CoordinatorName string          `json:"coordinator_name"`
	RoleNotice      string          `json:"role_notice"`
	DailyTasks      []DailyTask     `json:"daily_tasks"`
	ActiveRundowns  []RundownItem   `json:"active_rundowns"`
	ClientInvoices  []ClientInvoice `json:"client_invoices"`
}
