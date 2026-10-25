import { useState, useEffect } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'

export function VendorModals() {
  const { activeModal, modalPayload, closeModal, showToast, reloadDashboard } = useVendor()

  const [blockDate, setBlockDate] = useState(() =>
    modalPayload?.date || new Date().toISOString().split('T')[0]
  )
  const [blockStatus, setBlockStatus] = useState(true)
  const [blockReason, setBlockReason] = useState('Full booked pesanan katering di luar WO')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [rejectionReason, setRejectionReason] = useState(
    'Kapasitas dapur katering dan armada telah penuh pada tanggal tersebut.'
  )

  const [invoiceNumber, setInvoiceNumber] = useState(() =>
    `INV/BRC/2026/${Math.floor(100 + Math.random() * 900)}`
  )
  const [invoiceAmount, setInvoiceAmount] = useState('42000000')
  const [invoiceJobTitle, setInvoiceJobTitle] = useState('Pernikahan Anisa & Rizky (Pelunasan 100%)')
  const [bankName, setBankName] = useState('Bank Central Asia (BCA)')
  const [accountNumber, setAccountNumber] = useState('521-0988-123')
  const [accountHolder, setAccountHolder] = useState('CV Berkah Rasa Nusantara')
  const [notes, setNotes] = useState('Lampiran berkas faktur resmi dan rekap menu terlampir.')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeModal])

  if (!activeModal) return null

  const handleBlockDateSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await vendorService.toggleDateBlock(blockDate, blockStatus, blockReason)
      showToast(
        blockStatus
          ? `Tanggal ${blockDate} berhasil diblokir untuk pesanan luar!`
          : `Blokir pada tanggal ${blockDate} telah dibuka kembali.`,
        'success'
      )
      reloadDashboard()
      closeModal()
    } catch (err) {
      showToast(err.message || 'Gagal mengatur ketersediaan tanggal', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJobDecisionSubmit = async (e) => {
    e.preventDefault()
    if (!modalPayload?.job) return
    setIsSubmitting(true)
    try {
      await vendorService.actionJob(modalPayload.job.id, 'tolak', rejectionReason)
      showToast('Pesanan pekerjaan telah ditolak dengan alasan yang tercatat.', 'success')
      reloadDashboard()
      closeModal()
    } catch {
      showToast('Gagal memproses penolakan pesanan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreatePayoutSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await vendorService.createPayout({
        invoice_number: invoiceNumber,
        wedding_title: invoiceJobTitle,
        amount: parseFloat(invoiceAmount),
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        invoice_doc_url: 'https://serasiwo.storage/invoices/uploaded-invoice.pdf',
        notes,
      })
      showToast('Invoice tagihan berhasil diunggah dan masuk antrian pencairan WO!', 'success')
      reloadDashboard()
      closeModal()
    } catch {
      showToast('Gagal mengunggah berkas tagihan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="vendor-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
      <div className="vendor-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vendor-modal-header">
          <h3 className="vendor-modal-title">
            {activeModal === 'block_date' && 'Kelola Ketersediaan / Blokir Tanggal'}
            {activeModal === 'job_decision' && 'Konfirmasi Penolakan Pesanan'}
            {activeModal === 'create_payout' && 'Unggah Invoice Tagihan Layanan'}
            {activeModal === 'kitchen_loading' && 'Jadwal Loading Dapur & Distribusi Logistik'}
            {activeModal === 'manifest_menu' && 'Surat Jalan & Rincian Menu Prasmanan'}
            {activeModal === 'field_pic' && 'Kontak Langsung PIC Koordinator Lapangan'}
            {activeModal === 'sop_standards' && 'SOP & Standar Mutu Pelayanan Katering'}
            {activeModal === 'vendor_profile' && 'Profil Mitra & Fasilitas Dapur Halal'}
            {activeModal === 'bank_account' && 'Data Rekening Bank Pencairan Dana'}
          </h3>
          <button
            type="button"
            className="vendor-modal-close"
            onClick={closeModal}
            aria-label="Tutup jendela modal"
          >
            ✕
          </button>
        </div>

        {activeModal === 'block_date' && (
          <form className="vendor-modal-body" onSubmit={handleBlockDateSubmit}>
            <p className="vendor-modal-desc">
              Gunakan fitur ini untuk memberi tahu SerasiWO bahwa kapasitas dapur mitra sedang penuh (full booked) oleh pesanan di luar WO.
            </p>

            <div className="vendor-modal-field">
              <label htmlFor="modal-block-date" className="vendor-field-label">Pilih Tanggal</label>
              <input
                id="modal-block-date"
                type="date"
                className="vendor-field-input"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                required
              />
            </div>

            <div className="vendor-modal-field">
              <span className="vendor-field-label">Status Ketersediaan</span>
              <div className="vendor-radio-group">
                <label className="vendor-radio-label">
                  <input
                    type="radio"
                    name="status"
                    checked={blockStatus === true}
                    onChange={() => setBlockStatus(true)}
                  />
                  <span>Blokir Tanggal (Penuh Pesanan Luar)</span>
                </label>
                <label className="vendor-radio-label">
                  <input
                    type="radio"
                    name="status"
                    checked={blockStatus === false}
                    onChange={() => setBlockStatus(false)}
                  />
                  <span>Buka Tanggal (Tersedia untuk Booking WO)</span>
                </label>
              </div>
            </div>

            <div className="vendor-modal-field">
              <label htmlFor="modal-block-reason" className="vendor-field-label">Alasan / Catatan untuk WO</label>
              <textarea
                id="modal-block-reason"
                className="vendor-field-textarea"
                rows="3"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Contoh: Full booked catering corporate di luar WO..."
                required={blockStatus}
              />
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-ember-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Ketersediaan'}
              </button>
            </div>
          </form>
        )}

        {activeModal === 'job_decision' && (
          <form className="vendor-modal-body" onSubmit={handleJobDecisionSubmit}>
            <p className="vendor-modal-desc">
              Anda akan menolak pesanan untuk <strong>{modalPayload?.job?.wedding_title}</strong>. Tim Operasional SerasiWO akan segera diberitahu untuk mencari alternatif mitra.
            </p>

            <div className="vendor-modal-field">
              <label htmlFor="modal-reject-reason" className="vendor-field-label">Alasan Penolakan</label>
              <textarea
                id="modal-reject-reason"
                className="vendor-field-textarea"
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="secondary-surface-btn job-reject-confirm-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Memproses...' : 'Konfirmasi Tolak Pesanan'}
              </button>
            </div>
          </form>
        )}

        {activeModal === 'create_payout' && (
          <form className="vendor-modal-body" onSubmit={handleCreatePayoutSubmit}>
            <p className="vendor-modal-desc">
              Unggah berkas invoice tagihan layanan katering untuk diproses pencairannya oleh bagian keuangan SerasiWO.
            </p>

            <div className="vendor-modal-grid-2">
              <div className="vendor-modal-field">
                <label htmlFor="modal-inv-no" className="vendor-field-label">Nomor Invoice</label>
                <input
                  id="modal-inv-no"
                  type="text"
                  className="vendor-field-input"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
              </div>

              <div className="vendor-modal-field">
                <label htmlFor="modal-inv-amt" className="vendor-field-label">Nominal Tagihan (IDR)</label>
                <input
                  id="modal-inv-amt"
                  type="number"
                  className="vendor-field-input"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="vendor-modal-field">
              <label htmlFor="modal-inv-title" className="vendor-field-label">Keterangan Pekerjaan / Acara</label>
              <input
                id="modal-inv-title"
                type="text"
                className="vendor-field-input"
                value={invoiceJobTitle}
                onChange={(e) => setInvoiceJobTitle(e.target.value)}
                required
              />
            </div>

            <div className="vendor-modal-grid-2">
              <div className="vendor-modal-field">
                <label htmlFor="modal-bank-name" className="vendor-field-label">Nama Bank</label>
                <input
                  id="modal-bank-name"
                  type="text"
                  className="vendor-field-input"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>

              <div className="vendor-modal-field">
                <label htmlFor="modal-acc-no" className="vendor-field-label">Nomor Rekening</label>
                <input
                  id="modal-acc-no"
                  type="text"
                  className="vendor-field-input"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="vendor-modal-field">
              <label htmlFor="modal-acc-holder" className="vendor-field-label">Nama Pemilik Rekening</label>
              <input
                id="modal-acc-holder"
                type="text"
                className="vendor-field-input"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
              />
            </div>

            <div className="vendor-modal-field">
              <label htmlFor="modal-inv-doc" className="vendor-field-label">Unggah Dokumen Invoice / Struk (PDF/Gambar)</label>
              <div className="vendor-upload-dropzone">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Klik untuk pilih berkas PDF invoice resmi</span>
                <span className="upload-file-name">invoice_berkah_rasa_anisa_rizky.pdf (1.4 MB)</span>
                <input id="modal-inv-doc" type="file" className="sr-only" />
              </div>
            </div>

            <div className="vendor-modal-field">
              <label htmlFor="modal-inv-notes" className="vendor-field-label">Catatan Tambahan</label>
              <input
                id="modal-inv-notes"
                type="text"
                className="vendor-field-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-ember-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Mengunggah...' : 'Unggah & Ajukan Payout'}
              </button>
            </div>
          </form>
        )}

        {activeModal === 'kitchen_loading' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Panduan waktu tiba armada dan akses dock loading dapur untuk pernikahan terdekat di Hotel Mulia Senayan (Sabtu, 24 Okt 2026).
            </p>

            <div className="operational-modal-timeline">
              <div className="op-timeline-item">
                <div className="op-time-badge">04:30 WIB</div>
                <div className="op-timeline-content">
                  <strong>Truk Logistik Tiba di Loading Dock Barat</strong>
                  <p>Akses gate khusus katering. Tim security venue akan memeriksa surat jalan resmi SerasiWO.</p>
                </div>
              </div>

              <div className="op-timeline-item">
                <div className="op-time-badge">06:00 WIB</div>
                <div className="op-timeline-content">
                  <strong>Pemasangan Pemanas Makanan (Chafing Dishes)</strong>
                  <p>Penataan meja prasmanan utama (1.200 porsi) dan setting 4 booth pondokan VIP di foyer utama.</p>
                </div>
              </div>

              <div className="op-timeline-item">
                <div className="op-time-badge">08:30 WIB</div>
                <div className="op-timeline-content">
                  <strong>Food Tasting & Uji Kelayakan Suhu</strong>
                  <p>Inspeksi oleh PIC SerasiWO bersama perwakilan keluarga sebelum tamu VIP memasuki ballroom.</p>
                </div>
              </div>

              <div className="op-timeline-item">
                <div className="op-time-badge">10:00 WIB</div>
                <div className="op-timeline-content">
                  <strong>Prasmanan & Stall Siap Saji (Standby)</strong>
                  <p>Seluruh kru katering telah berseragam rapi, memakai hairnet, sarung tangan, dan standby di pos masing-masing.</p>
                </div>
              </div>

              <div className="op-timeline-item">
                <div className="op-time-badge">14:30 WIB</div>
                <div className="op-timeline-content">
                  <strong>Clearance & Pembersihan Area Dapur</strong>
                  <p>Pengemasan perlengkapan katering, pembersihan sisa hidangan, dan serah terima kebersihan venue.</p>
                </div>
              </div>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="btn-ember-primary"
                onClick={() => {
                  showToast('Jadwal loading telah disinkronkan ke kalender kerja tim Anda.', 'success')
                  closeModal()
                }}
              >
                Pahami & Konfirmasi Jadwal
              </button>
            </div>
          </div>
        )}

        {activeModal === 'manifest_menu' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Surat jalan resmi katering untuk pengiriman hidangan pernikahan Anisa & Rizky di Grand Ballroom Hotel Mulia.
            </p>

            <div className="manifest-info-card">
              <div className="manifest-grid">
                <div>
                  <span className="manifest-label">Nomor Dokumen:</span>
                  <strong>SJ/BRC/2026/10/24-08</strong>
                </div>
                <div>
                  <span className="manifest-label">Nomor Polisi Armada:</span>
                  <strong>B 9821 TDF (Colt Diesel Box)</strong>
                </div>
                <div>
                  <span className="manifest-label">Driver Penanggung Jawab:</span>
                  <strong>Pak Supriyanto (0812-9988-1122)</strong>
                </div>
                <div>
                  <span className="manifest-label">Total Pesanan:</span>
                  <strong>1.200 Pax Prasmanan + 4 Stall Pondokan</strong>
                </div>
              </div>
            </div>

            <div className="manifest-menu-breakdown">
              <h4 className="manifest-subheading">Daftar Menu Hidangan Utama:</h4>
              <ul className="manifest-menu-list">
                <li>• Nasi Pandan Wangi & Nasi Putih Pilihan (1.200 porsi)</li>
                <li>• Rendang Daging Sapi Dapur Minang (1.200 porsi)</li>
                <li>• Ayam Bakar Madu Wijen Rempah (1.200 porsi)</li>
                <li>• Kakap Saus Asam Manis Nanas (1.200 porsi)</li>
                <li>• Sop Kimlo Pengantin Sari Mutiara (1.200 porsi)</li>
                <li>• Asinan Pengantin Jakarta & Aneka Kerupuk (1.200 porsi)</li>
                <li>• Stall VIP: Kambing Guling Rempah Timur (4 Ekor)</li>
                <li>• Stall Foyer: Zuppa Soup Speciale (500 cup)</li>
                <li>• Stall Dessert: Es Doger Bandung & Pudding Buah (800 cup)</li>
              </ul>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  showToast('Mengunduh berkas Surat Jalan format PDF...', 'success')
                }}
              >
                Unduh PDF Surat Jalan
              </button>
              <button
                type="button"
                className="btn-ember-primary"
                onClick={closeModal}
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        )}

        {activeModal === 'field_pic' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Hubungi koordinator lapangan SerasiWO yang bertugas langsung di lokasi acara untuk koordinasi teknis katering.
            </p>

            <div className="pic-contact-cards">
              <div className="pic-contact-item">
                <div className="pic-avatar-badge">DP</div>
                <div className="pic-details">
                  <strong>Dian Paramita</strong>
                  <span className="pic-role-tag">Lead Event Coordinator (Admin Ops)</span>
                  <span className="pic-phone-num">0812-3456-7890</span>
                </div>
                <div className="pic-direct-actions">
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noreferrer"
                    className="pic-action-link"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>

              <div className="pic-contact-item">
                <div className="pic-avatar-badge">BP</div>
                <div className="pic-details">
                  <strong>Bayu Pratama</strong>
                  <span className="pic-role-tag">PIC Logistik & Loading Ballroom</span>
                  <span className="pic-phone-num">0813-8877-6655</span>
                </div>
                <div className="pic-direct-actions">
                  <a
                    href="https://wa.me/6281388776655"
                    target="_blank"
                    rel="noreferrer"
                    className="pic-action-link"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            <div className="radio-channel-notice">
              <div className="radio-icon">📡</div>
              <div>
                <strong>Frekuensi Handy Talkie (HT) Lapangan:</strong>
                <p>Gunakan Channel 04 (Frekuensi 446.050 MHz) untuk koordinasi cepat saat acara berlangsung.</p>
              </div>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="btn-ember-primary"
                onClick={closeModal}
              >
                Kembali ke Portal
              </button>
            </div>
          </div>
        )}

        {activeModal === 'sop_standards' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Standar Operasional Prosedur (SOP) resmi yang wajib dipatuhi seluruh vendor katering rekanan SerasiWO.
            </p>

            <div className="sop-rules-list">
              <div className="sop-rule-box">
                <strong>1. Higienitas & Alat Pelindung Diri</strong>
                <p>Seluruh staf penyaji wajib menggunakan masker penutup hidung, sarung tangan khusus makanan sekali pakai, dan penutup rambut (hairnet).</p>
              </div>

              <div className="sop-rule-box">
                <strong>2. Ketepatan Waktu & Suhu Sajian</strong>
                <p>Seluruh hidangan buffet harus sudah siap saji dengan pemanas aktif minimal H-60 menit sebelum waktu undangan dibuka.</p>
              </div>

              <div className="sop-rule-box">
                <strong>3. Pengelolaan Sisa Makanan & Sampah Dapur</strong>
                <p>Minyak jelantah dan cairan limbah dilarang keras dibuang ke wastafel venue. Gunakan drum limbah khusus katering yang telah disediakan.</p>
              </div>

              <div className="sop-rule-box">
                <strong>4. Dress Code & Etika Layanan</strong>
                <p>Seragam kemeja hitam resmi bercelemek bersih, sepatu pantofel hitam tertutup, dan bersikap ramah dengan senyum salam kepada para tamu.</p>
              </div>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="btn-ember-primary"
                onClick={() => {
                  showToast('Terima kasih telah menyetujui kepatuhan SOP mutu SerasiWO.', 'success')
                  closeModal()
                }}
              >
                Saya Mengerti & Patuh SOP
              </button>
            </div>
          </div>
        )}

        {activeModal === 'vendor_profile' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Informasi profil legalitas dan dapur pusat Berkah Rasa Premium Catering pada sistem SerasiWO.
            </p>

            <div className="profile-spec-sheet">
              <div className="spec-row">
                <span className="spec-label">Nama Badan Usaha:</span>
                <span className="spec-val">CV Berkah Rasa Nusantara</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Kategori Layanan:</span>
                <span className="spec-val">Katering Pernikahan & Jamuan VIP</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Sertifikat Halal:</span>
                <span className="spec-val">ID3111000028911021 (MUI & BPJPH Aktif)</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Sertifikat Jasaboga:</span>
                <span className="spec-val">Higiene Sanitasi Dinkes Golongan B (Valid)</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Kapasitas Dapur:</span>
                <span className="spec-val">Hingga 5.000 porsi per hari</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Alamat Dapur Pusat:</span>
                <span className="spec-val">Jl. Danau Sunter Utara No. 42, Jakarta Utara</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Penilaian Kinerja SerasiWO:</span>
                <span className="spec-val">4.9 / 5.0 (52 Acara Sukses Tanpa Keluhan)</span>
              </div>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="btn-ember-primary"
                onClick={closeModal}
              >
                Tutup Profil
              </button>
            </div>
          </div>
        )}

        {activeModal === 'bank_account' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Rekening perbankan resmi yang digunakan SerasiWO untuk mentransfer termin dan pelunasan payout jasa katering Anda.
            </p>

            <div className="bank-account-card">
              <div className="bank-card-chip" />
              <div className="bank-card-brand">BANK CENTRAL ASIA</div>
              <div className="bank-card-number">5210 9881 2300</div>
              <div className="bank-card-details">
                <div>
                  <span className="bank-card-sub">NAMA REKENING</span>
                  <strong>CV BERKAH RASA NUSANTARA</strong>
                </div>
                <div>
                  <span className="bank-card-sub">KANTOR CABANG</span>
                  <strong>KCU SUNTER MALL</strong>
                </div>
              </div>
            </div>

            <div className="payout-schedule-note">
              <strong>Ketentuan Jadwal Pencairan SerasiWO:</strong>
              <p>Pencairan termin diproses setiap hari Rabu dan Jumat. Invoice yang telah diunggah diverifikasi dalam 1x24 jam kerja.</p>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  navigator.clipboard.writeText('521098812300')
                  showToast('Nomor rekening disalin ke clipboard!', 'success')
                }}
              >
                Salin Nomor Rekening
              </button>
              <button
                type="button"
                className="btn-ember-primary"
                onClick={closeModal}
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
