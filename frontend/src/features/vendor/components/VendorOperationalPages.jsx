import { useState, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatRupiah, formatLongDateID, formatShortDateID } from '../utils/vendorFormatters'
import {
  VENDOR_FIELD_PICS,
  VENDOR_LOADING_SCHEDULES,
  VENDOR_MENU_MANIFESTS,
  VENDOR_SOP_CHECKLIST,
} from '../data/vendorMockData'

export function KitchenLoadingPage() {
  const { dashboardData, showToast, openModal, reloadDashboard } = useVendor()
  const events = useMemo(
    () => dashboardData?.events_this_week || [],
    [dashboardData]
  )
  const loadingSchedules = useMemo(
    () => dashboardData?.loading_schedules || VENDOR_LOADING_SCHEDULES,
    [dashboardData]
  )

  const [selectedEventId, setSelectedEventId] = useState('ev-01')
  const [slotFilter, setSlotFilter] = useState('semua')

  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null
  }, [events, selectedEventId])

  const currentSchedule = useMemo(() => {
    const id = activeEvent?.id || selectedEventId
    return loadingSchedules[id] || VENDOR_LOADING_SCHEDULES['ev-01']
  }, [activeEvent, loadingSchedules, selectedEventId])

  const slots = useMemo(() => currentSchedule?.slots || [], [currentSchedule])

  const filteredSlots = useMemo(() => {
    if (slotFilter === 'selesai') return slots.filter((s) => s.completed)
    if (slotFilter === 'menunggu') return slots.filter((s) => !s.completed)
    return slots
  }, [slots, slotFilter])

  const stats = useMemo(() => {
    const total = slots.length
    const completed = slots.filter((s) => s.completed).length
    const percent = total > 0 ? Math.round((completed * 100) / total) : 0
    return { total, completed, pending: total - completed, percent }
  }, [slots])

  const handleToggleSlot = async (slotId, title) => {
    const targetEventId = activeEvent?.id || selectedEventId
    try {
      await vendorService.toggleLoadingSlot(targetEventId, slotId)
      await reloadDashboard()
      showToast(`Status tahapan "${title}" berhasil diperbarui.`, 'success')
    } catch {
      showToast('Gagal memperbarui tahapan loading.', 'error')
    }
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Dukungan Operasional</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Jadwal Loading Dapur</span>
          </div>
          <h1 className="vendor-main-title">Jadwal Loading Dapur &amp; Distribusi Logistik</h1>
          <p className="vendor-header-subtitle">
            Alokasi pintu loading dock gedung, jadwal kedatangan armada chiller, serta verifikasi tahapan instalasi prasmanan di lokasi.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Dock Pass: <strong>{currentSchedule.security_pass_code}</strong>
            </span>
          </div>
          <div className="vendor-status-chip chip-amber">
            <span className="chip-indicator amber-dot" />
            <span>
              Progres Tahapan: <strong>{stats.completed}/{stats.total} Selesai ({stats.percent}%)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Event Switcher & Action Bar */}
      <div className="op-toolbar-card">
        <div className="op-event-selector-group" role="tablist" aria-label="Pilih Acara Pernikahan">
          <span className="op-selector-caption">Pilih Jadwal Acara:</span>
          <div className="op-event-pills">
            {events.map((ev) => {
              const isSelected = (activeEvent?.id || selectedEventId) === ev.id
              return (
                <button
                  key={ev.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`op-event-pill-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedEventId(ev.id)}
                >
                  <span className="op-event-pill-title">{ev.couple_short || ev.wedding_title}</span>
                  <span className="op-event-pill-sub">{formatShortDateID(ev.event_date)} • {ev.portions_or_units} Pax</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="op-toolbar-actions">
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={() =>
              showToast(
                `Surat Izin Masuk Dock (${currentSchedule.security_pass_code}.pdf) berhasil diunduh.`,
                'success'
              )
            }
          >
            Unduh SIM-D (PDF)
          </button>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('kitchen_loading')}
          >
            Ringkasan Cepat
          </button>
        </div>
      </div>

      {/* Technical Specification KPI Strip */}
      <div className="op-kpi-grid-4">
        <div className="op-kpi-box">
          <span className="op-kpi-label">GERBANG LOADING &amp; LIFT BARANG</span>
          <strong className="op-kpi-val">{currentSchedule.dock_gate}</strong>
          <span className="op-kpi-sub">{activeEvent?.venue || 'Ballroom Hotel Mulia, Senayan'}</span>
        </div>

        <div className="op-kpi-box">
          <span className="op-kpi-label">BATAS TINGGI &amp; ARMADA TERJADWAL</span>
          <strong className="op-kpi-val">{currentSchedule.max_vehicle_height}</strong>
          <span className="op-kpi-sub">{currentSchedule.fleet_assigned}</span>
        </div>

        <div className="op-kpi-box">
          <span className="op-kpi-label">AREA STAGING &amp; PANTRI</span>
          <strong className="op-kpi-val">{currentSchedule.staging_area}</strong>
          <span className="op-kpi-sub">Pimpinan Sopir: {currentSchedule.driver_lead}</span>
        </div>

        <div className="op-kpi-box">
          <span className="op-kpi-label">KEKUATAN PERSONEL LAPANGAN</span>
          <strong className="op-kpi-val text-green">{currentSchedule.crew_count} Kru Tersertifikasi</strong>
          <span className="op-kpi-sub">Jadwal Resepsi: {activeEvent?.time_slot || '11:00 - 15:00 WIB'}</span>
        </div>
      </div>

      {/* Interactive Timeline Section */}
      <div className="op-detail-section">
        <div className="op-section-header-row">
          <div>
            <h2 className="op-section-heading">
              Rundown Teknis Bongkar Muat &amp; Penataan Buffet ({activeEvent?.wedding_title})
            </h2>
            <p className="op-section-desc">
              Klik tombol status pada setiap jam tahapan untuk mencatat penyelesaian aktual di lapangan dan menyinkronkannya ke ruang komando WO.
            </p>
          </div>

          <div className="op-filter-pills" role="group" aria-label="Filter Tahapan Loading">
            {[
              { id: 'semua', label: `Semua (${stats.total})` },
              { id: 'selesai', label: `Selesai (${stats.completed})` },
              { id: 'menunggu', label: `Menunggu (${stats.pending})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`op-mini-filter-btn ${slotFilter === tab.id ? 'active' : ''}`}
                onClick={() => setSlotFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="op-progress-track-bar" aria-label="Progres penyelesaian loading">
          <div className="op-progress-fill" style={{ width: `${stats.percent}%` }} />
        </div>

        {filteredSlots.length === 0 ? (
          <div className="op-empty-state">
            <strong>Tidak ada tahapan pada filter ini</strong>
            <p>Ubah filter status di atas untuk menampilkan daftar tahapan loading dapur.</p>
            <button
              type="button"
              className="secondary-surface-btn"
              onClick={() => setSlotFilter('semua')}
            >
              Tampilkan Semua Tahapan
            </button>
          </div>
        ) : (
          <div className="op-timeline-detailed-list">
            {filteredSlots.map((slot) => (
              <div
                key={slot.id}
                className={`op-timeline-step-card ${slot.completed ? 'is-completed' : ''}`}
              >
                <div className="step-time-column">
                  <span className="step-time-pillar">{slot.time}</span>
                  <span className="step-phase-caption">{slot.phase}</span>
                </div>

                <div className="step-info-body">
                  <div className="step-title-row">
                    <strong>{slot.title}</strong>
                    <span className={`op-badge-status ${slot.completed ? 'done' : 'pending'}`}>
                      {slot.completed ? 'Terverifikasi' : 'Menunggu Eksekusi'}
                    </span>
                  </div>
                  <p>{slot.detail}</p>
                  <div className="step-meta-footer">
                    <span className="step-tag-pill">PIC Pengawas: {slot.pic}</span>
                  </div>
                </div>

                <div className="step-action-column">
                  <button
                    type="button"
                    className={`op-check-toggle-btn ${slot.completed ? 'checked' : ''}`}
                    onClick={() => handleToggleSlot(slot.id, slot.title)}
                  >
                    {slot.completed ? '✓ Sudah Selesai' : 'Tandai Selesai'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function MenuManifestPage() {
  const { dashboardData, showToast, openModal, reloadDashboard } = useVendor()
  const events = useMemo(
    () => dashboardData?.events_this_week || [],
    [dashboardData]
  )
  const menuManifests = useMemo(
    () => dashboardData?.menu_manifests || VENDOR_MENU_MANIFESTS,
    [dashboardData]
  )

  const [selectedEventId, setSelectedEventId] = useState('ev-01')
  const [searchMenu, setSearchMenu] = useState('')
  const [qcFilter, setQcFilter] = useState('semua')

  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null
  }, [events, selectedEventId])

  const currentManifest = useMemo(() => {
    const id = activeEvent?.id || selectedEventId
    return menuManifests[id] || VENDOR_MENU_MANIFESTS['ev-01']
  }, [activeEvent, menuManifests, selectedEventId])

  const items = useMemo(() => currentManifest?.items || [], [currentManifest])

  const qcStats = useMemo(() => {
    const total = items.length
    const checked = items.filter((i) => i.qc_checked).length
    const percent = total > 0 ? Math.round((checked * 100) / total) : 0
    return { total, checked, unchecked: total - checked, percent }
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (qcFilter === 'lolos' && !item.qc_checked) return false
      if (qcFilter === 'belum' && item.qc_checked) return false
      if (!searchMenu.trim()) return true
      const q = searchMenu.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q)
      )
    })
  }, [items, qcFilter, searchMenu])

  const handleToggleItemQC = async (item) => {
    const targetEventId = activeEvent?.id || selectedEventId
    try {
      await vendorService.toggleManifestItemQC(targetEventId, item.id)
      await reloadDashboard()
      showToast(`Status QC hidangan "${item.name}" berhasil diperbarui.`, 'success')
    } catch {
      showToast('Gagal memperbarui status QC hidangan.', 'error')
    }
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Dukungan Operasional</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Surat Jalan &amp; Rincian Menu</span>
          </div>
          <h1 className="vendor-main-title">Surat Jalan &amp; Rincian Menu Prasmanan</h1>
          <p className="vendor-header-subtitle">
            Manifest resmi distribusi hidangan katering, verifikasi suhu saji standar, dan checklist pemeriksaan mutu (QC) sebelum disajikan.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              No. Dokumen: <strong>{currentManifest.doc_number}</strong>
            </span>
          </div>
          <div className="vendor-status-chip chip-amber">
            <span className="chip-indicator amber-dot" />
            <span>
              Lolos QC: <strong>{qcStats.checked}/{qcStats.total} Menu ({qcStats.percent}%)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Event Switcher & Action Bar */}
      <div className="op-toolbar-card">
        <div className="op-event-selector-group" role="tablist" aria-label="Pilih Acara Manifest">
          <span className="op-selector-caption">Pilih Acara:</span>
          <div className="op-event-pills">
            {events.map((ev) => {
              const isSelected = (activeEvent?.id || selectedEventId) === ev.id
              return (
                <button
                  key={ev.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`op-event-pill-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedEventId(ev.id)}
                >
                  <span className="op-event-pill-title">{ev.couple_short || ev.wedding_title}</span>
                  <span className="op-event-pill-sub">{ev.portions_or_units} Porsi</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="op-toolbar-actions">
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={() =>
              showToast(`Mencetak Surat Jalan ${currentManifest.doc_number}...`, 'success')
            }
          >
            Cetak Surat Jalan
          </button>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('manifest_menu')}
          >
            Pratinjau Dokumen
          </button>
        </div>
      </div>

      {/* Manifest Document Sheet */}
      <div className="manifest-document-sheet">
        <div className="manifest-sheet-header">
          <div>
            <span className="manifest-company-name">CV BERKAH RASA NUSANTARA • DIVISI LOGISTIK PANGAN</span>
            <h2 className="manifest-doc-title">SURAT JALAN &amp; MANIFEST HIDANGAN RESMI</h2>
            <span className="manifest-doc-num">
              Nomor Registrasi: {currentManifest.doc_number} • Paket: {currentManifest.buffet_package}
            </span>
          </div>
          <div className="manifest-sheet-qr">
            <div className="qr-verified-badge">
              <span className="qr-check-icon">✓</span>
              <span>TERVERIFIKASI</span>
            </div>
            <span className="qr-sub">Otorisasi Sistem SerasiWO</span>
          </div>
        </div>

        <div className="manifest-sheet-meta-grid">
          <div className="sheet-meta-item">
            <span className="sheet-label">Nama Acara &amp; Mempelai</span>
            <strong>{activeEvent?.wedding_title} ({activeEvent?.bride_groom})</strong>
          </div>
          <div className="sheet-meta-item">
            <span className="sheet-label">Jadwal &amp; Lokasi Resepsi</span>
            <strong>
              {formatLongDateID(activeEvent?.event_date)} • {activeEvent?.venue}
            </strong>
          </div>
          <div className="sheet-meta-item">
            <span className="sheet-label">Armada &amp; Pengemudi Penanggung Jawab</span>
            <strong>
              {currentManifest.fleet_plate} • {currentManifest.driver_name}
            </strong>
          </div>
          <div className="sheet-meta-item">
            <span className="sheet-label">Keberangkatan Dapur Sentral</span>
            <strong>{currentManifest.departure_kitchen} (Total {currentManifest.total_pax} Pax)</strong>
          </div>
        </div>

        {/* Search & Filter Controls inside Manifest */}
        <div className="op-table-controls-row">
          <div className="op-search-input-wrap">
            <input
              type="search"
              className="op-search-input"
              placeholder="Cari nama hidangan, kategori, atau catatan teknis..."
              value={searchMenu}
              onChange={(e) => setSearchMenu(e.target.value)}
              aria-label="Cari menu dalam surat jalan"
            />
          </div>

          <div className="op-filter-pills" role="group" aria-label="Filter Status QC Menu">
            {[
              { id: 'semua', label: `Semua Menu (${qcStats.total})` },
              { id: 'lolos', label: `Lolos QC (${qcStats.checked})` },
              { id: 'belum', label: `Belum QC (${qcStats.unchecked})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`op-mini-filter-btn ${qcFilter === f.id ? 'active' : ''}`}
                onClick={() => setQcFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="op-empty-state">
            <strong>Menu hidangan tidak ditemukan</strong>
            <p>Tidak ada item menu yang cocok dengan kata kunci atau filter status QC yang dipilih.</p>
            <button
              type="button"
              className="secondary-surface-btn"
              onClick={() => {
                setSearchMenu('')
                setQcFilter('semua')
              }}
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="manifest-table-wrapper">
            <table className="manifest-data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Menu Hidangan</th>
                  <th>Kategori</th>
                  <th>Kuantitas Saji</th>
                  <th>Standar Suhu Saji</th>
                  <th>Catatan Teknis Lapangan</th>
                  <th>Verifikasi QC</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className={item.qc_checked ? 'row-qc-passed' : ''}>
                    <td className="td-mono">{idx + 1}</td>
                    <td>
                      <strong className="manifest-item-name">{item.name}</strong>
                    </td>
                    <td>
                      <span className="manifest-cat-pill">{item.category}</span>
                    </td>
                    <td className="td-bold">{item.portions}</td>
                    <td className="td-temp">{item.temp_standard}</td>
                    <td className="td-notes">{item.notes}</td>
                    <td>
                      <button
                        type="button"
                        className={`op-qc-action-btn ${item.qc_checked ? 'passed' : 'pending'}`}
                        onClick={() => handleToggleItemQC(item)}
                      >
                        {item.qc_checked ? '✓ Lolos QC' : 'Verifikasi QC'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function FieldPicPage() {
  const { dashboardData, openModal, showToast } = useVendor()
  const fieldPics = useMemo(
    () => dashboardData?.field_pics || VENDOR_FIELD_PICS,
    [dashboardData]
  )

  const [searchPic, setSearchPic] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('semua')

  const filteredPics = useMemo(() => {
    return fieldPics.filter((pic) => {
      if (divisionFilter !== 'semua' && !pic.ht_channel.toLowerCase().includes(divisionFilter)) {
        return false
      }
      if (!searchPic.trim()) return true
      const q = searchPic.toLowerCase()
      return (
        pic.name.toLowerCase().includes(q) ||
        pic.role.toLowerCase().includes(q) ||
        pic.division.toLowerCase().includes(q) ||
        pic.assigned_venue.toLowerCase().includes(q)
      )
    })
  }, [fieldPics, divisionFilter, searchPic])

  const handleCopyPhone = (phone, name) => {
    navigator.clipboard.writeText(phone)
    showToast(`Nomor telepon ${name} (${phone}) disalin ke clipboard.`, 'success')
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Dukungan Operasional</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">PIC Koordinator Lapangan</span>
          </div>
          <h1 className="vendor-main-title">Direktori PIC Koordinator Lapangan SerasiWO</h1>
          <p className="vendor-header-subtitle">
            Kontak langsung komando operasional lapangan, pembagian jalur frekuensi Handy Talkie (HT), dan otoritas area venue.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Frekuensi Dapur: <strong>CH 04 (446.050 MHz)</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('field_pic')}
          >
            Kartu Kontak Cepat
          </button>
        </div>
      </div>

      {/* Radio Communication Protocol Banner */}
      <div className="radio-protocol-card">
        <div className="radio-protocol-badge">HT CH-04</div>
        <div className="radio-protocol-text">
          <h2 className="radio-protocol-title">
            Protokol Komunikasi Radio Handy Talkie (HT) &amp; Jalur Koordinasi Ballroom
          </h2>
          <p>
            Untuk menjaga ketenangan acara akad dan resepsi, seluruh kru katering wajib menggunakan earphone pada{' '}
            <strong>Channel 04 (Frekuensi 446.050 MHz)</strong> dengan identitas panggil{' '}
            <strong>&quot;Mitra Katering Berkah Rasa&quot;</strong>.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="op-toolbar-card">
        <div className="op-search-input-wrap">
          <input
            type="search"
            className="op-search-input"
            placeholder="Cari nama koordinator, divisi, atau area tugas..."
            value={searchPic}
            onChange={(e) => setSearchPic(e.target.value)}
            aria-label="Cari koordinator lapangan"
          />
        </div>

        <div className="op-filter-pills" role="group" aria-label="Filter Jalur HT Koordinator">
          {[
            { id: 'semua', label: 'Semua Koordinator' },
            { id: 'ch 01', label: 'Komando Utama (CH 01)' },
            { id: 'ch 04', label: 'Logistik & Dapur (CH 04)' },
            { id: 'ch 02', label: 'VIP & Keluarga (CH 02)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`op-mini-filter-btn ${divisionFilter === tab.id ? 'active' : ''}`}
              onClick={() => setDivisionFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredPics.length === 0 ? (
        <div className="op-empty-state">
          <strong>Koordinator tidak ditemukan</strong>
          <p>Tidak ada personel PIC yang sesuai dengan kata kunci pencarian Anda.</p>
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={() => {
              setSearchPic('')
              setDivisionFilter('semua')
            }}
          >
            Tampilkan Semua PIC
          </button>
        </div>
      ) : (
        <div className="pic-directory-grid">
          {filteredPics.map((pic) => (
            <div key={pic.id} className="pic-card-box">
              <div className="pic-card-header-area">
                <div className="pic-card-top">
                  <div className="pic-card-avatar">{pic.initials}</div>
                  <div className="pic-card-title-group">
                    <div className="pic-name-line">
                      <h3 className="pic-card-name">{pic.name}</h3>
                      <span className="pic-live-pill">{pic.status}</span>
                    </div>
                    <span className="pic-card-badge">{pic.role}</span>
                  </div>
                </div>

                <p className="pic-card-desc">{pic.responsibility}</p>
              </div>

              <div className="pic-card-specs">
                <div className="pic-spec-row">
                  <span className="pic-spec-label">Divisi &amp; Area:</span>
                  <strong>{pic.assigned_venue}</strong>
                </div>
                <div className="pic-spec-row">
                  <span className="pic-spec-label">Jalur Radio HT:</span>
                  <strong className="text-ember">{pic.ht_channel}</strong>
                </div>
                <div className="pic-spec-row">
                  <span className="pic-spec-label">Jam Siaga:</span>
                  <strong>{pic.shift_time}</strong>
                </div>
                <div className="pic-spec-row">
                  <span className="pic-spec-label">Telepon / WA:</span>
                  <strong>{pic.phone}</strong>
                </div>
              </div>

              <div className="pic-card-actions-dual">
                <button
                  type="button"
                  className="secondary-surface-btn pic-copy-btn"
                  onClick={() => handleCopyPhone(pic.phone, pic.name)}
                >
                  Salin Nomor
                </button>
                <a
                  href={`https://wa.me/${pic.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pic-btn-wa"
                >
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SopStandardsPage() {
  const { dashboardData, showToast, reloadDashboard } = useVendor()
  const sopList = useMemo(
    () => dashboardData?.sop_checklist || VENDOR_SOP_CHECKLIST,
    [dashboardData]
  )

  const [categoryFilter, setCategoryFilter] = useState('semua')

  const sopStats = useMemo(() => {
    const total = sopList.length
    const ack = sopList.filter((s) => s.acknowledged).length
    const percent = total > 0 ? Math.round((ack * 100) / total) : 0
    return { total, ack, pending: total - ack, percent }
  }, [sopList])

  const filteredSops = useMemo(() => {
    if (categoryFilter === 'disetujui') return sopList.filter((s) => s.acknowledged)
    if (categoryFilter === 'belum') return sopList.filter((s) => !s.acknowledged)
    return sopList
  }, [sopList, categoryFilter])

  const handleToggleSop = async (sop) => {
    try {
      await vendorService.toggleSopAcknowledgement(sop.id)
      await reloadDashboard()
      showToast(
        `Status kepatuhan ${sop.code} (${sop.title}) berhasil diperbarui.`,
        'success'
      )
    } catch {
      showToast('Gagal memperbarui status kepatuhan SOP.', 'error')
    }
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Dukungan Operasional</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">SOP &amp; Standar Pelayanan WO</span>
          </div>
          <h1 className="vendor-main-title">SOP &amp; Standar Mutu Pelayanan Katering</h1>
          <p className="vendor-header-subtitle">
            Pedoman wajib higienitas pangan, kestabilan suhu saji, manajemen kuota refill, dan komitmen sanitasi area ballroom rekanan SerasiWO.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className={`vendor-status-chip ${sopStats.percent === 100 ? 'chip-green' : 'chip-amber'}`}>
            <span className={`chip-indicator ${sopStats.percent === 100 ? 'green-dot' : 'amber-dot'}`} />
            <span>
              Kepatuhan Mitra: <strong>{sopStats.ack}/{sopStats.total} Standar ({sopStats.percent}%)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Progress Summary Banner */}
      <div className="sop-compliance-banner">
        <div className="sop-compliance-info">
          <span className="sop-compliance-eyebrow">STATUS AUDIT MANDIRI MITRA KATERING</span>
          <h2 className="sop-compliance-heading">
            {sopStats.percent === 100
              ? 'Seluruh Protokol Standar Operasional Telah Disetujui & Siap Audit Lapangan'
              : `${sopStats.pending} Standar Operasional Menunggu Verifikasi Penanggung Jawab Katering`}
          </h2>
          <p className="sop-compliance-sub">
            Setiap poin SOP di bawah ini menjadi dasar penilaian mutu vendor oleh Lead Event Coordinator SerasiWO saat acara berlangsung.
          </p>
        </div>

        <div className="sop-filter-controls">
          <div className="op-filter-pills" role="group" aria-label="Filter Status SOP">
            {[
              { id: 'semua', label: `Semua SOP (${sopStats.total})` },
              { id: 'disetujui', label: `Telah Disetujui (${sopStats.ack})` },
              { id: 'belum', label: `Belum Disetujui (${sopStats.pending})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`op-mini-filter-btn ${categoryFilter === f.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredSops.length === 0 ? (
        <div className="op-empty-state">
          <strong>Tidak ada item SOP pada kategori ini</strong>
          <p>Pilih filter Semua SOP untuk menampilkan seluruh daftar standar pelayanan.</p>
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={() => setCategoryFilter('semua')}
          >
            Tampilkan Semua SOP
          </button>
        </div>
      ) : (
        <div className="sop-grid-cards">
          {filteredSops.map((sop) => (
            <div
              key={sop.id}
              className={`sop-card-item ${sop.acknowledged ? 'sop-acknowledged' : ''}`}
            >
              <div className="sop-card-top-row">
                <div className="sop-badges-left">
                  <span className="sop-number-badge">{sop.code}</span>
                  <span className="sop-category-pill">{sop.category}</span>
                </div>
                <span className="sop-timing-tag">{sop.mandatory_time}</span>
              </div>

              <h3 className="sop-item-title">{sop.title}</h3>
              <p className="sop-item-body">{sop.description}</p>

              <div className="sop-metric-box">
                <span className="sop-metric-label">Indikator Verifikasi WO:</span>
                <strong>{sop.verification_metric}</strong>
              </div>

              <div className="sop-card-footer">
                <span className={`op-badge-status ${sop.acknowledged ? 'done' : 'pending'}`}>
                  {sop.acknowledged ? 'Disanggupi oleh Mitra' : 'Menunggu Konfirmasi'}
                </span>
                <button
                  type="button"
                  className={`op-check-toggle-btn ${sop.acknowledged ? 'checked' : ''}`}
                  onClick={() => handleToggleSop(sop)}
                >
                  {sop.acknowledged ? '✓ Standar Disetujui' : 'Setujui Standar Ini'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function VendorProfilePage() {
  const { dashboardData, showToast, reloadDashboard } = useVendor()
  const profile = dashboardData?.vendor_profile || {}

  const [isEditing, setIsEditing] = useState(false)
  const [formState, setFormState] = useState({
    pic_name: '',
    phone: '',
    email: '',
    kitchen_capacity: '',
    fleet_info: '',
    kitchen_address: '',
  })

  const handleStartEdit = () => {
    setFormState({
      pic_name: profile.pic_name || 'Hendra Kusuma',
      phone: profile.phone || '+62 812-3456-7890',
      email: profile.email || 'vendor@serasiwo.com',
      kitchen_capacity: profile.kitchen_capacity || 'Hingga 5.000 Porsi / Hari',
      fleet_info: profile.fleet_info || '4 Unit Truk Box Isuzu Chiller',
      kitchen_address: profile.kitchen_address || 'Jl. Danau Sunter Utara No. 42, Jakarta Utara',
    })
    setIsEditing(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      await vendorService.updateVendorProfile(formState)
      await reloadDashboard()
      setIsEditing(false)
      showToast('Profil fasilitas dapur dan kontak PIC berhasil diperbarui.', 'success')
    } catch {
      showToast('Gagal menyimpan pembaruan profil mitra.', 'error')
    }
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Pengaturan Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Profil Katering &amp; Dapur</span>
          </div>
          <h1 className="vendor-main-title">Profil Katering &amp; Fasilitas Dapur Mitra</h1>
          <p className="vendor-header-subtitle">
            Data legalitas badan usaha, sertifikasi halal dan higiene jasaboga, serta kapasitas produksi harian dapur sentral.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Status Kemitraan: <strong>Terverifikasi Aktif ({profile.id || 'VND-KTR-001'})</strong>
            </span>
          </div>
          {!isEditing && (
            <button
              type="button"
              className="btn-ember-primary"
              onClick={handleStartEdit}
            >
              Perbarui Data Operasional
            </button>
          )}
        </div>
      </div>

      <div className="profile-detail-card">
        <div className="profile-card-top-banner">
          <div className="profile-avatar-large">BR</div>
          <div className="profile-banner-main">
            <div className="profile-title-with-badge">
              <h2 className="profile-business-name">
                {profile.legal_name || 'CV Berkah Rasa Nusantara'}
              </h2>
              <span className="profile-verified-tag">✓ Rekanan Resmi Sejak 2023</span>
            </div>
            <span className="profile-brand-tag">
              Nama Brand: <strong>{profile.name || 'Berkah Rasa Premium Catering'}</strong> • Kategori: {profile.category || 'Katering & Jamuan'}
            </span>
            <div className="profile-pills-row">
              <span className="profile-rating-pill">
                ★ {profile.rating || '4.9'} Rating Mutu ({profile.completed_jobs || 52} Acara Selesai)
              </span>
              <span className="profile-meta-pill">
                NPWP: {profile.npwp_number || '02.841.992.1-043.000'}
              </span>
              <span className="profile-meta-pill">
                NIB: {profile.nib_number || '9120300881421'}
              </span>
            </div>
          </div>
        </div>

        {isEditing ? (
          <form className="op-edit-form" onSubmit={handleSaveProfile}>
            <div className="op-form-header">
              <h3>Formulir Pembaruan Kapasitas Dapur &amp; Kontak PIC</h3>
              <p>Perubahan data kapasitas dan nomor kontak akan langsung terlihat oleh tim Admin Operasional SerasiWO.</p>
            </div>

            <div className="op-form-grid">
              <label className="op-form-field">
                <span>Nama Penanggung Jawab (PIC Utama)</span>
                <input
                  type="text"
                  required
                  value={formState.pic_name}
                  onChange={(e) => setFormState({ ...formState, pic_name: e.target.value })}
                />
              </label>

              <label className="op-form-field">
                <span>Nomor Telepon / WhatsApp Siaga</span>
                <input
                  type="text"
                  required
                  value={formState.phone}
                  onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                />
              </label>

              <label className="op-form-field">
                <span>Email Resmi Katering</span>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </label>

              <label className="op-form-field">
                <span>Kapasitas Produksi Dapur Sentral</span>
                <input
                  type="text"
                  required
                  value={formState.kitchen_capacity}
                  onChange={(e) => setFormState({ ...formState, kitchen_capacity: e.target.value })}
                />
              </label>

              <label className="op-form-field">
                <span>Armada Distribusi Berpendingin</span>
                <input
                  type="text"
                  required
                  value={formState.fleet_info}
                  onChange={(e) => setFormState({ ...formState, fleet_info: e.target.value })}
                />
              </label>

              <label className="op-form-field">
                <span>Alamat Dapur Produksi Utama</span>
                <input
                  type="text"
                  required
                  value={formState.kitchen_address}
                  onChange={(e) => setFormState({ ...formState, kitchen_address: e.target.value })}
                />
              </label>
            </div>

            <div className="op-form-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => setIsEditing(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn-ember-primary">
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-spec-grid">
            <div className="spec-tile">
              <span className="spec-tile-label">Nomor Sertifikat Halal MUI &amp; BPJPH</span>
              <strong className="spec-tile-value">
                {profile.halal_cert || 'ID3111000028911021 (MUI & BPJPH Aktif)'}
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Sertifikat Laik Higiene Sanitasi Jasaboga</span>
              <strong className="spec-tile-value">
                {profile.hygiene_cert || 'Dinkes DKI Jakarta Golongan B (Valid)'}
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Kapasitas Produksi Dapur Sentral</span>
              <strong className="spec-tile-value">
                {profile.kitchen_capacity || 'Hingga 5.000 Porsi / Hari'}
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Armada Distribusi Pendingin</span>
              <strong className="spec-tile-value">
                {profile.fleet_info || '4 Unit Truk Box Isuzu Chiller'}
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Total Kru &amp; Pramusaji Tersertifikasi</span>
              <strong className="spec-tile-value">
                {profile.service_crew_total || '65 Personel Tersertifikasi Higiene'}
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Penanggung Jawab Operasional (PIC)</span>
              <strong className="spec-tile-value">
                {profile.pic_name || 'Hendra Kusuma'} ({profile.pic_role || 'Direktur Operasional'})
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Kontak Resmi &amp; Email Korporat</span>
              <strong className="spec-tile-value">
                {profile.phone || '+62 812-3456-7890'} • {profile.email || 'vendor@serasiwo.com'}
              </strong>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Alamat Dapur Produksi Pusat</span>
              <strong className="spec-tile-value">
                {profile.kitchen_address || 'Jl. Danau Sunter Utara No. 42, Jakarta Utara'}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function BankAccountPage() {
  const { dashboardData, showToast, openModal, reloadDashboard } = useVendor()
  const profile = dashboardData?.vendor_profile || {}
  const metrics = dashboardData?.metrics || {}

  const [isEditingBank, setIsEditingBank] = useState(false)
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_branch: '',
    account_number: '',
    account_holder: '',
  })

  const handleOpenEditBank = () => {
    setBankForm({
      bank_name: profile.bank_name || 'Bank Central Asia (BCA)',
      bank_branch: profile.bank_branch || 'KCU Sunter Mall',
      account_number: profile.account_number || '521-0988-123',
      account_holder: profile.account_holder || 'CV Berkah Rasa Nusantara',
    })
    setIsEditingBank(true)
  }

  const handleSaveBank = async (e) => {
    e.preventDefault()
    const rawDigits = bankForm.account_number.replace(/\D/g, '')
    try {
      await vendorService.updateVendorProfile({
        ...bankForm,
        account_number_raw: rawDigits || bankForm.account_number,
      })
      await reloadDashboard()
      setIsEditingBank(false)
      showToast('Data rekening bank pencairan berhasil diperbarui.', 'success')
    } catch {
      showToast('Gagal memperbarui data rekening bank.', 'error')
    }
  }

  const rawAccountNum = profile.account_number_raw || '521098812300'

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Pengaturan Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Rekening Bank Pencairan</span>
          </div>
          <h1 className="vendor-main-title">Rekening Bank Pencairan Dana Payout</h1>
          <p className="vendor-header-subtitle">
            Rekening giro korporat terdaftar untuk pencairan termin uang muka (DP) dan pelunasan tagihan katering dari SerasiWO.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Status Rekening: <strong>Terverifikasi Giro Korporat</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('create_payout')}
          >
            + Unggah Invoice Baru
          </button>
        </div>
      </div>

      {/* Disbursement KPI Summary Strip */}
      <div className="op-kpi-grid-4">
        <div className="op-kpi-box">
          <span className="op-kpi-label">TOTAL DANA SUDAH DICAIRKAN</span>
          <strong className="op-kpi-val text-green">
            {formatRupiah(metrics.settled_payout_amount || 69500000)}
          </strong>
          <span className="op-kpi-sub">Transfer RTGS / LLG lunas terverifikasi</span>
        </div>

        <div className="op-kpi-box">
          <span className="op-kpi-label">MENUNGGU PENCAIRAN WO</span>
          <strong className="op-kpi-val text-amber">
            {formatRupiah(metrics.pending_payout_amount || 42000000)}
          </strong>
          <span className="op-kpi-sub">{metrics.pending_payout_count || 1} tagihan dalam antrean verifikasi</span>
        </div>

        <div className="op-kpi-box">
          <span className="op-kpi-label">JADWAL BATCH SETTLEMENT</span>
          <strong className="op-kpi-val">{profile.settlement_schedule || 'Rabu & Jumat (14:00 WIB)'}</strong>
          <span className="op-kpi-sub">Batas unggah invoice pukul 11:00 WIB</span>
        </div>

        <div className="op-kpi-box">
          <span className="op-kpi-label">METODE KLIRING BANK</span>
          <strong className="op-kpi-val">BI-FAST &amp; RTGS Korporat</strong>
          <span className="op-kpi-sub">Bebas biaya potongan admin antar-BCA</span>
        </div>
      </div>

      <div className="bank-account-full-card">
        <div className="bank-card-visual">
          <div className="bank-visual-top">
            <div className="bank-chip-metal" />
            <span className="bank-institution">
              {(profile.bank_name || 'BANK CENTRAL ASIA').toUpperCase()}
            </span>
          </div>
          <div className="bank-visual-number">
            {profile.account_number || '521-0988-123'}
          </div>
          <div className="bank-visual-footer">
            <div>
              <span className="bank-visual-sub">PEMILIK REKENING GIRO:</span>
              <strong>{(profile.account_holder || 'CV BERKAH RASA NUSANTARA').toUpperCase()}</strong>
            </div>
            <div>
              <span className="bank-visual-sub">KANTOR CABANG:</span>
              <strong>{(profile.bank_branch || 'KCU SUNTER MALL').toUpperCase()}</strong>
            </div>
          </div>
        </div>

        <div className="bank-policy-details">
          {isEditingBank ? (
            <form className="op-edit-form" onSubmit={handleSaveBank}>
              <div className="op-form-header">
                <h3>Perbarui Rekening Pencairan Mitra</h3>
                <p>Nama pemilik rekening wajib sesuai dengan badan hukum yang terdaftar pada NPWP mitra.</p>
              </div>

              <div className="op-form-grid">
                <label className="op-form-field">
                  <span>Nama Bank Tujuan</span>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  />
                </label>

                <label className="op-form-field">
                  <span>Kantor Cabang Pembuka</span>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_branch}
                    onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })}
                  />
                </label>

                <label className="op-form-field">
                  <span>Nomor Rekening Korporat</span>
                  <input
                    type="text"
                    required
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  />
                </label>

                <label className="op-form-field">
                  <span>Nama Pemilik Rekening (Sesuai Akta)</span>
                  <input
                    type="text"
                    required
                    value={bankForm.account_holder}
                    onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
                  />
                </label>
              </div>

              <div className="op-form-actions">
                <button
                  type="button"
                  className="secondary-surface-btn"
                  onClick={() => setIsEditingBank(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-ember-primary">
                  Simpan Rekening Baru
                </button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <h2 className="bank-policy-heading">
                  Ketentuan Pencairan &amp; Verifikasi Keuangan SerasiWO
                </h2>
                <ul className="bank-policy-list">
                  <li>
                    • Pencairan dana dilakukan secara otomatis setiap hari{' '}
                    <strong>Rabu dan Jumat pukul 14:00 WIB</strong> melalui sistem Cash Management SerasiWO.
                  </li>
                  <li>
                    • Tagihan (invoice) yang diunggah sebelum pukul 11:00 WIB dan telah disetujui oleh Admin Operasional akan diproses pada gelombang pencairan hari yang sama.
                  </li>
                  <li>
                    • Bukti transfer bank resmi (advis kredit) akan dilampirkan otomatis pada menu{' '}
                    <strong>Tagihan &amp; Payout</strong> segera setelah dana efektif masuk ke rekening mitra.
                  </li>
                </ul>
              </div>

              <div className="bank-action-buttons-row">
                <button
                  type="button"
                  className="secondary-surface-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(rawAccountNum)
                    showToast(
                      `Nomor rekening ${rawAccountNum} disalin ke clipboard.`,
                      'success'
                    )
                  }}
                >
                  Salin Nomor Rekening ({rawAccountNum})
                </button>
                <button
                  type="button"
                  className="secondary-surface-btn"
                  onClick={handleOpenEditBank}
                >
                  Ubah Data Rekening
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
