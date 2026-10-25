package adminops

func buildInitialAdminOpsData() ([]DailyTask, []RundownItem, []ClientInvoice) {
	tasks := []DailyTask{
		{
			ID:          "tsk-01",
			Title:       "Verifikasi Loading Katering Berkah Rasa di Dock Barat Gate C-2",
			EventTitle:  "Pernikahan Anisa & Rizky",
			DueTime:     "05:30 WIB",
			Priority:    "Tinggi",
			Completed:   true,
			AssignedPIC: "Dian Paramita",
		},
		{
			ID:          "tsk-02",
			Title:       "Food Tasting & Pemeriksaan Suhu Chafing Dish bersama Keluarga",
			EventTitle:  "Pernikahan Anisa & Rizky",
			DueTime:     "08:30 WIB",
			Priority:    "Tinggi",
			Completed:   false,
			AssignedPIC: "Dian Paramita",
		},
		{
			ID:          "tsk-03",
			Title:       "Konfirmasi Request Booking Vendor Dokumentasi Lumina Photo",
			EventTitle:  "Pernikahan Farhan & Nadia",
			DueTime:     "14:00 WIB",
			Priority:    "Sedang",
			Completed:   false,
			AssignedPIC: "Bayu Pratama",
		},
	}

	rundowns := []RundownItem{
		{
			ID:           "rd-01",
			EventID:      "ev-01",
			EventTitle:   "Pernikahan Anisa & Rizky",
			TimeSlot:     "07:30 - 09:00 WIB",
			SessionName:  "Prosesi Akad Nikah & Khutbah Nikah",
			CrewInCharge: "Dian Paramita & Tim Acara",
			Status:       "Selesai",
		},
		{
			ID:           "rd-02",
			EventID:      "ev-01",
			EventTitle:   "Pernikahan Anisa & Rizky",
			TimeSlot:     "10:30 - 11:00 WIB",
			SessionName:  "Kirab Pengantin & Pembukaan Tirai Buffet Utama",
			CrewInCharge: "Siti Anggraini & Rian Ardiansyah",
			Status:       "Berlangsung",
		},
	}

	invoices := []ClientInvoice{
		{
			ID:            "cinv-01",
			InvoiceNumber: "INV/CLI/2026/088",
			ClientName:    "Anisa Rahmawati & Rizky Aditya",
			TerminLabel:   "Pelunasan Tahap Akhir (30%)",
			Amount:        55500000,
			DueDate:       "2026-10-20",
			Status:        "Lunas",
		},
		{
			ID:            "cinv-02",
			InvoiceNumber: "INV/CLI/2026/094",
			ClientName:    "Clarissa Salim & Dimas Wicaksono",
			TerminLabel:   "Termin Kedua (40%)",
			Amount:        84000000,
			DueDate:       "2026-10-28",
			Status:        "Menunggu Konfirmasi Bank",
		},
	}

	return tasks, rundowns, invoices
}
