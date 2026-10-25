-- =============================================================================
-- SerasiWO Production Schema & Seed for public.vendor_readiness
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_readiness (
    job_id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    wedding_title TEXT NOT NULL,
    event_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    venue TEXT NOT NULL,
    portions INTEGER NOT NULL DEFAULT 0,
    unit_label TEXT NOT NULL DEFAULT 'Porsi',
    current_status TEXT NOT NULL DEFAULT 'Menunggu Persiapan',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_readiness_vendor_date
    ON public.vendor_readiness (vendor_id, event_date ASC);

GRANT ALL ON TABLE public.vendor_readiness TO anon, authenticated, service_role;

ALTER TABLE public.vendor_readiness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_readiness_access" ON public.vendor_readiness;
CREATE POLICY "vendor_readiness_access" ON public.vendor_readiness
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

INSERT INTO public.vendor_readiness (
    job_id,
    vendor_id,
    wedding_title,
    event_date,
    time_slot,
    venue,
    portions,
    unit_label,
    current_status,
    progress_percent,
    steps,
    last_updated
)
VALUES
    (
        'job-01',
        'vnd-berkah-rasa',
        'Pernikahan Anisa & Rizky',
        CURRENT_DATE,
        '10:00 - 14:00 WIB',
        'Grand Ballroom Sasana Kriya, TMII',
        1200,
        'Porsi Buffet Nusantara',
        'Loading & Pengangkutan',
        50,
        '[
          {
            "step_id": "step-1",
            "title": "Bahan Mentah Siap",
            "description": "Bahan pangan segar, bumbu marinasi, dan bahan basah selesai sortir serta pengecekan kualitas.",
            "completed": true,
            "completed_at": "2026-10-25T04:00:00Z",
            "updated_by": "Hendra Kusuma (Vendor)",
            "proof_note": "Semua daging sapi, ayam, dan sayuran organik telah lulus QC dapur sentral."
          },
          {
            "step_id": "step-2",
            "title": "Loading & Pengangkutan",
            "description": "Peralatan chafing dish, warmers, dan kontainer makanan termal telah dimuat ke armada mobil.",
            "completed": true,
            "completed_at": "2026-10-25T06:30:00Z",
            "updated_by": "Hendra Kusuma (Vendor)",
            "proof_note": "2 armada Isuzu Elf pendingin berangkat menuju Sasana Kriya jam 06:30 WIB."
          },
          {
            "step_id": "step-3",
            "title": "Standby di Venue",
            "description": "Tim katering tiba di venue, meja buffet terpasang, pemanas dinyalakan, dan plating siap.",
            "completed": false
          },
          {
            "step_id": "step-4",
            "title": "Selesai & Serah Terima",
            "description": "Layanan jamuan paripurna selesai, buffet dibersihkan, dan serah terima checklist dengan kru WO.",
            "completed": false
          }
        ]'::jsonb,
        NOW() - INTERVAL '30 minutes'
    ),
    (
        'job-02',
        'vnd-berkah-rasa',
        'Pernikahan Tiara & Dimas',
        CURRENT_DATE + INTERVAL '2 days',
        '18:30 - 21:30 WIB',
        'Sampoerna Strategic Square, Sudirman',
        850,
        'Porsi Fusion Western & Indonesian',
        'Bahan Mentah Siap',
        25,
        '[
          {
            "step_id": "step-1",
            "title": "Bahan Mentah Siap",
            "description": "Bahan pangan segar, bumbu marinasi, dan bahan basah selesai sortir serta pengecekan kualitas.",
            "completed": true,
            "completed_at": "2026-10-25T05:15:00Z",
            "updated_by": "Hendra Kusuma (Vendor)",
            "proof_note": "Daging tenderloin impor dan salmon segar sudah diterima di coolbox."
          },
          {
            "step_id": "step-2",
            "title": "Loading & Pengangkutan",
            "description": "Peralatan chafing dish, warmers, dan kontainer makanan termal telah dimuat ke armada mobil.",
            "completed": false
          },
          {
            "step_id": "step-3",
            "title": "Standby di Venue",
            "description": "Tim katering tiba di venue, meja buffet terpasang, pemanas dinyalakan, dan plating siap.",
            "completed": false
          },
          {
            "step_id": "step-4",
            "title": "Selesai & Serah Terima",
            "description": "Layanan jamuan paripurna selesai, buffet dibersihkan, dan serah terima checklist dengan kru WO.",
            "completed": false
          }
        ]'::jsonb,
        NOW() - INTERVAL '3 hours'
    ),
    (
        'job-03',
        'vnd-berkah-rasa',
        'Pernikahan Farah & Kevin',
        CURRENT_DATE + INTERVAL '5 days',
        '11:00 - 15:00 WIB',
        'Plataran Dharmawangsa',
        600,
        'Porsi Traditional Royal Javanese',
        'Menunggu Persiapan',
        0,
        '[
          {
            "step_id": "step-1",
            "title": "Bahan Mentah Siap",
            "description": "Bahan pangan segar, bumbu marinasi, dan bahan basah selesai sortir serta pengecekan kualitas.",
            "completed": false
          },
          {
            "step_id": "step-2",
            "title": "Loading & Pengangkutan",
            "description": "Peralatan chafing dish, warmers, dan kontainer makanan termal telah dimuat ke armada mobil.",
            "completed": false
          },
          {
            "step_id": "step-3",
            "title": "Standby di Venue",
            "description": "Tim katering tiba di venue, meja buffet terpasang, pemanas dinyalakan, dan plating siap.",
            "completed": false
          },
          {
            "step_id": "step-4",
            "title": "Selesai & Serah Terima",
            "description": "Layanan jamuan paripurna selesai, buffet dibersihkan, dan serah terima checklist dengan kru WO.",
            "completed": false
          }
        ]'::jsonb,
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (job_id) DO NOTHING;
