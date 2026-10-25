-- =============================================================================
-- SerasiWO Production Seed & Constraints for public.vendor_payouts
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_payouts_invoice_no
    ON public.vendor_payouts (vendor_id, invoice_number);

INSERT INTO public.vendor_payouts (
    id,
    vendor_id,
    invoice_number,
    job_id,
    wedding_title,
    event_date,
    amount,
    bank_name,
    account_holder,
    account_number,
    invoice_doc_url,
    status,
    status_label,
    notes,
    submitted_at,
    disbursed_at
)
VALUES
    (
        'pay-01',
        'vnd-berkah-rasa',
        'INV/BRC/2026/098',
        'job-past-01',
        'Pernikahan Vina & Andre (Pelunasan 100%)',
        CURRENT_DATE - INTERVAL '10 days',
        38000000,
        'Bank Central Asia (BCA)',
        'CV Berkah Rasa Nusantara',
        '521-0988-123',
        'https://serasiwo.storage/invoices/inv-098-vina-andre.pdf',
        'dicairkan',
        'Dicairkan (Lunas)',
        'Pembayaran termin lunas via transfer RTGS BCA. Bukti transfer: TRF-BCA-998120.',
        NOW() - INTERVAL '9 days',
        NOW() - INTERVAL '7 days'
    ),
    (
        'pay-02',
        'vnd-berkah-rasa',
        'INV/BRC/2026/104',
        'job-02',
        'Pernikahan Tiara & Dimas (Termin DP 50%)',
        CURRENT_DATE + INTERVAL '2 days',
        18250000,
        'Bank Central Asia (BCA)',
        'CV Berkah Rasa Nusantara',
        '521-0988-123',
        'https://serasiwo.storage/invoices/inv-104-tiara-dp50.pdf',
        'diproses',
        'Sedang Diproses Keuangan WO',
        'Verifikasi rekening bank dan PO katering lolos, masuk antrian pencairan batch keuangan.',
        NOW() - INTERVAL '2 days',
        NULL
    ),
    (
        'pay-03',
        'vnd-berkah-rasa',
        'INV/BRC/2026/105',
        'job-01',
        'Pernikahan Anisa & Rizky (Pelunasan 100%)',
        CURRENT_DATE,
        42000000,
        'Bank Central Asia (BCA)',
        'CV Berkah Rasa Nusantara',
        '521-0988-123',
        'https://serasiwo.storage/invoices/inv-105-anisa-pelunasan.pdf',
        'tertunda',
        'Tertunda (Menunggu Verifikasi WO)',
        'Menunggu verifikasi berita acara serah terima katering hari ini dari Admin Operasional.',
        NOW() - INTERVAL '4 hours',
        NULL
    ),
    (
        'pay-04',
        'vnd-berkah-rasa',
        'INV/BRC/2026/091',
        'job-past-00',
        'Pernikahan Nadia & Reza (Pelunasan 100%)',
        CURRENT_DATE - INTERVAL '21 days',
        31500000,
        'Bank Central Asia (BCA)',
        'CV Berkah Rasa Nusantara',
        '521-0988-123',
        'https://serasiwo.storage/invoices/inv-091-nadia-reza.pdf',
        'dicairkan',
        'Dicairkan (Lunas)',
        'Lunas tepat waktu sesuai SLA H+2 acara selesai.',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '18 days'
    )
ON CONFLICT (id) DO NOTHING;
