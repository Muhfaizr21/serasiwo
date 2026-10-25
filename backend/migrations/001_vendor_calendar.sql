-- =============================================================================
-- SerasiWO Production Schema Migration for Supabase PostgreSQL
-- Mengikuti standar: supabase-postgres-best-practices & supabase skill
-- =============================================================================

-- 1. Tabel Acara Resmi WO (vendor_events)
CREATE TABLE IF NOT EXISTS public.vendor_events (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    job_id TEXT NOT NULL,
    wedding_title TEXT NOT NULL,
    bride_groom TEXT NOT NULL,
    event_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    venue TEXT NOT NULL,
    location_city TEXT NOT NULL DEFAULT 'Jakarta',
    portions_or_units INTEGER NOT NULL DEFAULT 0,
    portion_unit_label TEXT NOT NULL DEFAULT 'Porsi Buffet',
    readiness_status TEXT NOT NULL DEFAULT 'Dikonfirmasi',
    readiness_percent INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_events_vendor_date
    ON public.vendor_events (vendor_id, event_date);

-- 2. Tabel Blokir Tanggal & Ketersediaan Kalender (vendor_date_blocks)
CREATE TABLE IF NOT EXISTS public.vendor_date_blocks (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    block_date DATE NOT NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT true,
    reason TEXT NOT NULL DEFAULT '',
    is_wo_event BOOLEAN NOT NULL DEFAULT false,
    event_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_block_date UNIQUE (vendor_id, block_date)
);

CREATE INDEX IF NOT EXISTS idx_vendor_date_blocks_vendor_date
    ON public.vendor_date_blocks (vendor_id, block_date);

-- 3. Tabel Manajemen Pekerjaan / Jobs (vendor_jobs)
CREATE TABLE IF NOT EXISTS public.vendor_jobs (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    event_id TEXT NOT NULL,
    wedding_title TEXT NOT NULL,
    bride_groom TEXT NOT NULL,
    event_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    venue TEXT NOT NULL,
    venue_address TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Katering',
    package_name TEXT NOT NULL,
    portions INTEGER NOT NULL DEFAULT 0,
    portion_unit_label TEXT NOT NULL DEFAULT 'Porsi Buffet',
    menu_or_notes TEXT NOT NULL DEFAULT '',
    special_request TEXT NOT NULL DEFAULT '',
    payout_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'menunggu',
    decision_note TEXT NOT NULL DEFAULT '',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_jobs_vendor_status
    ON public.vendor_jobs (vendor_id, status);

-- 4. Tabel Penagihan & Payout Mitra (vendor_payouts)
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    invoice_number TEXT NOT NULL,
    job_id TEXT NOT NULL,
    wedding_title TEXT NOT NULL,
    event_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    bank_name TEXT NOT NULL DEFAULT 'Bank Central Asia (BCA)',
    account_holder TEXT NOT NULL DEFAULT 'CV Berkah Rasa Nusantara',
    account_number TEXT NOT NULL DEFAULT '521-0988-123',
    invoice_doc_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'tertunda',
    status_label TEXT NOT NULL DEFAULT 'Tertunda (Menunggu Verifikasi WO)',
    notes TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disbursed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor_submitted
    ON public.vendor_payouts (vendor_id, submitted_at DESC);

-- 5. Ekspos ke Data API & Aktifkan Row Level Security (RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vendor_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vendor_date_blocks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vendor_jobs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vendor_payouts TO anon, authenticated, service_role;

ALTER TABLE public.vendor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_date_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk akses aplikasi (SELECT, INSERT, UPDATE)
DROP POLICY IF EXISTS "vendor_events_access" ON public.vendor_events;
CREATE POLICY "vendor_events_access" ON public.vendor_events
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vendor_date_blocks_access" ON public.vendor_date_blocks;
CREATE POLICY "vendor_date_blocks_access" ON public.vendor_date_blocks
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vendor_jobs_access" ON public.vendor_jobs;
CREATE POLICY "vendor_jobs_access" ON public.vendor_jobs
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vendor_payouts_access" ON public.vendor_payouts;
CREATE POLICY "vendor_payouts_access" ON public.vendor_payouts
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

-- 6. Data Awal (Initial Seed) Kalender & Acara SerasiWO
INSERT INTO public.vendor_events (id, vendor_id, job_id, wedding_title, bride_groom, event_date, time_slot, venue, location_city, portions_or_units, portion_unit_label, readiness_status, readiness_percent, note)
VALUES
    ('ev-01', 'vnd-berkah-rasa', 'job-01', 'Pernikahan Anisa & Rizky', 'Anisa Maharani & Rizky Pratama', CURRENT_DATE, '10:00 - 14:00 WIB', 'Grand Ballroom Sasana Kriya, TMII', 'Jakarta Timur', 1200, 'Porsi Buffet Nusantara', 'Loading', 50, 'Menu utama Selat Solo & Kambing Guling. Kru standby pukul 07:00 WIB.'),
    ('ev-02', 'vnd-berkah-rasa', 'job-02', 'Pernikahan Tiara & Dimas', 'Tiara Salsabila & Dimas Anggara', CURRENT_DATE + INTERVAL '2 days', '18:30 - 21:30 WIB', 'Sampoerna Strategic Square, Sudirman', 'Jakarta Selatan', 850, 'Porsi Fusion Western & Indonesian', 'Bahan Mentah Siap', 25, 'Pastikan dessert station cold storage aktif sebelum pukul 16:00 WIB.'),
    ('ev-03', 'vnd-berkah-rasa', 'job-03', 'Pernikahan Farah & Kevin', 'Farah Nabila & Kevin Sanjaya', CURRENT_DATE + INTERVAL '5 days', '11:00 - 15:00 WIB', 'Plataran Dharmawangsa', 'Jakarta Selatan', 600, 'Porsi Traditional Royal Javanese', 'Konfirmasi Pesanan', 10, 'Memerlukan plating keramik motif sekar jagad dari vendor dekorasi.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendor_date_blocks (id, vendor_id, block_date, is_blocked, reason, is_wo_event, event_name)
VALUES
    ('blk-01', 'vnd-berkah-rasa', CURRENT_DATE + INTERVAL '8 days', true, 'Full booked pesanan catering eksternal PT Bank Mandiri', false, ''),
    ('blk-02', 'vnd-berkah-rasa', CURRENT_DATE + INTERVAL '9 days', true, 'Full booked acara pernikahan non-WO di Sentul International', false, ''),
    ('blk-wo-01', 'vnd-berkah-rasa', CURRENT_DATE, true, 'Jadwal Acara SerasiWO: Pernikahan Anisa & Rizky', true, 'Anisa & Rizky (1.200 Porsi)'),
    ('blk-wo-02', 'vnd-berkah-rasa', CURRENT_DATE + INTERVAL '2 days', true, 'Jadwal Acara SerasiWO: Pernikahan Tiara & Dimas', true, 'Tiara & Dimas (850 Porsi)')
ON CONFLICT (vendor_id, block_date) DO NOTHING;
