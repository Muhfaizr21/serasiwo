CREATE TABLE IF NOT EXISTS public.vendor_menu_manifests (
    event_id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL DEFAULT 'vnd-berkah-rasa',
    manifest_number TEXT NOT NULL,
    package_name TEXT NOT NULL,
    total_portions INTEGER NOT NULL DEFAULT 1000,
    vip_portions INTEGER NOT NULL DEFAULT 100,
    crew_portions INTEGER NOT NULL DEFAULT 80,
    departure_time TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    driver_phone TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_menu_manifests_vendor
    ON public.vendor_menu_manifests (vendor_id);

GRANT ALL ON TABLE public.vendor_menu_manifests TO anon, authenticated, service_role;

ALTER TABLE public.vendor_menu_manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_menu_manifests_access" ON public.vendor_menu_manifests;
CREATE POLICY "vendor_menu_manifests_access" ON public.vendor_menu_manifests
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

INSERT INTO public.vendor_menu_manifests (
    event_id,
    vendor_id,
    manifest_number,
    package_name,
    total_portions,
    vip_portions,
    crew_portions,
    departure_time,
    vehicle_plate,
    driver_phone,
    items,
    updated_at
)
VALUES
    (
        'ev-01',
        'vnd-berkah-rasa',
        'SJ/BRC/2026/10-081',
        'Paket Agung Megah Nusantara',
        1200,
        150,
        80,
        '04:00 WIB dari Dapur Sentral Tebet',
        'B 9821 TDF & B 9410 TDF (Isuzu Elf Chiller)',
        'Supriyanto (0812-9988-1122)',
        '[
          {
            "id": "m-01",
            "category": "Buffet Utama",
            "name": "Nasi Putih Pandan Wangi & Nasi Goreng Kecombrang",
            "qty": "1.200 Porsi",
            "serving_temp": "Panas (>= 68°C)",
            "qc_checked": true,
            "qc_checked_at": "03:45 WIB",
            "notes": "8 termos nasi kapasitas besar + 6 chafing dish."
          },
          {
            "id": "m-02",
            "category": "Buffet Utama",
            "name": "Selat Solo Daging Sapi Has Dalam (Tenderloin)",
            "qty": "1.200 Porsi",
            "serving_temp": "Kuah Panas (>= 72°C)",
            "qc_checked": true,
            "qc_checked_at": "03:50 WIB",
            "notes": "Kuah semur dipisah dalam kontainer termal stainless."
          },
          {
            "id": "m-03",
            "category": "Buffet Utama",
            "name": "Ayam Bakar Taliwang Madu & Sambal Beberuk",
            "qty": "1.200 Porsi",
            "serving_temp": "Panas (>= 65°C)",
            "qc_checked": true,
            "qc_checked_at": "03:52 WIB",
            "notes": "Bumbu oles cadangan 4 jerigen food-grade."
          },
          {
            "id": "m-04",
            "category": "Buffet Utama",
            "name": "Kakap Asam Manis Nanas Madu & Capcay Seafood",
            "qty": "1.200 Porsi",
            "serving_temp": "Panas (>= 65°C)",
            "qc_checked": true,
            "qc_checked_at": "03:55 WIB",
            "notes": "Saus asam manis dituang 20 menit sebelum acara."
          },
          {
            "id": "m-05",
            "category": "Stall Pondokan",
            "name": "Kambing Guling Muda Utuh + Lontong & Saus Kecap",
            "qty": "450 Porsi (3 Ekor)",
            "serving_temp": "Live Carving (>= 75°C)",
            "qc_checked": true,
            "qc_checked_at": "03:58 WIB",
            "notes": "3 pemanggang arang smokeless + 2 chef carving khusus."
          },
          {
            "id": "m-06",
            "category": "Stall Pondokan",
            "name": "Empal Gentong Cirebon & Sate Maranggi Purwakarta",
            "qty": "500 Porsi",
            "serving_temp": "Kuah Mendidih (>= 75°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Kuali tanah liat pemanas gas portable."
          },
          {
            "id": "m-07",
            "category": "Stall Pondokan",
            "name": "Zuppa Soup Creamy Mushroom & Chicken",
            "qty": "400 Cup",
            "serving_temp": "Oven Panas (180°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Membawa 2 unit deck oven listrik 3.500 Watt."
          },
          {
            "id": "m-08",
            "category": "Dessert & Minuman",
            "name": "Es Puter Kelapa Muda, Buah Segar Potong, & Puding Vla",
            "qty": "1.200 Porsi",
            "serving_temp": "Dingin (<= 4°C)",
            "qc_checked": true,
            "qc_checked_at": "03:40 WIB",
            "notes": "Dry ice & tabung garam pendingin siap."
          }
        ]'::jsonb,
        NOW()
    ),
    (
        'ev-02',
        'vnd-berkah-rasa',
        'SJ/BRC/2026/10-084',
        'Paket Western & Indonesian Fusion',
        850,
        100,
        60,
        '12:00 WIB dari Dapur Sentral Tebet',
        'B 9104 KTR (Mitsubishi Colt Diesel Chiller)',
        'Rahmat Hidayat (0813-7766-5544)',
        '[
          {
            "id": "m-201",
            "category": "Buffet Utama",
            "name": "Butter Herb Rice & Roasted Baby Potatoes",
            "qty": "850 Porsi",
            "serving_temp": "Panas (>= 65°C)",
            "qc_checked": true,
            "qc_checked_at": "11:20 WIB",
            "notes": "Garnish rosemary segar disiapkan terpisah."
          },
          {
            "id": "m-202",
            "category": "Buffet Utama",
            "name": "Roasted Australian Beef Tenderloin Blackpepper",
            "qty": "850 Porsi",
            "serving_temp": "Medium Well (>= 68°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Saus mushroom & blackpepper dipisah."
          },
          {
            "id": "m-203",
            "category": "Stall Pondokan",
            "name": "Norwegian Salmon En Croute (Salmon Wellington)",
            "qty": "350 Porsi",
            "serving_temp": "Fresh Baked (>= 70°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Dipanggang bertahap di pantri ballroom."
          },
          {
            "id": "m-204",
            "category": "Dessert & Minuman",
            "name": "Berry Pavlova Bar, Assorted French Pastry, & Infused Water",
            "qty": "850 Porsi",
            "serving_temp": "Chiller (2°C - 5°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Unit showcase chiller tiba pukul 13:00 WIB."
          }
        ]'::jsonb,
        NOW()
    ),
    (
        'ev-03',
        'vnd-berkah-rasa',
        'SJ/BRC/2026/10-089',
        'Paket Traditional Royal Javanese',
        600,
        80,
        50,
        '04:45 WIB dari Dapur Sentral Tebet',
        'B 8821 BRC (Blindvan Chiller)',
        'Mulyono (0812-3344-9900)',
        '[
          {
            "id": "m-301",
            "category": "Buffet Utama",
            "name": "Nasi Liwet Solo, Ayam Kampung Suwir, & Areh Santan",
            "qty": "600 Porsi",
            "serving_temp": "Panas (>= 68°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Plating piring keramik Sekar Jagad."
          },
          {
            "id": "m-302",
            "category": "Buffet Utama",
            "name": "Dendeng Age, Sambal Goreng Krecek, & Gudeg Manggar",
            "qty": "600 Porsi",
            "serving_temp": "Panas (>= 68°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Krecek dimasukkan mendekati jam makan agar tidak hancur."
          },
          {
            "id": "m-303",
            "category": "Stall Pondokan",
            "name": "Tengkleng Klewer & Sate Buntel Solo",
            "qty": "300 Porsi",
            "serving_temp": "Panas (>= 72°C)",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Bumbu kecap bawang merah iris segar."
          },
          {
            "id": "m-304",
            "category": "Dessert & Minuman",
            "name": "Wedang Ronde Jahe Merah & Es Dawet Ayu Banjarnegara",
            "qty": "600 Porsi",
            "serving_temp": "Panas & Dingin",
            "qc_checked": false,
            "qc_checked_at": "",
            "notes": "Gula aren cair organik."
          }
        ]'::jsonb,
        NOW()
    )
ON CONFLICT (event_id) DO NOTHING;
