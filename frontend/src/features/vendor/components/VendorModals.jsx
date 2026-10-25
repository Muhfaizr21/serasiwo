import { useState, useEffect } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import {
  downloadBankVerificationPdf,
  downloadLoadingPassPdf,
  downloadMenuManifestPdf,
  downloadVendorProfilePdf,
} from '../utils/vendorPdfGenerator'
import {
  VENDOR_LOADING_SCHEDULES,
  VENDOR_MENU_MANIFESTS,
} from '../data/vendorMockData'

export function VendorModals() {
  const {
    activeModal,
    modalPayload,
    closeModal,
    showToast,
    reloadDashboard,
    dashboardData,
  } = useVendor()
  const vendorData = dashboardData
  const [modalLoadingEventId, setModalLoadingEventId] = useState(
    () => modalPayload?.eventId || 'ev-01'
  )

  const [blockDate, setBlockDate] = useState(() =>
    modalPayload?.date || new Date().toISOString().split('T')[0]
  )
  const [blockStatus, setBlockStatus] = useState(() =>
    modalPayload?.isBlocked !== undefined ? modalPayload.isBlocked : true
  )
  const [blockReason, setBlockReason] = useState(() =>
    modalPayload?.reason || 'Full booked pesanan katering di luar WO'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [rejectionReason, setRejectionReason] = useState(
    'Kapasitas dapur katering dan armada telah penuh pada tanggal tersebut.'
  )

  const [selectedJobId, setSelectedJobId] = useState(() => modalPayload?.job?.id || 'job-03')
  const [invoiceNumber, setInvoiceNumber] = useState(() =>
    `INV/BRC/2026/${Math.floor(110 + Math.random() * 880)}`
  )
  const [invoiceAmount, setInvoiceAmount] = useState(() =>
    String(modalPayload?.job?.payout_amount || '29500000')
  )
  const [invoiceJobTitle, setInvoiceJobTitle] = useState(() =>
    modalPayload?.job?.wedding_title
      ? `${modalPayload.job.wedding_title} (Pelunasan 100%)`
      : 'Pernikahan Farah & Kevin (Pelunasan 100%)'
  )
  const [invoiceEventDate, setInvoiceEventDate] = useState(() =>
    modalPayload?.job?.event_date || new Date().toISOString().split('T')[0]
  )
  const [uploadedFileName, setUploadedFileName] = useState(
    'invoice_berkah_rasa_farah_kevin.pdf (1.2 MB)'
  )
  const [bankName, setBankName] = useState('Bank Central Asia (BCA)')
  const [accountNumber, setAccountNumber] = useState('521-0988-123')
  const [accountHolder, setAccountHolder] = useState('CV Berkah Rasa Nusantara')
  const [notes, setNotes] = useState('Lampiran berkas faktur resmi dan berita acara serah terima terlampir.')

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
      const slugDoc = uploadedFileName
        .split(' (')[0]
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase()
      await vendorService.createPayout({
        job_id: selectedJobId,
        invoice_number: invoiceNumber,
        wedding_title: invoiceJobTitle,
        event_date: invoiceEventDate,
        amount: parseFloat(invoiceAmount),
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        invoice_doc_url: `https://serasiwo.storage/invoices/${slugDoc || 'uploaded-invoice.pdf'}`,
        notes,
      })
      showToast(
        `Invoice ${invoiceNumber} berhasil diunggah ke database dan masuk antrian pencairan WO!`,
        'success'
      )
      reloadDashboard()
      closeModal()
    } catch (err) {
      showToast(err.message || 'Gagal mengunggah berkas tagihan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadingEvents = vendorData?.events_this_week || []
  const activeModalEvent =
    loadingEvents.find((ev) => ev.id === modalLoadingEventId) ||
    loadingEvents[0] ||
    null
  const activeModalSchedule =
    vendorData?.loading_schedules?.[activeModalEvent?.id || modalLoadingEventId] ||
    VENDOR_LOADING_SCHEDULES[activeModalEvent?.id || modalLoadingEventId] ||
    VENDOR_LOADING_SCHEDULES['ev-01']

  return (
    <div className="vendor-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
      <div
        className={`vendor-modal-card ${
          activeModal === 'kitchen_loading' || activeModal === 'manifest_menu'
            ? 'vendor-modal-wide'
            : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vendor-modal-header">
          <h3 className="vendor-modal-title">
            {activeModal === 'block_date' && 'Kelola Ketersediaan / Blokir Tanggal'}
            {activeModal === 'job_decision' && 'Konfirmasi Penolakan Pesanan'}
            {activeModal === 'create_payout' && 'Unggah Invoice Tagihan Layanan'}
            {activeModal === 'kitchen_loading' &&
              'Tiket Akses Loading Dock (SIM-D) & Ringkasan Rundown'}
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

            <div className="vendor-modal-grid-2">
              <div className="vendor-modal-field">
                <label htmlFor="modal-inv-job" className="vendor-field-label">Pilih Pekerjaan Acara</label>
                <select
                  id="modal-inv-job"
                  className="vendor-field-input"
                  value={selectedJobId}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setSelectedJobId(nextId)
                    const presetMap = {
                      'job-03': {
                        title: 'Pernikahan Farah & Kevin (Pelunasan 100%)',
                        amount: '29500000',
                        date: '2026-10-30',
                      },
                      'job-02': {
                        title: 'Pernikahan Tiara & Dimas (Pelunasan Sisa 50%)',
                        amount: '18250000',
                        date: '2026-10-27',
                      },
                      'job-01': {
                        title: 'Pernikahan Anisa & Rizky (Tambahan Stall VIP)',
                        amount: '8500000',
                        date: '2026-10-25',
                      },
                    }
                    const foundEv = (vendorData?.events_this_week || []).find(
                      (ev) => ev.job_id === nextId
                    )
                    if (presetMap[nextId]) {
                      setInvoiceJobTitle(presetMap[nextId].title)
                      setInvoiceAmount(presetMap[nextId].amount)
                      setInvoiceEventDate(presetMap[nextId].date)
                    } else if (foundEv) {
                      setInvoiceJobTitle(`${foundEv.wedding_title} (Tagihan Layanan)`)
                      setInvoiceEventDate(foundEv.event_date)
                    }
                  }}
                >
                  <option value="job-03">job-03 - Pernikahan Farah &amp; Kevin (600 Porsi)</option>
                  <option value="job-02">job-02 - Pernikahan Tiara &amp; Dimas (Sisa Termin 50%)</option>
                  <option value="job-01">job-01 - Pernikahan Anisa &amp; Rizky (1.200 Porsi)</option>
                  <option value="job-custom">Tagihan Layanan / Ad-hoc Lainnya</option>
                </select>
              </div>

              <div className="vendor-modal-field">
                <label htmlFor="modal-inv-date" className="vendor-field-label">Tanggal Pelaksanaan Acara</label>
                <input
                  id="modal-inv-date"
                  type="date"
                  className="vendor-field-input"
                  value={invoiceEventDate}
                  onChange={(e) => setInvoiceEventDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="vendor-modal-field">
              <label htmlFor="modal-inv-title" className="vendor-field-label">Keterangan Pekerjaan / Termin Acara</label>
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
              <label htmlFor="modal-inv-doc" className="vendor-upload-dropzone" style={{ cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Klik untuk pilih berkas PDF atau foto struk invoice resmi</span>
                <span className="upload-file-name">{uploadedFileName}</span>
                <input
                  id="modal-inv-doc"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const sizeKB = Math.max(1, Math.round(file.size / 1024))
                      setUploadedFileName(`${file.name} (${sizeKB} KB)`)
                    }
                  }}
                />
              </label>
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
              Ringkasan surat izin masuk loading dock (SIM-D), spesifikasi armada chiller, serta status verifikasi real-time untuk acara terpilih.
            </p>

            {loadingEvents.length > 0 && (
              <div className="vendor-filter-chips">
                {loadingEvents.map((ev) => {
                  const isSel =
                    (activeModalEvent?.id || modalLoadingEventId) === ev.id
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className={`filter-chip ${isSel ? 'filter-chip-active' : ''}`}
                      onClick={() => setModalLoadingEventId(ev.id)}
                    >
                      {ev.couple_short || ev.wedding_title}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="modal-pass-banner">
              <div className="modal-pass-field">
                <span className="modal-pass-label">Kode Akses SIM-D</span>
                <span className="modal-pass-val pass-code-highlight">
                  {activeModalSchedule.security_pass_code}
                </span>
              </div>
              <div className="modal-pass-field">
                <span className="modal-pass-label">Gerbang Loading &amp; Venue</span>
                <span className="modal-pass-val">
                  {activeModalSchedule.dock_gate} ({activeModalEvent?.venue || 'Ballroom'})
                </span>
              </div>
              <div className="modal-pass-field">
                <span className="modal-pass-label">Armada Chiller Terjadwal</span>
                <span className="modal-pass-val">
                  {activeModalSchedule.fleet_assigned}
                </span>
              </div>
              <div className="modal-pass-field">
                <span className="modal-pass-label">Pimpinan Sopir &amp; Kru</span>
                <span className="modal-pass-val">
                  {activeModalSchedule.driver_lead} • {activeModalSchedule.crew_count} Kru
                </span>
              </div>
            </div>

            <div className="operational-modal-timeline">
              {(activeModalSchedule.slots || []).map((slot) => (
                <div
                  key={slot.id}
                  className={`op-timeline-item ${
                    slot.completed ? 'timeline-item-done' : ''
                  }`}
                >
                  <div className="op-time-badge">{slot.time}</div>
                  <div className="op-timeline-content">
                    <div className="op-timeline-title-row">
                      <strong>{slot.title}</strong>
                      <span
                        className={`op-timeline-status-tag ${
                          slot.completed ? 'tag-done' : 'tag-pending'
                        }`}
                      >
                        {slot.completed
                          ? `✓ Terverifikasi ${
                              slot.completed_at ? `(${slot.completed_at})` : ''
                            }`
                          : 'Menunggu Eksekusi'}
                      </span>
                    </div>
                    <p>{slot.detail}</p>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      PIC Pengawas: {slot.pic}
                      {slot.note ? ` • Catatan: ${slot.note}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  downloadLoadingPassPdf(activeModalSchedule, activeModalEvent)
                  showToast(
                    `Surat Izin Masuk Dock (${activeModalSchedule.security_pass_code}.pdf) berhasil diunduh!`,
                    'success'
                  )
                }}
              >
                Unduh SIM-D (PDF)
              </button>
              <button
                type="button"
                className="btn-ember-primary"
                onClick={() => {
                  showToast('Jadwal loading telah disinkronkan ke kalender kerja tim Anda.', 'success')
                  closeModal()
                }}
              >
                Pahami &amp; Tutup Ringkasan
              </button>
            </div>
          </div>
        )}

        {activeModal === 'manifest_menu' && (() => {
          const eventsList = vendorData?.events_this_week || []
          const manifestsDict = vendorData?.menu_manifests || VENDOR_MENU_MANIFESTS
          const selectedEv =
            eventsList.find((e) => e.id === modalLoadingEventId) ||
            eventsList[0] || {
              id: 'ev-01',
              wedding_title: 'Pernikahan Anisa & Rizky',
              venue: 'Grand Ballroom Sasana Kriya, TMII',
              event_date: '2026-10-25',
              time_slot: '10:00 - 14:00 WIB',
            }
          const rawMf =
            manifestsDict[selectedEv.id] || VENDOR_MENU_MANIFESTS['ev-01']
          const normalizedMf = {
            event_id: rawMf?.event_id || selectedEv.id,
            manifest_number:
              rawMf?.manifest_number || rawMf?.doc_number || 'SJ/BRC/2026/10-081',
            package_name:
              rawMf?.package_name || rawMf?.buffet_package || 'Paket Agung Megah Nusantara',
            total_portions:
              rawMf?.total_portions || rawMf?.total_pax || 1200,
            vip_portions: rawMf?.vip_portions || 150,
            crew_portions: rawMf?.crew_portions || 80,
            departure_time:
              rawMf?.departure_time || rawMf?.departure_kitchen || '04:00 WIB dari Dapur Sentral',
            vehicle_plate:
              rawMf?.vehicle_plate || rawMf?.fleet_plate || 'B 9821 TDF (Isuzu Elf Chiller)',
            driver_phone:
              rawMf?.driver_phone || rawMf?.driver_name || 'Supriyanto (0812-9988-1122)',
            items: (rawMf?.items || []).map((it) => ({
              id: it.id,
              category: it.category || 'Buffet Utama',
              name: it.name || '-',
              qty: it.qty || it.portions || '-',
              serving_temp: it.serving_temp || it.temp_standard || 'Panas (>= 65°C)',
              qc_checked: Boolean(it.qc_checked),
              qc_checked_at: it.qc_checked_at || '',
              notes: it.notes || '',
            })),
          }

          return (
            <div className="vendor-modal-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '12px',
                }}
              >
                <p className="vendor-modal-desc" style={{ margin: 0 }}>
                  Surat jalan resmi katering untuk pengiriman hidangan{' '}
                  <strong>{selectedEv.wedding_title}</strong> di{' '}
                  <strong>{selectedEv.venue}</strong>.
                </p>

                {eventsList.length > 1 && (
                  <select
                    className="payout-form-input"
                    style={{ width: 'auto', minWidth: '220px', height: '40px' }}
                    value={selectedEv.id}
                    onChange={(e) => setModalLoadingEventId(e.target.value)}
                    aria-label="Pilih Acara Surat Jalan"
                  >
                    {eventsList.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.wedding_title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="manifest-info-card">
                <div className="manifest-grid">
                  <div>
                    <span className="manifest-label">Nomor Dokumen:</span>
                    <strong>{normalizedMf.manifest_number}</strong>
                  </div>
                  <div>
                    <span className="manifest-label">Nomor Polisi Armada:</span>
                    <strong>{normalizedMf.vehicle_plate}</strong>
                  </div>
                  <div>
                    <span className="manifest-label">Driver Penanggung Jawab:</span>
                    <strong>{normalizedMf.driver_phone}</strong>
                  </div>
                  <div>
                    <span className="manifest-label">Total Pesanan &amp; Paket:</span>
                    <strong>
                      {Number(normalizedMf.total_portions).toLocaleString('id-ID')} Pax •{' '}
                      {normalizedMf.package_name}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="manifest-menu-breakdown">
                <h4 className="manifest-subheading">
                  Daftar Komponen Hidangan ({normalizedMf.items.length} Menu):
                </h4>
                <ul className="manifest-menu-list">
                  {normalizedMf.items.map((item) => (
                    <li key={item.id}>
                      • <strong>[{item.category}]</strong> {item.name} ({item.qty} •{' '}
                      {item.serving_temp}){' '}
                      <strong
                        style={{
                          color: item.qc_checked ? '#15803d' : '#b83d00',
                        }}
                      >
                        {item.qc_checked ? '• LOLOS QC' : '• BELUM QC'}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="vendor-modal-actions">
                <button
                  type="button"
                  className="secondary-surface-btn"
                  onClick={() => {
                    downloadMenuManifestPdf(normalizedMf, selectedEv)
                    showToast(
                      `Surat Jalan ${normalizedMf.manifest_number} berhasil diunduh (PDF).`,
                      'success'
                    )
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
          )
        })()}

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
              <div className="radio-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                  <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
                </svg>
              </div>
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
              Lembar verifikasi resmi legalitas badan usaha, sertifikasi halal
              MUI/BPJPH, dan kapasitas dapur pusat{' '}
              <strong>
                {vendorData?.vendor_profile?.name ||
                  'Berkah Rasa Premium Catering'}
              </strong>{' '}
              pada sistem SerasiWO.
            </p>

            <div className="profile-spec-sheet">
              <div className="spec-row">
                <span className="spec-label">Nama Badan Usaha:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.legal_name ||
                    'CV Berkah Rasa Nusantara'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Kategori Layanan:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.category ||
                    'Katering Pernikahan & Jamuan VIP'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">NPWP &amp; NIB OSS:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.npwp_number ||
                    '02.841.992.1-043.000'}{' '}
                  / {vendorData?.vendor_profile?.nib_number || '9120300881421'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Sertifikat Halal:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.halal_cert ||
                    'ID3111000028911021 (MUI & BPJPH Aktif)'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Sertifikat Jasaboga:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.hygiene_cert ||
                    'Dinkes DKI Jakarta Golongan B (Valid)'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Kapasitas Dapur:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.kitchen_capacity ||
                    'Hingga 5.000 Porsi / Hari'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Armada &amp; Kru:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.fleet_info ||
                    '4 Unit Truk Box Isuzu Chiller'}{' '}
                  •{' '}
                  {vendorData?.vendor_profile?.service_crew_total ||
                    '65 Personel Tersertifikasi Higiene'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Penanggung Jawab (PIC):</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.pic_name || 'Hendra Kusuma'} (
                  {vendorData?.vendor_profile?.pic_role ||
                    'Direktur Operasional'}
                  ) •{' '}
                  {vendorData?.vendor_profile?.phone || '+62 812-3456-7890'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Alamat Dapur Pusat:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.kitchen_address ||
                    'Jl. Danau Sunter Utara No. 42, Jakarta Utara'}
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Penilaian Kinerja SerasiWO:</span>
                <span className="spec-val">
                  {vendorData?.vendor_profile?.rating || '4.9'} / 5.0 (
                  {vendorData?.vendor_profile?.completed_jobs || 52} Acara
                  Sukses Tanpa Keluhan)
                </span>
              </div>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  downloadVendorProfilePdf(vendorData?.vendor_profile)
                  showToast(
                    'Dokumen Company Profile & Sertifikasi (PDF) berhasil diunduh.',
                    'success'
                  )
                }}
              >
                Unduh Company Profile (PDF)
              </button>
              <button
                type="button"
                className="btn-ember-primary"
                onClick={closeModal}
              >
                Tutup Lembar Verifikasi
              </button>
            </div>
          </div>
        )}

        {activeModal === 'bank_account' && (
          <div className="vendor-modal-body">
            <p className="vendor-modal-desc">
              Rekening giro korporat resmi yang digunakan SerasiWO untuk
              mentransfer termin uang muka (DP) dan pelunasan payout jasa
              katering Anda.
            </p>

            <div className="bank-account-card">
              <div className="bank-card-chip" />
              <div className="bank-card-brand">
                {(
                  vendorData?.vendor_profile?.bank_name || 'BANK CENTRAL ASIA'
                ).toUpperCase()}
              </div>
              <div className="bank-card-number">
                {vendorData?.vendor_profile?.account_number || '521-0988-123'}
              </div>
              <div className="bank-card-details">
                <div>
                  <span className="bank-card-sub">NAMA REKENING</span>
                  <strong>
                    {(
                      vendorData?.vendor_profile?.account_holder ||
                      'CV BERKAH RASA NUSANTARA'
                    ).toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span className="bank-card-sub">KANTOR CABANG</span>
                  <strong>
                    {(
                      vendorData?.vendor_profile?.bank_branch ||
                      'KCU SUNTER MALL'
                    ).toUpperCase()}
                  </strong>
                </div>
              </div>
            </div>

            <div className="payout-schedule-note">
              <strong>Ketentuan Jadwal Pencairan SerasiWO:</strong>
              <p>
                Pencairan termin diproses setiap jadwal{' '}
                <strong>
                  {vendorData?.vendor_profile?.settlement_schedule ||
                    'Rabu & Jumat (14:00 WIB)'}
                </strong>
                . Invoice yang telah diunggah diverifikasi dalam 1x24 jam kerja.
              </p>
            </div>

            <div className="vendor-modal-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  const rawNum =
                    vendorData?.vendor_profile?.account_number_raw ||
                    '521098812300'
                  navigator.clipboard?.writeText(rawNum)
                  showToast(
                    `Nomor rekening (${rawNum}) disalin ke clipboard!`,
                    'success'
                  )
                }}
              >
                Salin Nomor Rekening
              </button>
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  downloadBankVerificationPdf(
                    vendorData?.vendor_profile,
                    vendorData?.recent_payouts || []
                  )
                  showToast(
                    'Surat Konfirmasi Rekening Giro (PDF) berhasil diunduh.',
                    'success'
                  )
                }}
              >
                Unduh Surat Konfirmasi (PDF)
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
