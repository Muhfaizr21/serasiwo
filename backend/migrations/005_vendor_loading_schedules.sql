-- =============================================================================
-- SerasiWO Production Schema & Seed for public.vendor_loading_schedules
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_loading_schedules (
    event_id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    dock_gate TEXT NOT NULL,
    max_vehicle_height TEXT NOT NULL,
    security_pass_code TEXT NOT NULL,
    staging_area TEXT NOT NULL,
    fleet_assigned TEXT NOT NULL,
    crew_count INTEGER NOT NULL DEFAULT 12,
    driver_lead TEXT NOT NULL,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_loading_schedules_vendor
    ON public.vendor_loading_schedules (vendor_id);

GRANT ALL ON TABLE public.vendor_loading_schedules TO anon, authenticated, service_role;

ALTER TABLE public.vendor_loading_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_loading_schedules_access" ON public.vendor_loading_schedules;
CREATE POLICY "vendor_loading_schedules_access" ON public.vendor_loading_schedules
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

INSERT INTO public.vendor_loading_schedules (
    event_id,
    vendor_id,
    dock_gate,
    max_vehicle_height,
    security_pass_code,
    staging_area,
    fleet_assigned,
    crew_count,
    driver_lead,
    slots,
    updated_at
)
VALUES
    (
        'ev-01',
        'vnd-berkah-rasa',
        'Dock Barat Gate C-2 (Akses Katering)',
        '3,8 Meter (Truk Box Chiller)',
        'TMII-WO-2510-08',
        'Koridor Servis B-1 & Pantri Ballroom Timur',
        '2 Unit Isuzu Elf Chiller (B 9821 TDF & B 9410 TDF)',
        18,
        'Supriyanto (0812-9988-1122)',
        '[
          {
            "id": "slot-01",
            "time": "04:30 WIB",
            "phase": "Kedatangan Armada",
            "title": "Truk Cold-Storage & Logistik Tiba di Loading Dock Barat",
            "detail": "Pemeriksaan surat jalan resmi SerasiWO oleh keamanan gedung dan penukaran kartu akses kru katering.",
            "pic": "Bayu Pratama (PIC Logistik WO)",
            "completed": true,
            "completed_at": "04:28 WIB",
            "note": "Armada B 9821 TDF masuk tepat waktu, suhu boks pendingin 4°C."
          },
          {
            "id": "slot-02",
            "time": "06:00 WIB",
            "phase": "Instalasi Jalur Buffet",
            "title": "Penataan 4 Meja Prasmanan Utama & 4 Pondokan VIP",
            "detail": "Pemasangan skirting meja, chafing dish elektrik, pemanas induksi, dan jalur antrean tamu dua sisi.",
            "pic": "Hendra Kusuma (Kapten Katering)",
            "completed": true,
            "completed_at": "05:55 WIB",
            "note": "Seluruh chafing dish dan jalur kabel pemanas terpasang aman."
          },
          {
            "id": "slot-03",
            "time": "08:30 WIB",
            "phase": "Uji Kelayakan & Suhu",
            "title": "Inspeksi Higienitas, Suhu Saji (>= 65°C), & Food Tasting Keluarga",
            "detail": "Pengecekan suhu hidangan berkuah dan daging bersama koordinator WO serta perwakilan keluarga mempelai.",
            "pic": "Dian Paramita (Lead Coordinator WO)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-04",
            "time": "10:00 WIB",
            "phase": "Operasional Jamuan",
            "title": "Seluruh Jalur Buffet & Gubukan Siap Saji (Full Standby)",
            "detail": "Seluruh 18 pramusaji mengenakan seragam lengkap, sarung tangan pangan, masker, dan penutup kepala.",
            "pic": "Siti Anggraini (PIC Meja VIP)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-05",
            "time": "14:30 WIB",
            "phase": "Bongkar & Serah Terima",
            "title": "Clearance Peralatan, Pengemasan Sisa Hidangan Keluarga, & Sanitasi Area",
            "detail": "Serah terima makanan lebih dalam wadah food-grade kepada keluarga dan pengangkutan kantong limbah mandiri.",
            "pic": "Bayu Pratama (PIC Logistik WO)",
            "completed": false,
            "note": ""
          }
        ]'::jsonb,
        NOW()
    ),
    (
        'ev-02',
        'vnd-berkah-rasa',
        'Basement Loading Zone B2 - Lift Barang 3',
        '3,2 Meter (Blindvan & Engkel Box)',
        'SSS-WO-2710-14',
        'Pre-Function Service Area Lantai 2',
        '2 Unit Mitsubishi Colt Diesel Chiller (B 9104 KTR)',
        14,
        'Rahmat Hidayat (0813-7766-5544)',
        '[
          {
            "id": "slot-201",
            "time": "13:00 WIB",
            "phase": "Kedatangan Armada",
            "title": "Armada Chiller Tiba di Basement B2 & Bongkar Peralatan Pemanas",
            "detail": "Pengangkutan peralatan buffet melalui Lift Barang 3 menuju lantai ballroom.",
            "pic": "Bayu Pratama (PIC Logistik WO)",
            "completed": true,
            "completed_at": "12:50 WIB",
            "note": "Akses Lift Barang 3 sudah diamankan oleh teknisi gedung."
          },
          {
            "id": "slot-202",
            "time": "15:00 WIB",
            "phase": "Instalasi Jalur Buffet",
            "title": "Dekorasi Meja Buffet Fusion & Penataan Dessert Cold Bar",
            "detail": "Instalasi unit chiller portabel untuk Pavlova dan hidangan penutup dingin.",
            "pic": "Hendra Kusuma (Kapten Katering)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-203",
            "time": "17:00 WIB",
            "phase": "Uji Kelayakan & Suhu",
            "title": "Pengecekan Suhu Tenderloin & Canape Pembuka bersama Tim WO",
            "detail": "Verifikasi tingkat kematangan daging dan kesiapan nampan keliling (pass-around).",
            "pic": "Maya Kartika (Lead Coordinator WO)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-204",
            "time": "18:30 WIB",
            "phase": "Operasional Jamuan",
            "title": "Pembukaan Jalur Jamuan Malam & Layanan Meja Keluarga",
            "detail": "Tim katering menjaga pengisian ulang (refill) hidangan setiap 20 menit.",
            "pic": "Siti Anggraini (PIC Meja VIP)",
            "completed": false,
            "note": ""
          }
        ]'::jsonb,
        NOW()
    ),
    (
        'ev-03',
        'vnd-berkah-rasa',
        'Gerbang Servis Selatan Plataran (Drop-Off Terjadwal)',
        '2,8 Meter (Armada Blindvan Pendingin)',
        'PLATARAN-WO-3010-03',
        'Dapur Pendamping Joglo Utama',
        '3 Unit Blindvan Chiller (B 8821 BRC)',
        12,
        'Mulyono (0812-3344-9900)',
        '[
          {
            "id": "slot-301",
            "time": "05:30 WIB",
            "phase": "Kedatangan Armada",
            "title": "Drop-Off Peralatan Keramik Sekar Jagad & Bahan Segar",
            "detail": "Bongkar muat terjadwal sebelum area taman disterilkan untuk sesi foto pagi.",
            "pic": "Budi Santoso (Lead Coordinator WO)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-302",
            "time": "08:00 WIB",
            "phase": "Instalasi Meja Bundar",
            "title": "Penataan Peralatan Makan Family Style di 60 Meja Tamu",
            "detail": "Sinkronisasi tata letak piring saji tengah dengan rangkaian bunga vendor dekorasi.",
            "pic": "Hendra Kusuma (Kapten Katering)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-303",
            "time": "10:00 WIB",
            "phase": "Operasional Jamuan",
            "title": "Penyajian Hidangan Royal Javanese Berjenjang",
            "detail": "Layanan pramusaji meja bundar VIP dan reguler sesuai urutan keluar hidangan.",
            "pic": "Siti Anggraini (PIC Meja VIP)",
            "completed": false,
            "note": ""
          },
          {
            "id": "slot-304",
            "time": "15:30 WIB",
            "phase": "Bongkar & Serah Terima",
            "title": "Inventarisasi Keramik Sekar Jagad & Pembersihan Area Joglo",
            "detail": "Pengecekan jumlah piring keramik utuh dan serah terima kebersihan area dapur pendamping.",
            "pic": "Bayu Pratama (PIC Logistik WO)",
            "completed": false,
            "note": ""
          }
        ]'::jsonb,
        NOW()
    )
ON CONFLICT (event_id) DO NOTHING;
