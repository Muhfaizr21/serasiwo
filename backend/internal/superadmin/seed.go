package superadmin

func buildInitialSuperAdminData() (OverviewData, []MasterEvent, []ClientRecord, []VendorPartner, []AuditLog) {
	overview := OverviewData{
		Financials: FinancialSummary{
			GrossRevenue:           840000000,
			TotalExpenses:          562000000,
			NetProfit:              278000000,
			NetMarginPercentage:    33.1,
			ActiveProjectsCount:    8,
			CompletedProjectsCount: 44,
			TotalClientsCount:      52,
		},
		MonthlyPerformance: []MonthlyPerformance{
			{Month: "Mei", Omset: 110000000, Expenses: 74000000, Profit: 36000000},
			{Month: "Jun", Omset: 135000000, Expenses: 90000000, Profit: 45000000},
			{Month: "Jul", Omset: 120000000, Expenses: 81000000, Profit: 39000000},
			{Month: "Agu", Omset: 155000000, Expenses: 104000000, Profit: 51000000},
			{Month: "Sep", Omset: 140000000, Expenses: 93000000, Profit: 47000000},
			{Month: "Okt", Omset: 180000000, Expenses: 120000000, Profit: 60000000},
		},
		Pipeline: []PipelineStage{
			{Status: "Terkonfirmasi (DP Masuk)", Count: 3, Value: 240000000},
			{Status: "Termin Kedua Berjalan", Count: 2, Value: 190000000},
			{Status: "Pelunasan & Hari-H", Count: 3, Value: 410000000},
		},
	}

	events := []MasterEvent{
		{
			ID:               "evt-2026-001",
			Title:            "Pernikahan Anisa & Rizky",
			Date:             "2026-10-24",
			Venue:            "Grand Ballroom Hotel Mulia Senayan",
			Type:             "Resepsi & Akad",
			Status:           "Hari-H Aktif",
			ClientName:       "Anisa Rahmawati",
			Budget:           185000000,
			VendorsAssigned:  []string{"Berkah Rasa Catering", "Diamond Decoration", "Lumina Photo"},
			CollisionWarning: false,
		},
		{
			ID:               "evt-2026-002",
			Title:            "Pernikahan Dimas & Clarissa",
			Date:             "2026-11-01",
			Venue:            "The Dharmawangsa Jakarta",
			Type:             "Akad & Jamuan Private",
			Status:           "Termin Kedua",
			ClientName:       "Dimas Wicaksono",
			Budget:           210000000,
			VendorsAssigned:  []string{"Berkah Rasa Catering", "Artisan Florist", "Soulmate Acoustic"},
			CollisionWarning: true,
			CollisionNote:    "Vendor katering memiliki tanggal blokir parsial di sistem mitra.",
		},
		{
			ID:               "evt-2026-003",
			Title:            "Pernikahan Farhan & Nadia",
			Date:             "2026-11-15",
			Venue:            "Sampoerna Strategic Square",
			Type:             "Resepsi Modern Intimate",
			Status:           "Terkonfirmasi DP",
			ClientName:       "Farhan Pratama",
			Budget:           165000000,
			VendorsAssigned:  []string{"Diamond Decoration", "Lumina Photo"},
			CollisionWarning: false,
		},
	}

	clients := []ClientRecord{
		{
			ID:             "cli-01",
			Name:           "Anisa Rahmawati & Rizky Aditya",
			Phone:          "0812-9988-7711",
			Email:          "anisa.rahmawati@gmail.com",
			WeddingDate:    "2026-10-24",
			Venue:          "Grand Ballroom Hotel Mulia Senayan",
			PackageName:    "Diamond Royal Wedding",
			Budget:         185000000,
			ContractStatus: "Lunas 100%",
			Notes:          "Konsep adat Jawa modern, kapasitas 1.200 porsi.",
		},
		{
			ID:             "cli-02",
			Name:           "Clarissa Salim & Dimas Wicaksono",
			Phone:          "0811-2233-4455",
			Email:          "clarissa.salim@yahoo.com",
			WeddingDate:    "2026-11-01",
			Venue:          "The Dharmawangsa Jakarta",
			PackageName:    "Platinum Heritage",
			Budget:         210000000,
			ContractStatus: "Termin Kedua (70%)",
			Notes:          "Intimate dinner party, live jazz band.",
		},
		{
			ID:             "cli-03",
			Name:           "Farhan Pratama & Nadia Larasati",
			Phone:          "0813-4455-6677",
			Email:          "farhan.pratama@outlook.com",
			WeddingDate:    "2026-11-15",
			Venue:          "Sampoerna Strategic Square",
			PackageName:    "Gold Intimate Elegance",
			Budget:         165000000,
			ContractStatus: "DP Masuk (30%)",
			Notes:          "Nuansa sage green dan pastel.",
		},
	}

	vendors := []VendorPartner{
		{
			ID:              "vnd-01",
			Name:            "Berkah Rasa Premium Catering",
			Category:        "Katering",
			PicName:         "Hendra Kusuma",
			Phone:           "0812-3456-7890",
			Rating:          4.9,
			EventsCompleted: 52,
			BaseRate:        "Rp 65.000.000 / 1.000 pax",
			Status:          "active",
		},
		{
			ID:              "vnd-02",
			Name:            "Diamond Royale Decoration",
			Category:        "Dekorasi & Florist",
			PicName:         "Sarah Wijaya",
			Phone:           "0817-8899-0011",
			Rating:          4.8,
			EventsCompleted: 46,
			BaseRate:        "Rp 55.000.000 / setup",
			Status:          "active",
		},
		{
			ID:              "vnd-03",
			Name:            "Lumina Wedding Photography",
			Category:        "Dokumentasi & Video",
			PicName:         "Bagus Pratama",
			Phone:           "0818-5544-3322",
			Rating:          4.9,
			EventsCompleted: 60,
			BaseRate:        "Rp 28.000.000 / paket cinematic",
			Status:          "active",
		},
	}

	logs := []AuditLog{
		{
			ID:        "log-01",
			Timestamp: "2026-10-24 19:40:12",
			Actor:     "Baskoro Adiwijaya (Super Admin)",
			Action:    "Force Override Jadwal Vendor",
			Target:    "Pernikahan Dimas & Clarissa (01 Nov 2026)",
			Note:      "Override jadwal bentrok katering Berkah Rasa disetujui atas permintaan khusus klien.",
		},
		{
			ID:        "log-02",
			Timestamp: "2026-10-24 16:15:00",
			Actor:     "Dian Paramita (Admin Operasional)",
			Action:    "Tandai Pembayaran Lunas",
			Target:    "Invoice Pelunasan Anisa & Rizky (INV/2026/088)",
			Note:      "Mutasi BCA masuk Rp 42.000.000 terverifikasi.",
		},
	}

	return overview, events, clients, vendors, logs
}
