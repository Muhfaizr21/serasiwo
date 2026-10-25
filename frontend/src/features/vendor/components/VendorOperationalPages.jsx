import { useState, useEffect, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatRupiah, formatShortDateID } from '../utils/vendorFormatters'
import {
  downloadBankVerificationPdf,
  downloadLoadingPassPdf,
  downloadMenuManifestPdf,
  downloadPayoutReceiptPdf,
  downloadVendorProfilePdf,
} from '../utils/vendorPdfGenerator'
import {
  VENDOR_FIELD_PICS,
  VENDOR_LOADING_SCHEDULES,
  VENDOR_MENU_MANIFESTS,
  VENDOR_SOP_CHECKLIST,
} from '../data/vendorMockData'

export function KitchenLoadingPage() {
  const { dashboardData, showToast, openModal, reloadDashboard, refreshTick } =
    useVendor()
  const events = useMemo(
    () => dashboardData?.events_this_week || [],
    [dashboardData]
  )

  const [schedulesMap, setSchedulesMap] = useState(
    () => dashboardData?.loading_schedules || VENDOR_LOADING_SCHEDULES
  )
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)
  const [scheduleError, setScheduleError] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState('ALL')
  const [slotFilter, setSlotFilter] = useState('semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({
    key: 'event_time',
    direction: 'asc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [slotNotes, setSlotNotes] = useState({})
  const [editingSlotKey, setEditingSlotKey] = useState(null)
  const [isEditingFleet, setIsEditingFleet] = useState(false)
  const [fleetDraft, setFleetDraft] = useState('')
  const [driverDraft, setDriverDraft] = useState('')
  const [busyKey, setBusyKey] = useState(null)

  const fetchSchedules = async () => {
    setIsLoadingSchedules(true)
    setScheduleError(null)
    try {
      const data = await vendorService.getLoadingSchedules()
      if (data && typeof data === 'object') {
        setSchedulesMap(data)
      }
    } catch (err) {
      const msg = err?.message || 'Koneksi ke tabel vendor_loading_schedules terputus.'
      setScheduleError(msg)
      showToast('Gagal memuat jadwal loading dari database', 'error')
    } finally {
      setIsLoadingSchedules(false)
    }
  }

  useEffect(() => {
    let active = true
    vendorService
      .getLoadingSchedules()
      .then((data) => {
        if (active && data && typeof data === 'object') {
          setSchedulesMap(data)
          setScheduleError(null)
        }
      })
      .catch((err) => {
        if (active) {
          setScheduleError(
            err?.message || 'Koneksi ke tabel vendor_loading_schedules terputus.'
          )
          showToast('Gagal memuat jadwal loading dari database', 'error')
        }
      })
      .finally(() => {
        if (active) setIsLoadingSchedules(false)
      })
    return () => {
      active = false
    }
  }, [refreshTick, showToast])

  const activeEvent = useMemo(() => {
    if (selectedEventId === 'ALL') return events[0] || null
    return events.find((e) => e.id === selectedEventId) || events[0] || null
  }, [events, selectedEventId])

  const currentSchedule = useMemo(() => {
    const id = activeEvent?.id || 'ev-01'
    return (
      schedulesMap[id] ||
      dashboardData?.loading_schedules?.[id] ||
      VENDOR_LOADING_SCHEDULES['ev-01']
    )
  }, [activeEvent, schedulesMap, dashboardData])

  // Build unified flat list of rows (supports single event OR 100+ events in 'ALL' mode)
  const rawSlotRows = useMemo(() => {
    const targetEvents =
      selectedEventId === 'ALL'
        ? events
        : events.filter((e) => e.id === (activeEvent?.id || selectedEventId))

    const rows = []
    targetEvents.forEach((ev) => {
      const sched =
        schedulesMap[ev.id] ||
        dashboardData?.loading_schedules?.[ev.id] ||
        VENDOR_LOADING_SCHEDULES[ev.id] ||
        VENDOR_LOADING_SCHEDULES['ev-01']
      const evSlots = sched?.slots || []
      evSlots.forEach((slot, idx) => {
        rows.push({
          rowKey: `${ev.id}::${slot.id}`,
          eventId: ev.id,
          eventObj: ev,
          scheduleObj: sched,
          slotIndex: idx,
          slot,
        })
      })
    })
    return rows
  }, [events, selectedEventId, activeEvent, schedulesMap, dashboardData])

  const stats = useMemo(() => {
    const total = rawSlotRows.length
    const completed = rawSlotRows.filter((r) => r.slot.completed).length
    const percent = total > 0 ? Math.round((completed * 100) / total) : 0
    return { total, completed, pending: total - completed, percent }
  }, [rawSlotRows])

  const filteredAndSortedRows = useMemo(() => {
    const filtered = rawSlotRows.filter(({ slot, eventObj, scheduleObj }) => {
      if (slotFilter === 'selesai' && !slot.completed) return false
      if (slotFilter === 'menunggu' && slot.completed) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        slot.title.toLowerCase().includes(q) ||
        slot.phase.toLowerCase().includes(q) ||
        slot.time.toLowerCase().includes(q) ||
        slot.pic.toLowerCase().includes(q) ||
        (slot.note || '').toLowerCase().includes(q) ||
        (eventObj?.wedding_title || '').toLowerCase().includes(q) ||
        (eventObj?.venue || '').toLowerCase().includes(q) ||
        (scheduleObj?.security_pass_code || '').toLowerCase().includes(q)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1
      if (sortConfig.key === 'event_time') {
        const cmpDate = (a.eventObj?.event_date || '').localeCompare(
          b.eventObj?.event_date || ''
        )
        if (cmpDate !== 0) return cmpDate * dir
        return (a.slot.time || '').localeCompare(b.slot.time || '') * dir
      }
      if (sortConfig.key === 'activity') {
        return a.slot.title.localeCompare(b.slot.title) * dir
      }
      if (sortConfig.key === 'dock') {
        return (
          (a.scheduleObj?.dock_gate || '').localeCompare(
            b.scheduleObj?.dock_gate || ''
          ) * dir
        )
      }
      if (sortConfig.key === 'pic') {
        return a.slot.pic.localeCompare(b.slot.pic) * dir
      }
      if (sortConfig.key === 'status') {
        const sA = a.slot.completed ? 1 : 0
        const sB = b.slot.completed ? 1 : 0
        return (sA - sB) * dir
      }
      return 0
    })

    return sorted
  }, [rawSlotRows, slotFilter, searchQuery, sortConfig])

  // Client-side pagination for 100+ rows
  const totalFiltered = filteredAndSortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredAndSortedRows.slice(start, start + pageSize)
  }, [filteredAndSortedRows, safePage, pageSize])

  const pageNumbers = useMemo(() => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (safePage > 3) pages.push('...')
      const start = Math.max(2, safePage - 1)
      const end = Math.min(totalPages - 1, safePage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (safePage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, safePage])

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const getEventScheduleStats = (eventId) => {
    const sched =
      schedulesMap[eventId] ||
      dashboardData?.loading_schedules?.[eventId] ||
      VENDOR_LOADING_SCHEDULES[eventId]
    const list = sched?.slots || []
    if (list.length === 0) return { done: 0, total: 5, pct: 0 }
    const done = list.filter((s) => s.completed).length
    return {
      done,
      total: list.length,
      pct: Math.round((done * 100) / list.length),
    }
  }

  const getInitials = (fullName) => {
    if (!fullName) return 'PIC'
    const clean = fullName.split('(')[0].trim()
    const parts = clean.split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return clean.slice(0, 2).toUpperCase()
  }

  const handleToggleSlot = async (targetEventId, slot, customCompleted) => {
    const rowKey = `${targetEventId}::${slot.id}`
    const nextCompleted =
      customCompleted !== undefined ? customCompleted : !slot.completed
    const noteText =
      slotNotes[rowKey] !== undefined ? slotNotes[rowKey] : slot.note || ''
    setBusyKey(rowKey)
    try {
      const updated = await vendorService.toggleLoadingSlot(
        targetEventId,
        slot.id,
        {
          completed: nextCompleted,
          note: noteText,
        }
      )
      if (updated) {
        setSchedulesMap((prev) => ({ ...prev, [targetEventId]: updated }))
      }
      setEditingSlotKey(null)
      await reloadDashboard()
      showToast(
        nextCompleted
          ? `Tahapan "${slot.title}" ditandai selesai & tersimpan di Supabase!`
          : `Tahapan "${slot.title}" dikembalikan ke status menunggu.`,
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui tahapan loading.', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const handleBatchSlotAction = async (actionType) => {
    const targetEventId = activeEvent?.id || 'ev-01'
    setBusyKey(actionType)
    try {
      const updated = await vendorService.toggleLoadingSlot(
        targetEventId,
        actionType,
        {
          note:
            actionType === 'all_complete'
              ? 'Seluruh tahapan loading, instalasi buffet, dan serah terima selesai diverifikasi.'
              : '',
        }
      )
      if (updated) {
        setSchedulesMap((prev) => ({ ...prev, [targetEventId]: updated }))
      }
      await reloadDashboard()
      showToast(
        actionType === 'all_complete'
          ? `Seluruh tahapan loading ${activeEvent?.wedding_title} ditandai selesai (100%)!`
          : `Jadwal loading ${activeEvent?.wedding_title} direset kembali ke 0%.`,
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Gagal memproses jadwal loading.', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const handleSaveFleetInfo = async (e) => {
    e.preventDefault()
    const targetEventId = activeEvent?.id || 'ev-01'
    setBusyKey('update_fleet')
    try {
      const updated = await vendorService.toggleLoadingSlot(
        targetEventId,
        'update_fleet',
        {
          fleet_assigned: fleetDraft || currentSchedule.fleet_assigned,
          driver_lead: driverDraft || currentSchedule.driver_lead,
        }
      )
      if (updated) {
        setSchedulesMap((prev) => ({ ...prev, [targetEventId]: updated }))
      }
      setIsEditingFleet(false)
      await reloadDashboard()
      showToast(
        'Data armada chiller dan pimpinan sopir berhasil disimpan ke database!',
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan data armada', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const activeEventSlots = currentSchedule?.slots || []
  const firstPendingIndex = activeEventSlots.findIndex((s) => !s.completed)
  const activeEventIndex = events.findIndex((e) => e.id === activeEvent?.id)

  const handleStepEvent = (delta) => {
    if (events.length === 0) return
    const baseIdx = activeEventIndex >= 0 ? activeEventIndex : 0
    const nextIdx = (baseIdx + delta + events.length) % events.length
    setSelectedEventId(events[nextIdx].id)
    setCurrentPage(1)
    setIsEditingFleet(false)
    setEditingSlotKey(null)
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
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
            Otorisasi surat izin masuk loading dock (SIM-D), penugasan unit chiller, dan pencatatan waktu bongkar muat gedung.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              SIM-D Aktif: <strong>{currentSchedule.security_pass_code}</strong>
            </span>
          </div>
          <div className="vendor-status-chip chip-amber">
            <span className="chip-indicator amber-dot" />
            <span>
              Total Kesiapan: <strong>{stats.completed}/{stats.total} Tahap ({stats.percent}%)</strong>
            </span>
          </div>
        </div>
      </div>

      {isLoadingSchedules && (
        <div className="loading-state-banner" role="status" aria-live="polite">
          <div>
            <strong className="cell-primary-text">Menyinkronkan jadwal loading dari Supabase...</strong>
            <p className="cell-sub-text" style={{ margin: '2px 0 0 0' }}>
              Memuat matriks tahapan bongkar muat terbaru dari tabel vendor_loading_schedules.
            </p>
          </div>
        </div>
      )}

      {scheduleError && (
        <div className="loading-state-banner state-error" role="alert">
          <div>
            <strong className="cell-primary-text">Gagal Menyinkronkan Jadwal Loading</strong>
            <p className="cell-sub-text" style={{ margin: '2px 0 0 0' }}>
              {scheduleError} Menampilkan data terakhir yang tersimpan di sesi lokal.
            </p>
          </div>
          <button
            type="button"
            className="btn-table-reject"
            onClick={fetchSchedules}
          >
            Muat Ulang Data
          </button>
        </div>
      )}

      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">KODE SIM-D &amp; GERBANG LOADING</span>
          <strong className="jobs-kpi-val text-ember">{currentSchedule.security_pass_code}</strong>
          <span className="jobs-kpi-sub">
            {currentSchedule.dock_gate} • {activeEvent?.venue || 'Grand Ballroom'}
          </span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">SPESIFIKASI ARMADA CHILLER</span>
          <strong className="jobs-kpi-val">{currentSchedule.max_vehicle_height}</strong>
          <span className="jobs-kpi-sub">{currentSchedule.fleet_assigned}</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">KOMANDAN SOPIR &amp; STAGING</span>
          <strong className="jobs-kpi-val">{currentSchedule.driver_lead}</strong>
          <span className="jobs-kpi-sub">{currentSchedule.staging_area}</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">
            {selectedEventId === 'ALL'
              ? `PROGRES GABUNGAN (${events.length} ACARA)`
              : 'PROGRES EKSEKUSI & KRU'}
          </span>
          <strong className="jobs-kpi-val text-green">
            {stats.percent}% ({stats.completed}/{stats.total} Tahap)
          </strong>
          <span className="jobs-kpi-sub">
            {currentSchedule.crew_count} Kru Tersertifikasi • {activeEvent?.portions_or_units || 800} Pax
          </span>
        </div>
      </div>

      <div className="loading-control-toolbar-card">
        <div className="loading-control-top-row">
          <div className="loading-context-left">
            <div className="loading-select-shell">
              <span className="loading-select-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <select
                aria-label="Pilih cakupan jadwal acara pernikahan"
                className="loading-event-select"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setCurrentPage(1)
                  setIsEditingFleet(false)
                  setEditingSlotKey(null)
                }}
              >
                <option value="ALL">
                  Semua Jadwal Acara ({events.length} Acara • {events.length * 5} Tahap)
                </option>
                {events.map((ev) => {
                  const st = getEventScheduleStats(ev.id)
                  return (
                    <option key={ev.id} value={ev.id}>
                      [{st.pct}%] {formatShortDateID(ev.event_date)} - {ev.wedding_title} ({ev.portions_or_units} Pax)
                    </option>
                  )
                })}
              </select>
              <span className="loading-select-chevron" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <div
              className="loading-quick-pills-track"
              role="group"
              aria-label="Navigasi Cakupan Acara"
            >
              <button
                type="button"
                className={`loading-quick-pill ${selectedEventId === 'ALL' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedEventId(selectedEventId === 'ALL' ? (activeEvent?.id || 'ev-01') : 'ALL')
                  setCurrentPage(1)
                  setIsEditingFleet(false)
                  setEditingSlotKey(null)
                }}
              >
                <span>Semua ({events.length})</span>
              </button>

              <button
                type="button"
                aria-label="Acara Sebelumnya"
                title="Acara Sebelumnya"
                className="loading-quick-pill pill-icon-only"
                onClick={() => handleStepEvent(-1)}
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Acara Berikutnya"
                title="Acara Berikutnya"
                className="loading-quick-pill pill-icon-only"
                onClick={() => handleStepEvent(1)}
              >
                ›
              </button>

              <span
                className={`loading-event-tab-pct ${
                  stats.percent === 100
                    ? 'pct-done'
                    : stats.percent > 0
                      ? 'pct-progress'
                      : ''
                }`}
              >
                {stats.percent}% Selesai
              </span>
            </div>
          </div>

          <div className="loading-toolbar-actions">
            <button
              type="button"
              className="table-export-btn"
              onClick={() => {
                setFleetDraft(currentSchedule.fleet_assigned || '')
                setDriverDraft(currentSchedule.driver_lead || '')
                setIsEditingFleet((prev) => !prev)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>{isEditingFleet ? 'Tutup Form Armada' : 'Ubah Armada & Sopir'}</span>
            </button>

            <button
              type="button"
              className="table-export-btn"
              onClick={() => {
                downloadLoadingPassPdf(currentSchedule, activeEvent)
                showToast(
                  `Surat Izin Masuk Dock (${currentSchedule.security_pass_code}.pdf) berhasil diunduh!`,
                  'success'
                )
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Unduh SIM-D (PDF)</span>
            </button>

            <button
              type="button"
              className="btn-ember-primary"
              onClick={() =>
                openModal('kitchen_loading', {
                  eventId: activeEvent?.id || 'ev-01',
                })
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="12" y2="16" />
              </svg>
              <span>Tiket &amp; Ringkasan Cepat</span>
            </button>
          </div>
        </div>

        <div className="loading-control-bottom-row">
          <div className="vendor-filter-chips" role="group" aria-label="Filter Tahapan Loading">
            {[
              { id: 'semua', label: `Semua Tahapan (${stats.total})` },
              { id: 'selesai', label: `Terverifikasi (${stats.completed})` },
              { id: 'menunggu', label: `Menunggu Eksekusi (${stats.pending})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-chip ${slotFilter === tab.id ? 'filter-chip-active' : ''}`}
                onClick={() => {
                  setSlotFilter(tab.id)
                  setCurrentPage(1)
                }}
              >
                {tab.id === 'menunggu' && stats.pending > 0 && (
                  <span className="chip-alert-dot" />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="vendor-jobs-top-actions">
            <div className="table-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                aria-label="Cari acara, kode SIM-D, jam, atau PIC"
                className="table-search-input"
                placeholder="Cari acara, kode SIM-D, jam, atau PIC..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  className="table-search-clear"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {stats.completed > 0 && (
              <button
                type="button"
                className="btn-table-reject"
                disabled={busyKey === 'reset_all'}
                onClick={() => handleBatchSlotAction('reset_all')}
              >
                Reset Acara (0%)
              </button>
            )}

            {stats.completed < stats.total && (
              <button
                type="button"
                className="btn-table-accept"
                disabled={busyKey === 'all_complete'}
                onClick={() => handleBatchSlotAction('all_complete')}
              >
                ✓ Selesaikan Acara (100%)
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditingFleet && (
        <form
          className="vendor-card-panel"
          style={{ padding: '16px 20px' }}
          onSubmit={handleSaveFleetInfo}
        >
          <div className="loading-fleet-form-grid">
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label htmlFor="fleet-input" className="vendor-field-label">
                Unit Armada &amp; Nomor Polisi Chiller ({activeEvent?.wedding_title})
              </label>
              <input
                id="fleet-input"
                type="text"
                className="vendor-field-input"
                value={fleetDraft}
                onChange={(e) => setFleetDraft(e.target.value)}
                required
              />
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label htmlFor="driver-input" className="vendor-field-label">
                Nama Pimpinan Sopir &amp; Kontak WA
              </label>
              <input
                id="driver-input"
                type="text"
                className="vendor-field-input"
                value={driverDraft}
                onChange={(e) => setDriverDraft(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-ember-primary"
              disabled={busyKey === 'update_fleet'}
            >
              {busyKey === 'update_fleet' ? 'Menyimpan...' : 'Simpan Armada ke Database'}
            </button>
          </div>
        </form>
      )}

      <div className="loading-stepper-card">
        <div className="loading-stepper-header">
          <div className="loading-stepper-title-group">
            <span className="loading-stepper-title">
              ALUR PIPELINE BONGKAR MUAT &amp; INSTALASI ({activeEvent?.wedding_title})
            </span>
          </div>
          <div className="readiness-inline-bar-row" style={{ minWidth: '240px' }}>
            <div className="readiness-inline-track">
              <div
                className={`readiness-inline-fill ${
                  stats.percent === 100 ? 'fill-complete' : ''
                }`}
                style={{ width: `${stats.percent}%` }}
              />
            </div>
            <span className="readiness-inline-pct">{stats.percent}%</span>
          </div>
        </div>

        <div className="loading-stepper-grid-5">
          {activeEventSlots.map((slot, idx) => {
            const targetEvId = activeEvent?.id || 'ev-01'
            const isNextActive = idx === firstPendingIndex
            const isBusy = busyKey === `${targetEvId}::${slot.id}`
            return (
              <button
                key={slot.id}
                type="button"
                disabled={isBusy}
                className={`readiness-step-pill-btn ${
                  slot.completed
                    ? 'step-pill-done'
                    : isNextActive
                      ? 'step-pill-active'
                      : ''
                }`}
                onClick={() => handleToggleSlot(targetEvId, slot)}
                title={`Klik untuk ${
                  slot.completed ? 'membatalkan verifikasi' : 'menandai selesai'
                }: ${slot.title}`}
              >
                <div className="step-pill-top">
                  <span className="step-pill-num">
                    TAHAP 0{idx + 1} • {slot.time}
                  </span>
                  {slot.completed ? (
                    <span className="step-pill-icon-done">✓</span>
                  ) : isNextActive ? (
                    <span className="step-pill-icon-active" />
                  ) : (
                    <span className="step-pill-icon-locked">•</span>
                  )}
                </div>
                <span className="step-pill-title">{slot.phase}</span>
                <span className="step-pill-meta">
                  {slot.completed
                    ? `Terverifikasi ${slot.completed_at || 'Selesai'}`
                    : isNextActive
                      ? 'Tahap Berikutnya (Klik Selesai)'
                      : 'Menunggu Giliran'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="vendor-card-panel jobs-table-card">
        <div className="jobs-table-responsive-wrapper">
          <table className="jobs-data-table loading-matrix-table">
            <thead>
              <tr>
                <th
                  className="sortable-th"
                  onClick={() => handleSort('event_time')}
                >
                  <div className="th-sort-wrapper">
                    <span>NO, ACARA &amp; JAM TARGET</span>
                    <span className="th-sort-icon">
                      {sortConfig.key === 'event_time'
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  className="sortable-th"
                  onClick={() => handleSort('activity')}
                >
                  <div className="th-sort-wrapper">
                    <span>AKTIVITAS BONGKAR MUAT &amp; INSTALASI</span>
                    <span className="th-sort-icon">
                      {sortConfig.key === 'activity'
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('dock')}>
                  <div className="th-sort-wrapper">
                    <span>LOKASI DOCK &amp; KODE SIM-D</span>
                    <span className="th-sort-icon">
                      {sortConfig.key === 'dock'
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('pic')}>
                  <div className="th-sort-wrapper">
                    <span>PIC PENGAWAS</span>
                    <span className="th-sort-icon">
                      {sortConfig.key === 'pic'
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </div>
                </th>
                <th>CATATAN LOGISTIK LAPANGAN</th>
                <th
                  className="col-actions text-right sortable-th"
                  onClick={() => handleSort('status')}
                >
                  <div
                    className="th-sort-wrapper"
                    style={{ justifyContent: 'flex-end' }}
                  >
                    <span>STATUS &amp; VERIFIKASI</span>
                    <span className="th-sort-icon">
                      {sortConfig.key === 'status'
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <strong className="cell-primary-text">
                        Tidak Ada Tahapan Loading yang Sesuai Filter
                      </strong>
                      <span className="cell-sub-text">
                        Tidak ditemukan tahapan bongkar muat untuk kombinasi filter status atau kata kunci pencarian saat ini.
                      </span>
                      {(slotFilter !== 'semua' || searchQuery.trim() !== '') && (
                        <button
                          type="button"
                          className="btn-table-detail"
                          onClick={() => {
                            setSlotFilter('semua')
                            setSearchQuery('')
                            setCurrentPage(1)
                          }}
                        >
                          Reset Filter &amp; Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map(
                  ({ rowKey, eventId, eventObj, scheduleObj, slotIndex, slot }) => {
                    const isEditingThisNote = editingSlotKey === rowKey
                    const isBusy = busyKey === rowKey
                    const picNameOnly = slot.pic.split('(')[0].trim()
                    const picRoleOnly = slot.pic.includes('(')
                      ? slot.pic.slice(slot.pic.indexOf('(')).replace(/[()]/g, '')
                      : 'Koordinator Lapangan'

                    return (
                      <tr
                        key={rowKey}
                        className={`jobs-table-row ${
                          slot.completed ? 'row-completed-highlight' : ''
                        }`}
                      >
                        <td className="col-date">
                          <div className="loading-slot-time-cell">
                            <span
                              className={`loading-slot-index ${
                                slot.completed ? 'index-done' : ''
                              }`}
                            >
                              0{slotIndex + 1}
                            </span>
                            <div className="cell-date-box">
                              <strong className="cell-primary-text text-ember">
                                {slot.time}
                              </strong>
                              <span className="cell-category-tag">{slot.phase}</span>
                              <span className="cell-sub-text">
                                {eventObj?.couple_short || eventObj?.wedding_title} •{' '}
                                {formatShortDateID(eventObj?.event_date)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="cell-event-box" style={{ maxWidth: '370px' }}>
                            <strong className="cell-primary-text">{slot.title}</strong>
                            <span className="cell-sub-text">{slot.detail}</span>
                          </div>
                        </td>

                        <td>
                          <div className="cell-venue-box">
                            <strong className="cell-primary-text">
                              {slotIndex === 0 || slotIndex === 4
                                ? scheduleObj.dock_gate
                                : scheduleObj.staging_area}
                            </strong>
                            <span className="cell-sub-text">
                              {eventObj?.venue} • PASS:{' '}
                              <strong>{scheduleObj.security_pass_code}</strong>
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="loading-pic-cell">
                            <span className="loading-pic-avatar">
                              {getInitials(slot.pic)}
                            </span>
                            <div className="cell-date-box">
                              <strong className="cell-primary-text">{picNameOnly}</strong>
                              <span className="cell-sub-text">{picRoleOnly}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {!isEditingThisNote ? (
                            slot.note ? (
                              <div className="loading-note-badge">
                                <span>{slot.note}</span>
                              </div>
                            ) : (
                              <span className="loading-note-empty">
                                Belum ada catatan lapangan
                              </span>
                            )
                          ) : (
                            <div
                              className="drawer-step-input-row"
                              style={{ minWidth: '250px' }}
                            >
                              <input
                                type="text"
                                aria-label="Catatan logistik tahapan loading"
                                className="drawer-step-input"
                                placeholder="Tulis catatan suhu, nopol, atau kondisi..."
                                value={slotNotes[rowKey] ?? slot.note ?? ''}
                                onChange={(e) =>
                                  setSlotNotes((prev) => ({
                                    ...prev,
                                    [rowKey]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className="btn-table-accept"
                                disabled={isBusy}
                                onClick={() =>
                                  handleToggleSlot(eventId, slot, slot.completed)
                                }
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                aria-label="Batalkan ubah catatan"
                                className="secondary-surface-btn btn-sm-action"
                                onClick={() => setEditingSlotKey(null)}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="col-actions text-right">
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '7px',
                            }}
                          >
                            {slot.completed ? (
                              <span className="table-status-pill status-pill-accepted">
                                ✓ Terverifikasi{' '}
                                {slot.completed_at ? `(${slot.completed_at})` : ''}
                              </span>
                            ) : (
                              <span className="table-status-pill status-pill-pending">
                                <span className="pulse-dot" /> Menunggu Eksekusi
                              </span>
                            )}

                            <div className="table-action-button-group">
                              <button
                                type="button"
                                className="secondary-surface-btn btn-sm-action"
                                onClick={() => {
                                  setSlotNotes((prev) => ({
                                    ...prev,
                                    [rowKey]: slot.note || '',
                                  }))
                                  setEditingSlotKey((prev) =>
                                    prev === rowKey ? null : rowKey
                                  )
                                }}
                              >
                                {slot.note ? 'Ubah Catatan' : '+ Catatan'}
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                className={
                                  slot.completed
                                    ? 'btn-table-detail'
                                    : 'btn-table-accept'
                                }
                                onClick={() => handleToggleSlot(eventId, slot)}
                              >
                                {slot.completed ? 'Batalkan' : '✓ Verifikasi'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="jobs-table-footer-bar">
          <div className="jobs-footer-left">
            <span>
              Menampilkan{' '}
              <strong>
                {totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1} -{' '}
                {Math.min(safePage * pageSize, totalFiltered)}
              </strong>{' '}
              dari <strong>{totalFiltered}</strong> tahapan loading (
              {events.length} Acara Terjadwal)
            </span>
          </div>

          <div className="jobs-footer-right">
            <div className="table-pagination-controls">
              <div className="table-page-size-group">
                <span>Baris per halaman:</span>
                <select
                  aria-label="Jumlah baris per halaman"
                  className="table-page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value={5}>5 Baris</option>
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
              </div>

              <div className="table-page-buttons">
                <button
                  type="button"
                  aria-label="Halaman Pertama"
                  className="table-page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title="Halaman Pertama"
                >
                  «
                </button>
                <button
                  type="button"
                  className="table-page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Seb
                </button>

                {pageNumbers.map((pg, i) =>
                  pg === '...' ? (
                    <span
                      key={`ellipsis-${i}`}
                      style={{ padding: '0 4px', color: 'var(--text-tertiary)' }}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pg}
                      type="button"
                      className={`table-page-btn ${safePage === pg ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="table-page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Sel ›
                </button>
                <button
                  type="button"
                  aria-label="Halaman Terakhir"
                  className="table-page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Halaman Terakhir"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MenuManifestPage() {
  const { dashboardData, showToast, openModal, reloadDashboard, refreshTick } =
    useVendor()
  const events = useMemo(
    () => dashboardData?.events_this_week || [],
    [dashboardData]
  )

  const [manifestsMap, setManifestsMap] = useState(
    () => dashboardData?.menu_manifests || VENDOR_MENU_MANIFESTS
  )
  const [isLoadingManifests, setIsLoadingManifests] = useState(false)
  const [manifestError, setManifestError] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState('ev-01')
  const [searchMenu, setSearchMenu] = useState('')
  const [qcFilter, setQcFilter] = useState('semua')
  const [categoryFilter, setCategoryFilter] = useState('semua')
  const [sortConfig, setSortConfig] = useState({
    key: 'category',
    direction: 'asc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [editingItemKey, setEditingItemKey] = useState(null)
  const [itemEditDraft, setItemEditDraft] = useState({
    notes: '',
    serving_temp: '',
    qty: '',
  })
  const [isUpdatingItem, setIsUpdatingItem] = useState(null)

  const [isEditingLogistics, setIsEditingLogistics] = useState(false)
  const [logisticsForm, setLogisticsForm] = useState({
    vehicle_plate: '',
    driver_phone: '',
    departure_time: '',
  })

  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    category: 'Buffet Utama',
    name: '',
    qty: '',
    serving_temp: 'Panas (>= 68°C)',
    notes: '',
  })

  useEffect(() => {
    let isMounted = true
    vendorService
      .getMenuManifests()
      .then((data) => {
        if (isMounted && data) {
          setManifestsMap(data)
          setManifestError(null)
        }
      })
      .catch(() => {
        if (isMounted) {
          setManifestError(
            'Gagal memuat manifest hidangan dari server. Menampilkan salinan data lokal.'
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingManifests(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [refreshTick])

  const handleRetryFetchManifests = () => {
    setIsLoadingManifests(true)
    setManifestError(null)
    vendorService
      .getMenuManifests()
      .then((data) => {
        if (data) {
          setManifestsMap(data)
        }
      })
      .catch(() => {
        setManifestError('Koneksi ke server database belum berhasil. Silakan coba lagi.')
      })
      .finally(() => {
        setIsLoadingManifests(false)
      })
  }

  const normalizeManifest = (raw, evId) => {
    const fallback = VENDOR_MENU_MANIFESTS[evId] || VENDOR_MENU_MANIFESTS['ev-01'] || {}
    const rawItems = raw?.items || fallback.items || []
    return {
      event_id: raw?.event_id || evId,
      manifest_number:
        raw?.manifest_number || raw?.doc_number || fallback.doc_number || 'SJ/BRC/2026/001',
      package_name:
        raw?.package_name || raw?.buffet_package || fallback.buffet_package || 'Paket Katering Resmi',
      total_portions:
        raw?.total_portions || raw?.total_pax || fallback.total_pax || 1000,
      vip_portions: raw?.vip_portions || 120,
      crew_portions: raw?.crew_portions || 70,
      departure_time:
        raw?.departure_time || raw?.departure_kitchen || fallback.departure_kitchen || '04:30 WIB dari Dapur Sentral',
      vehicle_plate:
        raw?.vehicle_plate || raw?.fleet_plate || fallback.fleet_plate || 'B 9821 TDF (Isuzu Elf Chiller)',
      driver_phone:
        raw?.driver_phone || raw?.driver_name || fallback.driver_name || 'Supriyanto (0812-9988-1122)',
      items: rawItems.map((it) => ({
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
  }

  const activeEvent = useMemo(() => {
    if (selectedEventId === 'ALL') return events[0] || null
    return events.find((e) => e.id === selectedEventId) || events[0] || null
  }, [events, selectedEventId])

  const currentManifest = useMemo(() => {
    const id = activeEvent?.id || (selectedEventId === 'ALL' ? 'ev-01' : selectedEventId)
    return normalizeManifest(manifestsMap[id], id)
  }, [activeEvent, manifestsMap, selectedEventId])

  const allEnrichedItems = useMemo(() => {
    const eventList =
      events.length > 0
        ? events
        : [
            {
              id: 'ev-01',
              wedding_title: 'Pernikahan Anisa & Rizky',
              bride_groom: 'Anisa & Rizky',
              event_date: '2026-10-25',
              time_slot: '10:00 - 14:00 WIB',
              venue: 'Grand Ballroom Sasana Kriya, TMII',
              portions_or_units: 1200,
            },
          ]

    const list = []
    eventList.forEach((ev) => {
      if (selectedEventId !== 'ALL' && ev.id !== (activeEvent?.id || selectedEventId)) {
        return
      }
      const mf = normalizeManifest(manifestsMap[ev.id], ev.id)
      mf.items.forEach((item, idx) => {
        list.push({
          ...item,
          compositeKey: `${ev.id}::${item.id}`,
          eventId: ev.id,
          itemIndex: idx + 1,
          weddingTitle: ev.wedding_title,
          coupleShort: ev.couple_short || ev.wedding_title.replace('Pernikahan ', ''),
          eventDate: ev.event_date,
          venue: ev.venue,
          manifestNumber: mf.manifest_number,
          packageName: mf.package_name,
        })
      })
    })
    return list
  }, [events, manifestsMap, selectedEventId, activeEvent])

  const qcStats = useMemo(() => {
    const total = allEnrichedItems.length
    const checked = allEnrichedItems.filter((i) => i.qc_checked).length
    const percent = total > 0 ? Math.round((checked * 100) / total) : 0
    const buffetCount = allEnrichedItems.filter((i) =>
      i.category.toLowerCase().includes('buffet')
    ).length
    const stallCount = allEnrichedItems.filter((i) =>
      i.category.toLowerCase().includes('stall')
    ).length
    const dessertCount = total - buffetCount - stallCount
    return {
      total,
      checked,
      unchecked: total - checked,
      percent,
      buffetCount,
      stallCount,
      dessertCount,
    }
  }, [allEnrichedItems])

  const filteredItems = useMemo(() => {
    const list = allEnrichedItems.filter((item) => {
      if (qcFilter === 'lolos' && !item.qc_checked) return false
      if (qcFilter === 'belum' && item.qc_checked) return false
      if (categoryFilter === 'buffet' && !item.category.toLowerCase().includes('buffet')) {
        return false
      }
      if (categoryFilter === 'stall' && !item.category.toLowerCase().includes('stall')) {
        return false
      }
      if (
        categoryFilter === 'dessert' &&
        !item.category.toLowerCase().includes('dessert') &&
        !item.category.toLowerCase().includes('minuman')
      ) {
        return false
      }
      if (!searchMenu.trim()) return true
      const q = searchMenu.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q) ||
        item.serving_temp.toLowerCase().includes(q) ||
        item.weddingTitle.toLowerCase().includes(q) ||
        item.manifestNumber.toLowerCase().includes(q)
      )
    })

    list.sort((a, b) => {
      let valA = ''
      let valB = ''
      switch (sortConfig.key) {
        case 'event':
          valA = `${a.eventDate}_${a.weddingTitle}`.toLowerCase()
          valB = `${b.eventDate}_${b.weddingTitle}`.toLowerCase()
          break
        case 'name':
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
          break
        case 'category':
          valA = `${a.category}_${a.itemIndex}`.toLowerCase()
          valB = `${b.category}_${b.itemIndex}`.toLowerCase()
          break
        case 'qty':
          valA = parseInt(String(a.qty).replace(/\D/g, ''), 10) || 0
          valB = parseInt(String(b.qty).replace(/\D/g, ''), 10) || 0
          break
        case 'temp':
          valA = a.serving_temp.toLowerCase()
          valB = b.serving_temp.toLowerCase()
          break
        case 'status':
          valA = a.qc_checked ? 1 : 0
          valB = b.qc_checked ? 1 : 0
          break
        default:
          valA = a.itemIndex
          valB = b.itemIndex
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [allEnrichedItems, qcFilter, categoryFilter, searchMenu, sortConfig])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, safeCurrentPage, pageSize])

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const syncUpdatedManifest = (eventId, updated) => {
    if (updated) {
      setManifestsMap((prev) => ({
        ...prev,
        [eventId]: updated,
      }))
    }
  }

  const handleToggleItemQC = async (item) => {
    const targetEventId = item.eventId || activeEvent?.id || 'ev-01'
    setIsUpdatingItem(item.compositeKey)
    try {
      const updated = await vendorService.updateMenuManifest(targetEventId, {
        action: 'toggle_qc',
        item_id: item.id,
        qc_checked: !item.qc_checked,
      })
      syncUpdatedManifest(targetEventId, updated)
      await reloadDashboard()
      showToast(
        !item.qc_checked
          ? `Hidangan "${item.name}" diverifikasi Lolos QC dan disimpan ke Supabase.`
          : `Status QC "${item.name}" dikembalikan ke antrean pemeriksaan.`,
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui status QC hidangan.', 'error')
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const handleBatchQC = async (actionType) => {
    const targetEventIds =
      selectedEventId === 'ALL'
        ? events.map((e) => e.id)
        : [activeEvent?.id || selectedEventId]

    setIsUpdatingItem(actionType)
    try {
      for (const evId of targetEventIds) {
        const updated = await vendorService.updateMenuManifest(evId, {
          action: actionType,
        })
        syncUpdatedManifest(evId, updated)
      }
      await reloadDashboard()
      showToast(
        actionType === 'all_complete'
          ? 'Seluruh komponen hidangan telah diverifikasi Lolos QC (100%).'
          : 'Status pemeriksaan QC hidangan telah direset ke 0%.',
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Gagal menjalankan aksi massal QC.', 'error')
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const handleOpenItemEdit = (item) => {
    setEditingItemKey(item.compositeKey)
    setItemEditDraft({
      notes: item.notes || '',
      serving_temp: item.serving_temp || 'Panas (>= 65°C)',
      qty: item.qty || '',
    })
  }

  const handleSaveItemEdit = async (item) => {
    const targetEventId = item.eventId || activeEvent?.id || 'ev-01'
    setIsUpdatingItem(item.compositeKey)
    try {
      const updated = await vendorService.updateMenuManifest(targetEventId, {
        action: 'update_item',
        item_id: item.id,
        notes: itemEditDraft.notes,
        serving_temp: itemEditDraft.serving_temp,
        qty: itemEditDraft.qty,
      })
      syncUpdatedManifest(targetEventId, updated)
      setEditingItemKey(null)
      await reloadDashboard()
      showToast(`Rincian teknis "${item.name}" berhasil disimpan ke database.`, 'success')
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan catatan teknis hidangan.', 'error')
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const handleDeleteItem = async (item) => {
    const targetEventId = item.eventId || activeEvent?.id || 'ev-01'
    setIsUpdatingItem(item.compositeKey)
    try {
      const updated = await vendorService.updateMenuManifest(targetEventId, {
        action: 'delete_item',
        item_id: item.id,
      })
      syncUpdatedManifest(targetEventId, updated)
      setEditingItemKey(null)
      await reloadDashboard()
      showToast(`Item "${item.name}" dihapus dari surat jalan.`, 'success')
    } catch (err) {
      showToast(err.message || 'Gagal menghapus item hidangan.', 'error')
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const handleSaveLogistics = async (e) => {
    e.preventDefault()
    const targetEventId =
      selectedEventId === 'ALL' ? activeEvent?.id || 'ev-01' : selectedEventId
    setIsUpdatingItem('update_logistics')
    try {
      const updated = await vendorService.updateMenuManifest(targetEventId, {
        action: 'update_logistics',
        vehicle_plate: logisticsForm.vehicle_plate,
        driver_phone: logisticsForm.driver_phone,
        departure_time: logisticsForm.departure_time,
      })
      syncUpdatedManifest(targetEventId, updated)
      setIsEditingLogistics(false)
      await reloadDashboard()
      showToast('Data armada & keberangkatan surat jalan berhasil diperbarui.', 'success')
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui data pengiriman.', 'error')
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const handleAddMenuItem = async (e) => {
    e.preventDefault()
    if (!newItemForm.name.trim()) {
      showToast('Nama menu hidangan wajib diisi.', 'error')
      return
    }
    const targetEventId =
      selectedEventId === 'ALL' ? activeEvent?.id || 'ev-01' : selectedEventId
    setIsUpdatingItem('add_item')
    try {
      const updated = await vendorService.updateMenuManifest(targetEventId, {
        action: 'add_item',
        category: newItemForm.category,
        name: newItemForm.name,
        qty: newItemForm.qty || `${currentManifest.total_portions} Porsi`,
        serving_temp: newItemForm.serving_temp,
        notes: newItemForm.notes,
      })
      syncUpdatedManifest(targetEventId, updated)
      setNewItemForm({
        category: 'Buffet Utama',
        name: '',
        qty: '',
        serving_temp: 'Panas (>= 68°C)',
        notes: '',
      })
      setIsAddingItem(false)
      await reloadDashboard()
      showToast('Hidangan baru berhasil ditambahkan ke manifest surat jalan.', 'success')
    } catch (err) {
      showToast(err.message || 'Gagal menambahkan hidangan baru.', 'error')
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const getCategoryBadgeClass = (category) => {
    const lower = String(category || '').toLowerCase()
    if (lower.includes('buffet')) return 'cat-buffet'
    if (lower.includes('stall') || lower.includes('pondokan')) return 'cat-stall'
    return 'cat-dessert'
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Page Title Header */}
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
          <h1 className="vendor-main-title">Surat Jalan &amp; Manifest Hidangan Katering</h1>
          <p className="vendor-header-subtitle">
            Otorisasi surat jalan distribusi pangan, kontrol suhu saji HACCP, dan verifikasi uji kelayakan (QC) sebelum jamuan dibuka.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              No. Surat Jalan: <strong>{currentManifest.manifest_number}</strong>
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

      {/* 4-Card Executive KPI Strip */}
      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">NO. REGISTRASI &amp; PAKET</span>
          <strong className="jobs-kpi-val text-ember">{currentManifest.manifest_number}</strong>
          <span className="jobs-kpi-sub">{currentManifest.package_name}</span>
        </div>
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">KAPASITAS &amp; ALOKASI PORSI</span>
          <strong className="jobs-kpi-val">
            {Number(currentManifest.total_portions).toLocaleString('id-ID')} Pax Total
          </strong>
          <span className="jobs-kpi-sub">
            VIP: {currentManifest.vip_portions} Pax • Kru: {currentManifest.crew_portions} Pax
          </span>
        </div>
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">ARMADA CHILLER &amp; SOPIR</span>
          <strong className="jobs-kpi-val">{currentManifest.vehicle_plate}</strong>
          <span className="jobs-kpi-sub">
            PIC: {currentManifest.driver_phone}
          </span>
        </div>
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">KEPATUHAN QC &amp; RANTAI SUHU</span>
          <strong className="jobs-kpi-val text-green">
            {qcStats.percent}% ({qcStats.checked}/{qcStats.total} Menu)
          </strong>
          <span className="jobs-kpi-sub">
            Buffet: {qcStats.buffetCount} • Stall: {qcStats.stallCount} • Dessert: {qcStats.dessertCount}
          </span>
        </div>
      </div>

      {/* 2-Row Enterprise Command Bar */}
      <div className="loading-control-toolbar-card">
        <div className="loading-control-top-row">
          <div className="loading-context-left">
            <div className="loading-select-shell">
              <span className="loading-select-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <select
                className="loading-event-select"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Pilih Acara Manifest Hidangan"
              >
                <option value="ALL">
                  Semua Jadwal Acara ({events.length} Acara • {allEnrichedItems.length} Item)
                </option>
                {events.map((ev) => {
                  const mf = normalizeManifest(manifestsMap[ev.id], ev.id)
                  const doneCount = mf.items.filter((i) => i.qc_checked).length
                  const pct = mf.items.length > 0 ? Math.round((doneCount * 100) / mf.items.length) : 0
                  return (
                    <option key={ev.id} value={ev.id}>
                      {ev.wedding_title} ({formatShortDateID(ev.event_date)} • {mf.manifest_number} • {pct}% QC)
                    </option>
                  )
                })}
              </select>
              <span className="loading-select-chevron" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <div className="loading-quick-pills-track" role="group" aria-label="Navigasi Cepat Acara">
              <button
                type="button"
                className={`loading-quick-pill ${selectedEventId === 'ALL' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedEventId('ALL')
                  setCurrentPage(1)
                }}
              >
                Semua ({events.length})
              </button>
              {events.length > 0 && (
                <>
                  <button
                    type="button"
                    className="loading-quick-pill pill-icon-only"
                    onClick={() => {
                      const idx = events.findIndex((e) => e.id === (activeEvent?.id || selectedEventId))
                      const prevIdx = idx <= 0 ? events.length - 1 : idx - 1
                      setSelectedEventId(events[prevIdx].id)
                      setCurrentPage(1)
                    }}
                    title="Acara Sebelumnya"
                    aria-label="Acara Sebelumnya"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="loading-quick-pill pill-icon-only"
                    onClick={() => {
                      const idx = events.findIndex((e) => e.id === (activeEvent?.id || selectedEventId))
                      const nextIdx = idx < 0 || idx >= events.length - 1 ? 0 : idx + 1
                      setSelectedEventId(events[nextIdx].id)
                      setCurrentPage(1)
                    }}
                    title="Acara Berikutnya"
                    aria-label="Acara Berikutnya"
                  >
                    ›
                  </button>
                </>
              )}
              <span
                className={`loading-event-tab-pct ${
                  qcStats.percent === 100
                    ? 'pct-done'
                    : qcStats.percent > 0
                      ? 'pct-progress'
                      : ''
                }`}
              >
                {qcStats.percent}% Lolos QC
              </span>
            </div>
          </div>

          <div className="loading-toolbar-actions">
            <button
              type="button"
              className="table-export-btn"
              onClick={() => {
                setIsAddingItem((prev) => !prev)
                setIsEditingLogistics(false)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{isAddingItem ? 'Tutup Form Menu' : 'Tambah Hidangan'}</span>
            </button>
            <button
              type="button"
              className="table-export-btn"
              onClick={() => {
                setLogisticsForm({
                  vehicle_plate: currentManifest.vehicle_plate || '',
                  driver_phone: currentManifest.driver_phone || '',
                  departure_time: currentManifest.departure_time || '',
                })
                setIsEditingLogistics((prev) => !prev)
                setIsAddingItem(false)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>{isEditingLogistics ? 'Tutup Form Pengiriman' : 'Ubah Pengiriman'}</span>
            </button>
            <button
              type="button"
              className="table-export-btn"
              onClick={() => {
                downloadMenuManifestPdf(currentManifest, activeEvent)
                showToast(
                  `Surat Jalan ${currentManifest.manifest_number} berhasil diunduh (PDF).`,
                  'success'
                )
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Unduh Surat Jalan (PDF)</span>
            </button>
            <button
              type="button"
              className="btn-ember-primary"
              onClick={() =>
                openModal('manifest_menu', {
                  eventId: activeEvent?.id || 'ev-01',
                })
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="12" y2="16" />
              </svg>
              <span>Pratinjau Dokumen</span>
            </button>
          </div>
        </div>

        {/* Row 2: Filters, Search, and Batch QC */}
        <div className="loading-control-bottom-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div className="vendor-filter-chips" role="group" aria-label="Filter Status QC">
              {[
                { id: 'semua', label: `Semua (${qcStats.total})` },
                { id: 'lolos', label: `Lolos QC (${qcStats.checked})` },
                { id: 'belum', label: `Belum QC (${qcStats.unchecked})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`filter-chip ${qcFilter === tab.id ? 'filter-chip-active' : ''}`}
                  onClick={() => {
                    setQcFilter(tab.id)
                    setCurrentPage(1)
                  }}
                >
                  {tab.id === 'belum' && qcStats.unchecked > 0 && (
                    <span className="chip-alert-dot" />
                  )}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="vendor-filter-chips" role="group" aria-label="Filter Kategori Menu">
              {[
                { id: 'semua', label: 'Semua Kategori' },
                { id: 'buffet', label: `Buffet (${qcStats.buffetCount})` },
                { id: 'stall', label: `Stall (${qcStats.stallCount})` },
                { id: 'dessert', label: `Dessert (${qcStats.dessertCount})` },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-chip ${categoryFilter === cat.id ? 'filter-chip-active' : ''}`}
                  onClick={() => {
                    setCategoryFilter(cat.id)
                    setCurrentPage(1)
                  }}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="vendor-jobs-top-actions">
            <div className="table-search-box">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                aria-label="Cari menu, suhu, catatan, atau nomor surat jalan"
                className="table-search-input"
                placeholder="Cari menu, suhu, catatan, nomor SJ..."
                value={searchMenu}
                onChange={(e) => {
                  setSearchMenu(e.target.value)
                  setCurrentPage(1)
                }}
              />
              {searchMenu && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  className="table-search-clear"
                  onClick={() => {
                    setSearchMenu('')
                    setCurrentPage(1)
                  }}
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            {qcStats.checked > 0 && (
              <button
                type="button"
                className="btn-table-reject"
                disabled={isUpdatingItem !== null}
                onClick={() => handleBatchQC('reset_all')}
              >
                Reset QC (0%)
              </button>
            )}
            {qcStats.percent < 100 && (
              <button
                type="button"
                className="btn-table-accept"
                disabled={isUpdatingItem !== null}
                onClick={() => handleBatchQC('all_complete')}
              >
                ✓ Lolos QC Semua (100%)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Edit Logistics Form */}
      {isEditingLogistics && (
        <form
          className="vendor-card-panel"
          style={{ padding: '16px 20px' }}
          onSubmit={handleSaveLogistics}
        >
          <div className="manifest-logistics-grid">
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Nomor Polisi &amp; Jenis Armada Chiller</label>
              <input
                type="text"
                className="vendor-field-input"
                value={logisticsForm.vehicle_plate}
                onChange={(e) =>
                  setLogisticsForm((prev) => ({ ...prev, vehicle_plate: e.target.value }))
                }
                placeholder="Contoh: B 9821 TDF (Isuzu Elf Chiller)"
                required
              />
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Sopir &amp; Kontak Lapangan</label>
              <input
                type="text"
                className="vendor-field-input"
                value={logisticsForm.driver_phone}
                onChange={(e) =>
                  setLogisticsForm((prev) => ({ ...prev, driver_phone: e.target.value }))
                }
                placeholder="Contoh: Supriyanto (0812-9988-1122)"
                required
              />
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Jadwal Keberangkatan Dapur Sentral</label>
              <input
                type="text"
                className="vendor-field-input"
                value={logisticsForm.departure_time}
                onChange={(e) =>
                  setLogisticsForm((prev) => ({ ...prev, departure_time: e.target.value }))
                }
                placeholder="Contoh: 04:00 WIB dari Dapur Sentral Tebet"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                className="btn-ember-primary"
                disabled={isUpdatingItem === 'update_logistics'}
              >
                {isUpdatingItem === 'update_logistics' ? 'Menyimpan...' : 'Simpan Pengiriman'}
              </button>
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => setIsEditingLogistics(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Inline Add Menu Item Form */}
      {isAddingItem && (
        <form
          className="vendor-card-panel"
          style={{ padding: '16px 20px' }}
          onSubmit={handleAddMenuItem}
        >
          <div className="manifest-add-item-grid">
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Nama Menu / Pondokan</label>
              <input
                type="text"
                className="vendor-field-input"
                value={newItemForm.name}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Contoh: Sate Ayam Ponorogo & Lontong"
                required
              />
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Kategori Sajian</label>
              <select
                className="vendor-field-input"
                value={newItemForm.category}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                <option value="Buffet Utama">Buffet Utama</option>
                <option value="Stall Pondokan">Stall Pondokan</option>
                <option value="Dessert & Minuman">Dessert &amp; Minuman</option>
              </select>
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Kuantitas Saji</label>
              <input
                type="text"
                className="vendor-field-input"
                value={newItemForm.qty}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, qty: e.target.value }))
                }
                placeholder={`${currentManifest.total_portions} Porsi`}
              />
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Standar Suhu (HACCP)</label>
              <input
                type="text"
                className="vendor-field-input"
                value={newItemForm.serving_temp}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, serving_temp: e.target.value }))
                }
                placeholder="Panas (>= 68°C)"
              />
            </div>
            <div className="vendor-modal-field" style={{ margin: 0 }}>
              <label className="vendor-field-label">Catatan Peralatan &amp; Teknis</label>
              <input
                type="text"
                className="vendor-field-input"
                value={newItemForm.notes}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Wadah termal / pemanas induksi..."
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                className="btn-ember-primary"
                disabled={isUpdatingItem === 'add_item'}
              >
                {isUpdatingItem === 'add_item' ? 'Menambah...' : '+ Simpan Menu'}
              </button>
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => setIsAddingItem(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Loading & Error Banners */}
      {isLoadingManifests && (
        <div className="loading-state-banner" role="status" aria-live="polite">
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              Menyinkronkan surat jalan &amp; manifest hidangan dari Supabase PostgreSQL...
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Memuat rincian kuota porsi, standar suhu saji HACCP, dan status pemeriksaan QC dapur.
            </p>
          </div>
        </div>
      )}

      {manifestError && (
        <div className="loading-state-banner state-error" role="alert">
          <div>
            <strong style={{ fontSize: '13px', color: '#b91c1c' }}>
              Peringatan Sinkronisasi Manifest Hidangan
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {manifestError}
            </p>
          </div>
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={handleRetryFetchManifests}
          >
            Coba Muat Ulang
          </button>
        </div>
      )}

      {/* Official Manifest Document Header Banner */}
      <div className="loading-stepper-card">
        <div className="manifest-sheet-header" style={{ marginBottom: 0, paddingBottom: '12px' }}>
          <div>
            <span className="manifest-company-name">
              CV BERKAH RASA NUSANTARA • DIVISI LOGISTIK &amp; KENDALI MUTU PANGAN (HACCP)
            </span>
            <h2 className="manifest-doc-title">
              {selectedEventId === 'ALL'
                ? `MATRIKS GABUNGAN SURAT JALAN & MANIFEST (${events.length} ACARA)`
                : `SURAT JALAN & MANIFEST HIDANGAN RESMI • ${activeEvent?.wedding_title || ''}`}
            </h2>
            <span className="manifest-doc-num">
              No. Registrasi: {currentManifest.manifest_number} • Paket: {currentManifest.package_name} • Keberangkatan: {currentManifest.departure_time}
            </span>
          </div>
          <div className="manifest-sheet-qr">
            <div className="qr-verified-badge">
              <span className="qr-check-icon">✓</span>
              <span>
                {qcStats.percent === 100
                  ? 'LOLOS QC LENGKAP (100%)'
                  : `TERVERIFIKASI QC (${qcStats.percent}%)`}
              </span>
            </div>
            <span className="qr-sub">Database: Supabase PostgreSQL Production</span>
          </div>
        </div>

        <div className="readiness-inline-bar-row">
          <div className="readiness-inline-track">
            <div
              className={`readiness-inline-fill ${
                qcStats.percent === 100 ? 'fill-complete' : ''
              }`}
              style={{ width: `${qcStats.percent}%` }}
            />
          </div>
          <span className="readiness-inline-pct">{qcStats.percent}% Lolos QC</span>
        </div>
      </div>

      {/* High-Density Sortable Enterprise Table */}
      <div className="vendor-card-panel jobs-table-card">
        <div className="jobs-table-responsive-wrapper">
          <table className="jobs-data-table loading-matrix-table">
            <thead>
              <tr>
                {selectedEventId === 'ALL' && (
                  <th
                    className="sortable-th"
                    onClick={() => requestSort('event')}
                    style={{ minWidth: '185px' }}
                  >
                    <div className="th-sort-wrapper">
                      <span>ACARA &amp; NO. SURAT JALAN</span>
                      <span className="th-sort-icon">{getSortIcon('event')}</span>
                    </div>
                  </th>
                )}
                <th
                  className="sortable-th"
                  onClick={() => requestSort('name')}
                  style={{ minWidth: '250px' }}
                >
                  <div className="th-sort-wrapper">
                    <span>NO &amp; KOMPONEN HIDANGAN</span>
                    <span className="th-sort-icon">{getSortIcon('name')}</span>
                  </div>
                </th>
                <th
                  className="sortable-th"
                  onClick={() => requestSort('category')}
                  style={{ minWidth: '140px' }}
                >
                  <div className="th-sort-wrapper">
                    <span>KATEGORI SAJIAN</span>
                    <span className="th-sort-icon">{getSortIcon('category')}</span>
                  </div>
                </th>
                <th
                  className="sortable-th"
                  onClick={() => requestSort('qty')}
                  style={{ minWidth: '130px' }}
                >
                  <div className="th-sort-wrapper">
                    <span>KUANTITAS SAJI</span>
                    <span className="th-sort-icon">{getSortIcon('qty')}</span>
                  </div>
                </th>
                <th
                  className="sortable-th"
                  onClick={() => requestSort('temp')}
                  style={{ minWidth: '155px' }}
                >
                  <div className="th-sort-wrapper">
                    <span>STANDAR SUHU (HACCP)</span>
                    <span className="th-sort-icon">{getSortIcon('temp')}</span>
                  </div>
                </th>
                <th style={{ minWidth: '230px' }}>CATATAN PERALATAN &amp; LAPANGAN</th>
                <th
                  className="col-actions text-right sortable-th"
                  onClick={() => requestSort('status')}
                  style={{ minWidth: '220px' }}
                >
                  <div
                    className="th-sort-wrapper"
                    style={{ justifyContent: 'flex-end' }}
                  >
                    <span>STATUS &amp; OTORISASI QC</span>
                    <span className="th-sort-icon">{getSortIcon('status')}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedEventId === 'ALL' ? 7 : 6}
                    style={{ textAlign: 'center', padding: '36px 20px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <strong className="cell-primary-text">
                        Tidak Ada Item Hidangan yang Sesuai Filter
                      </strong>
                      <span className="cell-sub-text">
                        Ubah filter kategori/status QC atau hapus kata kunci pencarian untuk menampilkan manifest.
                      </span>
                      <button
                        type="button"
                        className="btn-table-detail"
                        onClick={() => {
                          setSearchMenu('')
                          setQcFilter('semua')
                          setCategoryFilter('semua')
                          setCurrentPage(1)
                        }}
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isEditingThis = editingItemKey === item.compositeKey
                  const isBusy = isUpdatingItem === item.compositeKey
                  const rowNumber = String(
                    (safeCurrentPage - 1) * pageSize + idx + 1
                  ).padStart(2, '0')

                  return (
                    <tr
                      key={item.compositeKey}
                      className={`jobs-table-row ${
                        item.qc_checked ? 'row-completed-highlight' : ''
                      }`}
                    >
                      {selectedEventId === 'ALL' && (
                        <td>
                          <div className="cell-date-box">
                            <strong className="cell-primary-text">
                              {item.weddingTitle}
                            </strong>
                            <span className="cell-sub-text">
                              {formatShortDateID(item.eventDate)} • {item.manifestNumber}
                            </span>
                          </div>
                        </td>
                      )}

                      <td>
                        <div className="loading-slot-time-cell">
                          <span
                            className={`loading-slot-index ${
                              item.qc_checked ? 'index-done' : ''
                            }`}
                          >
                            {rowNumber}
                          </span>
                          <div className="cell-event-box">
                            <strong className="cell-primary-text">
                              {item.name}
                            </strong>
                            <span className="cell-sub-text">
                              Kode Item: <strong>{item.id.toUpperCase()}</strong> • {item.packageName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`manifest-cat-badge ${getCategoryBadgeClass(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </td>

                      <td>
                        <strong className="portion-badge-highlight">
                          {item.qty}
                        </strong>
                      </td>

                      <td>
                        <span className="manifest-temp-pill">{item.serving_temp}</span>
                      </td>

                      <td>
                        {isEditingThis ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              minWidth: '240px',
                            }}
                          >
                            <input
                              type="text"
                              className="drawer-step-input"
                              placeholder="Catatan termos / chafing dish / suhu aktual..."
                              value={itemEditDraft.notes}
                              onChange={(e) =>
                                setItemEditDraft((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="text"
                                className="drawer-step-input"
                                style={{ flex: 1 }}
                                placeholder="Standar suhu..."
                                value={itemEditDraft.serving_temp}
                                onChange={(e) =>
                                  setItemEditDraft((prev) => ({
                                    ...prev,
                                    serving_temp: e.target.value,
                                  }))
                                }
                              />
                              <input
                                type="text"
                                className="drawer-step-input"
                                style={{ width: '115px' }}
                                placeholder="Kuantitas..."
                                value={itemEditDraft.qty}
                                onChange={(e) =>
                                  setItemEditDraft((prev) => ({
                                    ...prev,
                                    qty: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ) : item.notes ? (
                          <div className="loading-note-badge">
                            <span>{item.notes}</span>
                          </div>
                        ) : (
                          <span className="loading-note-empty">
                            Belum ada catatan peralatan
                          </span>
                        )}
                      </td>

                      <td className="col-actions text-right">
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '7px',
                          }}
                        >
                          {item.qc_checked ? (
                            <span className="table-status-pill status-pill-accepted">
                              ✓ Lolos QC {item.qc_checked_at ? `(${item.qc_checked_at})` : ''}
                            </span>
                          ) : (
                            <span className="table-status-pill status-pill-pending">
                              <span className="pulse-dot" /> Belum QC
                            </span>
                          )}

                          <div className="table-action-button-group">
                            {isEditingThis ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-table-accept"
                                  disabled={isBusy}
                                  onClick={() => handleSaveItemEdit(item)}
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  className="btn-table-reject"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteItem(item)}
                                  title="Hapus item dari surat jalan"
                                >
                                  Hapus
                                </button>
                                <button
                                  type="button"
                                  className="secondary-surface-btn btn-sm-action"
                                  onClick={() => setEditingItemKey(null)}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="secondary-surface-btn btn-sm-action"
                                  onClick={() => handleOpenItemEdit(item)}
                                >
                                  {item.notes ? 'Ubah Catatan' : '+ Catatan'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  className={
                                    item.qc_checked
                                      ? 'btn-table-detail'
                                      : 'btn-table-accept'
                                  }
                                  onClick={() => handleToggleItemQC(item)}
                                >
                                  {isBusy
                                    ? 'Menyimpan...'
                                    : item.qc_checked
                                      ? 'Batalkan QC'
                                      : '✓ Lolos QC'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Footer */}
        <div className="jobs-table-footer-bar">
          <div className="jobs-footer-left">
            <span>
              Menampilkan{' '}
              <strong>
                {filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1} -{' '}
                {Math.min(safeCurrentPage * pageSize, filteredItems.length)}
              </strong>{' '}
              dari <strong>{filteredItems.length}</strong> komponen hidangan
            </span>
          </div>

          <div className="jobs-footer-right">
            <div className="table-pagination-controls">
              <div className="table-page-size-group">
                <span>Baris per halaman:</span>
                <select
                  aria-label="Jumlah baris per halaman"
                  className="table-page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value={5}>5 Baris</option>
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
              </div>

              <div className="table-page-buttons">
                <button
                  type="button"
                  aria-label="Halaman Pertama"
                  className="table-page-btn"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title="Halaman Pertama"
                >
                  «
                </button>
                <button
                  type="button"
                  className="table-page-btn"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Seb
                </button>
                <button type="button" className="table-page-btn active">
                  {safeCurrentPage} / {totalPages}
                </button>
                <button
                  type="button"
                  className="table-page-btn"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sel ›
                </button>
                <button
                  type="button"
                  aria-label="Halaman Terakhir"
                  className="table-page-btn"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Halaman Terakhir"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
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
  const { dashboardData, showToast, openModal, reloadDashboard, refreshTick } =
    useVendor()

  const [liveProfile, setLiveProfile] = useState(
    () => dashboardData?.vendor_profile || {}
  )
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('semua')
  const [searchQuery, setSearchQuery] = useState('')

  const [formState, setFormState] = useState({
    name: '',
    legal_name: '',
    category: '',
    pic_name: '',
    pic_role: '',
    phone: '',
    email: '',
    npwp_number: '',
    nib_number: '',
    halal_cert: '',
    hygiene_cert: '',
    kitchen_capacity: '',
    fleet_info: '',
    service_crew_total: '',
    kitchen_address: '',
  })

  const fetchLatestProfile = async () => {
    setIsLoadingProfile(true)
    setProfileError(null)
    try {
      const data = await vendorService.getVendorProfile()
      if (data) {
        setLiveProfile(data)
      }
    } catch (err) {
      setProfileError(
        err?.message || 'Gagal menyinkronkan profil vendor dari server.'
      )
    } finally {
      setIsLoadingProfile(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    vendorService
      .getVendorProfile()
      .then((data) => {
        if (isMounted && data) {
          setLiveProfile(data)
          setProfileError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProfileError(
            err?.message || 'Gagal menyinkronkan profil vendor dari server.'
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProfile(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [refreshTick])

  const profile = useMemo(
    () => ({
      ...(dashboardData?.vendor_profile || {}),
      ...(liveProfile || {}),
    }),
    [dashboardData, liveProfile]
  )

  const handleStartEdit = () => {
    setFormState({
      name: profile.name || 'Berkah Rasa Premium Catering',
      legal_name: profile.legal_name || 'CV Berkah Rasa Nusantara',
      category: profile.category || 'Katering Pernikahan & Jamuan VIP',
      pic_name: profile.pic_name || 'Hendra Kusuma',
      pic_role: profile.pic_role || 'Direktur Operasional',
      phone: profile.phone || '+62 812-3456-7890',
      email: profile.email || 'vendor@serasiwo.com',
      npwp_number: profile.npwp_number || '02.841.992.1-043.000',
      nib_number: profile.nib_number || '9120300881421',
      halal_cert: profile.halal_cert || 'ID3111000028911021 (MUI & BPJPH Aktif)',
      hygiene_cert:
        profile.hygiene_cert || 'Dinkes DKI Jakarta Golongan B (Valid)',
      kitchen_capacity:
        profile.kitchen_capacity || 'Hingga 5.000 Porsi / Hari',
      fleet_info: profile.fleet_info || '4 Unit Truk Box Isuzu Chiller',
      service_crew_total:
        profile.service_crew_total || '65 Personel Tersertifikasi Higiene',
      kitchen_address:
        profile.kitchen_address ||
        'Jl. Danau Sunter Utara No. 42, Jakarta Utara',
    })
    setIsEditing(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const updated = await vendorService.updateVendorProfile(formState)
      setLiveProfile(updated)
      await reloadDashboard()
      setIsEditing(false)
      showToast(
        'Profil badan usaha, sertifikasi, dan kapasitas dapur berhasil disimpan ke database.',
        'success'
      )
    } catch (err) {
      showToast(
        err?.message || 'Gagal menyimpan pembaruan profil mitra.',
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyValue = (label, value) => {
    if (!value) return
    navigator.clipboard?.writeText(String(value))
    showToast(`${label} berhasil disalin ke clipboard.`, 'success')
  }

  const handleDownloadPdf = () => {
    downloadVendorProfilePdf(profile)
    showToast(
      'Dokumen Company Profile & Sertifikasi Mitra (PDF) berhasil diunduh.',
      'success'
    )
  }

  const specificationRows = useMemo(
    () => [
      {
        id: 'SPEC-LEG-01',
        categoryKey: 'legalitas',
        categoryLabel: 'Legalitas & Pajak',
        title: 'Entitas Badan Hukum & Akta Usaha',
        subtitle: 'Badan usaha resmi pengelola kontrak kerja sama katering WO',
        value: `${profile.legal_name || 'CV Berkah Rasa Nusantara'} (${profile.name || 'Berkah Rasa Premium Catering'})`,
        authority: 'Kemenkumham RI & Direktorat Vendor WO',
        status: 'Terverifikasi Aktif',
      },
      {
        id: 'SPEC-LEG-02',
        categoryKey: 'legalitas',
        categoryLabel: 'Legalitas & Pajak',
        title: 'Nomor Pokok Wajib Pajak (NPWP) & NIB OSS',
        subtitle: 'Kepatuhan perpajakan PPh 23 dan izin berusaha berbasis risiko',
        value: `NPWP: ${profile.npwp_number || '02.841.992.1-043.000'} | NIB: ${profile.nib_number || '9120300881421'}`,
        authority: 'DJP Kemenkeu & Kementerian Investasi / BKPM',
        status: 'Valid & Terdaftar',
      },
      {
        id: 'SPEC-LEG-03',
        categoryKey: 'legalitas',
        categoryLabel: 'Sertifikasi Pangan',
        title: 'Sertifikat Halal Resmi MUI & BPJPH',
        subtitle: 'Jaminan kehalalan bahan baku, rumah potong, dan proses pengolahan',
        value: profile.halal_cert || 'ID3111000028911021 (MUI & BPJPH Aktif)',
        authority: 'BPJPH Kemenag RI & LPPOM MUI',
        status: 'Lulus Audit Halal',
      },
      {
        id: 'SPEC-LEG-04',
        categoryKey: 'legalitas',
        categoryLabel: 'Sertifikasi Pangan',
        title: 'Sertifikat Laik Higiene Sanitasi Jasaboga',
        subtitle: 'Kelayakan sanitasi dapur produksi skala besar untuk jamuan VIP',
        value: profile.hygiene_cert || 'Dinkes DKI Jakarta Golongan B (Valid)',
        authority: 'Dinas Kesehatan Provinsi DKI Jakarta',
        status: 'Golongan B Aktif',
      },
      {
        id: 'SPEC-FAC-01',
        categoryKey: 'fasilitas',
        categoryLabel: 'Kapasitas Dapur',
        title: 'Kapasitas Produksi Harian Dapur Sentral',
        subtitle: 'Batas maksimum produksi aman dengan kendali mutu suhu HACCP',
        value: profile.kitchen_capacity || 'Hingga 5.000 Porsi / Hari',
        authority: 'Audit Fasilitas Produksi SerasiWO',
        status: 'Siap Operasional',
      },
      {
        id: 'SPEC-FAC-02',
        categoryKey: 'fasilitas',
        categoryLabel: 'Armada Logistik',
        title: 'Armada Distribusi Berpendingin (Cold-Chain Fleet)',
        subtitle: 'Unit kendaraan box berinsulasi termal untuk pengiriman ke venue',
        value: profile.fleet_info || '4 Unit Truk Box Isuzu Chiller',
        authority: 'Inspeksi Logistik & Loading Dock WO',
        status: 'Suhu Terkalibrasi',
      },
      {
        id: 'SPEC-FAC-03',
        categoryKey: 'fasilitas',
        categoryLabel: 'Sumber Daya Kru',
        title: 'Kekuatan Personel Dapur & Pramusaji Lapangan',
        subtitle: 'Staf bersertifikat penjamah makanan dan perlengkapan APD lengkap',
        value:
          profile.service_crew_total || '65 Personel Tersertifikasi Higiene',
        authority: 'Standar SDM & Seragam Lapangan SerasiWO',
        status: 'Tersertifikasi APD',
      },
      {
        id: 'SPEC-FAC-04',
        categoryKey: 'fasilitas',
        categoryLabel: 'Lokasi Fasilitas',
        title: 'Alamat Dapur Produksi Sentral & Gudang Logistik',
        subtitle: 'Titik keberangkatan utama armada distribusi dan inspeksi QC',
        value:
          profile.kitchen_address ||
          'Jl. Danau Sunter Utara No. 42, Jakarta Utara',
        authority: 'Verifikasi Geotagging Lapangan WO',
        status: 'Lokasi Terverifikasi',
      },
      {
        id: 'SPEC-PIC-01',
        categoryKey: 'kontak',
        categoryLabel: 'Manajemen & PIC',
        title: 'Penanggung Jawab Operasional Utama (Key Person)',
        subtitle: 'Pejabat berwenang untuk eskalasi operasional H-0 dan kontrak',
        value: `${profile.pic_name || 'Hendra Kusuma'} (${profile.pic_role || 'Direktur Operasional'})`,
        authority: 'Otorisasi Kontak Darurat 24/7',
        status: 'Kontak Siaga Aktif',
      },
      {
        id: 'SPEC-PIC-02',
        categoryKey: 'kontak',
        categoryLabel: 'Kontak & Settlement',
        title: 'Saluran Komunikasi Resmi & Rekening Settlement',
        subtitle: 'Kontak koordinasi cepat dan rekening pencairan termin terverifikasi',
        value: `${profile.phone || '+62 812-3456-7890'} | ${profile.email || 'vendor@serasiwo.com'} | ${profile.bank_name || 'BCA'} ${profile.account_number || '521-0988-123'}`,
        authority: 'Direktorat Keuangan & Operasional WO',
        status: 'Terhubung Sistem',
      },
    ],
    [profile]
  )

  const filteredSpecs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return specificationRows.filter((item) => {
      if (activeCategory !== 'semua' && item.categoryKey !== activeCategory) {
        return false
      }
      if (!q) return true
      return (
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        item.authority.toLowerCase().includes(q)
      )
    })
  }, [specificationRows, activeCategory, searchQuery])

  const categoryCounts = useMemo(
    () => ({
      semua: specificationRows.length,
      legalitas: specificationRows.filter((r) => r.categoryKey === 'legalitas')
        .length,
      fasilitas: specificationRows.filter((r) => r.categoryKey === 'fasilitas')
        .length,
      kontak: specificationRows.filter((r) => r.categoryKey === 'kontak')
        .length,
    }),
    [specificationRows]
  )

  return (
    <div className="vendor-page-container vendor-tab-content">
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Pengaturan Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">
              Profil Katering &amp; Dapur
            </span>
          </div>
          <h1 className="vendor-main-title">
            Profil Katering &amp; Fasilitas Dapur Mitra
          </h1>
          <p className="vendor-header-subtitle">
            Dossier legalitas badan usaha, sertifikasi halal MUI/BPJPH dan
            higiene jasaboga, serta kapasitas produksi harian dapur sentral.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Status Kemitraan:{' '}
              <strong>
                Terverifikasi Aktif ({profile.id || 'vnd-berkah-rasa'})
              </strong>
            </span>
          </div>
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={handleDownloadPdf}
          >
            Unduh Company Profile (PDF)
          </button>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false)
              } else {
                handleStartEdit()
              }
            }}
          >
            {isEditing ? 'Tutup Formulir Edit' : 'Perbarui Data Operasional'}
          </button>
        </div>
      </div>

      {/* 4-Card Executive KPI Summary Strip */}
      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-card kpi-card-ember">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Indeks Reputasi &amp; Mutu WO</span>
            <span className="jobs-kpi-badge badge-ember">Tier Platinum</span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">
              {profile.rating || '4.9'} / 5.0
            </strong>
            <span className="jobs-kpi-unit">Bintang Audit</span>
          </div>
          <p className="jobs-kpi-sub">
            {profile.completed_jobs || 52} acara selesai tanpa keluhan •{' '}
            {profile.active_jobs || 3} jadwal aktif berjalan
          </p>
        </div>

        <div className="jobs-kpi-card kpi-card-green">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Kepatuhan Sertifikasi Legal</span>
            <span className="jobs-kpi-badge badge-green">4/4 Dokumen Sah</span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">100%</strong>
            <span className="jobs-kpi-unit">Lulus Audit</span>
          </div>
          <p className="jobs-kpi-sub">
            Halal MUI/BPJPH • Higiene Dinkes Gol. B • NPWP &amp; NIB Aktif
          </p>
        </div>

        <div className="jobs-kpi-card kpi-card-amber">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Kapasitas Produksi Dapur</span>
            <span className="jobs-kpi-badge badge-amber">Standar HACCP</span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">5.000</strong>
            <span className="jobs-kpi-unit">Porsi / Hari</span>
          </div>
          <p className="jobs-kpi-sub">
            {profile.kitchen_capacity || 'Hingga 5.000 Porsi / Hari'} di Dapur
            Sentral Sunter
          </p>
        </div>

        <div className="jobs-kpi-card kpi-card-neutral">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Kekuatan Armada &amp; Kru</span>
            <span className="jobs-kpi-badge badge-neutral">Siap Distribusi</span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">4 Truk • 65 Kru</strong>
          </div>
          <p className="jobs-kpi-sub">
            {profile.fleet_info || '4 Unit Truk Box Isuzu Chiller'} berpendingin
            aktif
          </p>
        </div>
      </div>

      {/* Executive Entity Identity Card & Edit Form */}
      <div className="profile-detail-card">
        <div className="profile-card-top-banner">
          <div className="profile-identity-left">
            <div className="profile-avatar-large">BR</div>
            <div className="profile-banner-main">
              <div className="profile-title-with-badge">
                <h2 className="profile-business-name">
                  {profile.legal_name || 'CV Berkah Rasa Nusantara'}
                </h2>
                <span className="profile-verified-tag">
                  ✓ Rekanan Resmi Terverifikasi
                </span>
              </div>
              <span className="profile-brand-tag">
                Nama Brand Komersial:{' '}
                <strong>
                  {profile.name || 'Berkah Rasa Premium Catering'}
                </strong>{' '}
                • Kategori:{' '}
                {profile.category || 'Katering Pernikahan & Jamuan VIP'} • PIC
                Utama:{' '}
                <strong>
                  {profile.pic_name || 'Hendra Kusuma'} (
                  {profile.pic_role || 'Direktur Operasional'})
                </strong>
              </span>
              <div className="profile-pills-row">
                <span className="profile-rating-pill">
                  ★ {profile.rating || '4.9'} / 5.0 (
                  {profile.completed_jobs || 52} Acara Selesai)
                </span>
                <span className="profile-meta-pill">
                  ID Mitra: {profile.id || 'vnd-berkah-rasa'}
                </span>
                <span className="profile-meta-pill">
                  NPWP: {profile.npwp_number || '02.841.992.1-043.000'}
                </span>
                <span className="profile-meta-pill">
                  NIB OSS: {profile.nib_number || '9120300881421'}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-banner-actions">
            <button
              type="button"
              className="secondary-surface-btn"
              onClick={() => openModal('vendor_profile')}
            >
              Pratinjau Lembar Verifikasi
            </button>
            <button
              type="button"
              className="btn-ember-primary"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false)
                } else {
                  handleStartEdit()
                }
              }}
            >
              {isEditing ? 'Tutup Formulir Edit' : 'Edit Data Profil & Dapur'}
            </button>
          </div>
        </div>

        <div className="profile-quick-copy-strip">
          <div className="profile-quick-copy-group">
            <button
              type="button"
              className="profile-copy-chip-btn"
              onClick={() =>
                handleCopyValue(
                  'Nomor NPWP Badan Usaha',
                  profile.npwp_number || '02.841.992.1-043.000'
                )
              }
            >
              <span className="profile-copy-chip-label">Salin NPWP:</span>
              <span>{profile.npwp_number || '02.841.992.1-043.000'}</span>
            </button>
            <button
              type="button"
              className="profile-copy-chip-btn"
              onClick={() =>
                handleCopyValue(
                  'Nomor Induk Berusaha (NIB)',
                  profile.nib_number || '9120300881421'
                )
              }
            >
              <span className="profile-copy-chip-label">Salin NIB:</span>
              <span>{profile.nib_number || '9120300881421'}</span>
            </button>
            <button
              type="button"
              className="profile-copy-chip-btn"
              onClick={() =>
                handleCopyValue(
                  'Nomor Sertifikat Halal',
                  profile.halal_cert || 'ID3111000028911021 (MUI & BPJPH Aktif)'
                )
              }
            >
              <span className="profile-copy-chip-label">Salin No. Halal:</span>
              <span>ID3111000028911021</span>
            </button>
            <button
              type="button"
              className="profile-copy-chip-btn"
              onClick={() =>
                handleCopyValue(
                  'Alamat Dapur Produksi Sentral',
                  profile.kitchen_address ||
                    'Jl. Danau Sunter Utara No. 42, Jakarta Utara'
                )
              }
            >
              <span className="profile-copy-chip-label">Salin Alamat Dapur</span>
            </button>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            Tersinkronisasi otomatis dengan Supabase PostgreSQL SerasiWO
          </span>
        </div>

        {isEditing && (
          <form className="op-edit-form" onSubmit={handleSaveProfile}>
            <div className="op-form-header">
              <h3>
                Formulir Pembaruan Data Legalitas, Sertifikasi, &amp; Kapasitas
                Dapur
              </h3>
              <p>
                Seluruh pembaruan data disimpan langsung ke database PostgreSQL
                SerasiWO dan disinkronkan dengan dokumen kontrak serta Surat
                Jalan Manifest.
              </p>
            </div>

            <div className="op-form-grid">
              <label className="op-form-field">
                <span>Nama Badan Usaha Resmi (CV / PT)</span>
                <input
                  type="text"
                  required
                  value={formState.legal_name}
                  onChange={(e) =>
                    setFormState({ ...formState, legal_name: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Nama Brand Katering Komersial</span>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Kategori Spesialisasi Layanan</span>
                <input
                  type="text"
                  required
                  value={formState.category}
                  onChange={(e) =>
                    setFormState({ ...formState, category: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Nama Penanggung Jawab Utama (PIC)</span>
                <input
                  type="text"
                  required
                  value={formState.pic_name}
                  onChange={(e) =>
                    setFormState({ ...formState, pic_name: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Jabatan Struktural PIC</span>
                <input
                  type="text"
                  required
                  value={formState.pic_role}
                  onChange={(e) =>
                    setFormState({ ...formState, pic_role: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Nomor Telepon / WhatsApp Operasional 24/7</span>
                <input
                  type="text"
                  required
                  value={formState.phone}
                  onChange={(e) =>
                    setFormState({ ...formState, phone: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Alamat Email Resmi Katering</span>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) =>
                    setFormState({ ...formState, email: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Nomor Pokok Wajib Pajak (NPWP)</span>
                <input
                  type="text"
                  required
                  value={formState.npwp_number}
                  onChange={(e) =>
                    setFormState({ ...formState, npwp_number: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Nomor Induk Berusaha (NIB OSS)</span>
                <input
                  type="text"
                  required
                  value={formState.nib_number}
                  onChange={(e) =>
                    setFormState({ ...formState, nib_number: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Nomor Sertifikat Halal MUI &amp; BPJPH</span>
                <input
                  type="text"
                  required
                  value={formState.halal_cert}
                  onChange={(e) =>
                    setFormState({ ...formState, halal_cert: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Sertifikat Laik Higiene Sanitasi Jasaboga</span>
                <input
                  type="text"
                  required
                  value={formState.hygiene_cert}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      hygiene_cert: e.target.value,
                    })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Kapasitas Produksi Harian Dapur Sentral</span>
                <input
                  type="text"
                  required
                  value={formState.kitchen_capacity}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      kitchen_capacity: e.target.value,
                    })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Armada Distribusi Berpendingin (Chiller Fleet)</span>
                <input
                  type="text"
                  required
                  value={formState.fleet_info}
                  onChange={(e) =>
                    setFormState({ ...formState, fleet_info: e.target.value })
                  }
                />
              </label>

              <label className="op-form-field">
                <span>Total Kru &amp; Pramusaji Tersertifikasi</span>
                <input
                  type="text"
                  required
                  value={formState.service_crew_total}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      service_crew_total: e.target.value,
                    })
                  }
                />
              </label>
            </div>

            <label className="op-form-field">
              <span>Alamat Lengkap Dapur Produksi Sentral &amp; Gudang Logistik</span>
              <input
                type="text"
                required
                value={formState.kitchen_address}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    kitchen_address: e.target.value,
                  })
                }
              />
            </label>

            <div className="op-form-actions">
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-ember-primary"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Menyimpan ke Database...'
                  : 'Simpan Perubahan Profil'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sleek 1-Row Filter & Search Command Bar */}
      <div className="loading-control-toolbar-card">
        <div className="loading-toolbar-top-row">
          <div
            className="loading-event-pills-group"
            role="tablist"
            aria-label="Filter Kategori Spesifikasi Profil"
          >
            <button
              type="button"
              className={`loading-event-pill ${activeCategory === 'semua' ? 'pill-selected' : ''}`}
              onClick={() => setActiveCategory('semua')}
            >
              Semua Dokumen ({categoryCounts.semua})
            </button>
            <button
              type="button"
              className={`loading-event-pill ${activeCategory === 'legalitas' ? 'pill-selected' : ''}`}
              onClick={() => setActiveCategory('legalitas')}
            >
              1. Legalitas &amp; Sertifikasi ({categoryCounts.legalitas})
            </button>
            <button
              type="button"
              className={`loading-event-pill ${activeCategory === 'fasilitas' ? 'pill-selected' : ''}`}
              onClick={() => setActiveCategory('fasilitas')}
            >
              2. Kapasitas Dapur &amp; Armada ({categoryCounts.fasilitas})
            </button>
            <button
              type="button"
              className={`loading-event-pill ${activeCategory === 'kontak' ? 'pill-selected' : ''}`}
              onClick={() => setActiveCategory('kontak')}
            >
              3. Manajemen PIC &amp; Settlement ({categoryCounts.kontak})
            </button>
          </div>

          <div className="jobs-search-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="jobs-search-input"
              placeholder="Cari nomor sertifikat, NPWP, NIB, armada, alamat dapur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari parameter spesifikasi profil vendor"
            />
            {searchQuery && (
              <button
                type="button"
                className="jobs-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading & Error Banner States */}
      {isLoadingProfile && (
        <div
          className="jobs-table-card"
          style={{ padding: '24px', marginBottom: '16px' }}
          role="status"
          aria-live="polite"
        >
          Memuat sinkronisasi profil badan usaha &amp; sertifikasi dari server
          SerasiWO...
        </div>
      )}

      {profileError && (
        <div
          className="jobs-table-card"
          style={{
            padding: '20px 24px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
          role="alert"
        >
          <span>{profileError}</span>
          <button
            type="button"
            className="btn-table-detail"
            onClick={fetchLatestProfile}
          >
            Coba Muat Ulang
          </button>
        </div>
      )}

      {/* Executive Corporate Dossier Sections */}
      {filteredSpecs.length === 0 ? (
        <div className="jobs-table-card" style={{ padding: '36px 24px' }}>
          <div className="jobs-empty-state">
            <strong>
              Tidak ada parameter spesifikasi yang cocok dengan pencarian Anda
            </strong>
            <p>
              Coba gunakan kata kunci lain atau tampilkan seluruh bagian
              spesifikasi.
            </p>
            <button
              type="button"
              className="secondary-surface-btn"
              onClick={() => {
                setActiveCategory('semua')
                setSearchQuery('')
              }}
            >
              Tampilkan Semua Dokumen
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-dossier-sections">
          {[
            {
              key: 'legalitas',
              eyebrow: 'BAGIAN 01 • KEPATUHAN HUKUM & KEAMANAN PANGAN',
              title: 'Legalitas Badan Usaha, Perpajakan, & Sertifikasi Halal',
              subtitle:
                'Dokumen izin usaha resmi dan sertifikasi mutu jasaboga yang diaudit berkala oleh Direktorat Vendor SerasiWO.',
              badgeText: '4/4 Dokumen Sah',
            },
            {
              key: 'fasilitas',
              eyebrow: 'BAGIAN 02 • INFRASTRUKTUR PRODUKSI & LOGISTIK',
              title:
                'Kapasitas Dapur Sentral, Armada Cold-Chain, & Personel Kru',
              subtitle:
                'Spesifikasi teknis fasilitas produksi harian, kendaraan distribusi berpendingin, dan kesiapan tim pramusaji.',
              badgeText: 'Standar Mutu HACCP',
            },
            {
              key: 'kontak',
              eyebrow: 'BAGIAN 03 • OTORISASI KOMANDO & PENCAIRAN TERMIN',
              title: 'Manajemen Penanggung Jawab (PIC) & Rekening Settlement',
              subtitle:
                'Pejabat berwenang untuk koordinasi eskalasi acara H-0 serta saluran rekening pencairan tagihan resmi.',
              badgeText: 'Terhubung Sistem',
            },
          ]
            .map((section) => ({
              ...section,
              items: filteredSpecs.filter(
                (item) => item.categoryKey === section.key
              ),
            }))
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.key} className="profile-dossier-card">
                <div className="profile-dossier-header">
                  <div className="profile-dossier-header-left">
                    <span className="profile-dossier-eyebrow">
                      {section.eyebrow}
                    </span>
                    <h3 className="profile-dossier-title">{section.title}</h3>
                    <p className="profile-dossier-subtitle">
                      {section.subtitle}
                    </p>
                  </div>
                  <div className="profile-dossier-header-right">
                    <span className="table-status-pill status-pill-accepted">
                      ✓ {section.badgeText}
                    </span>
                    <button
                      type="button"
                      className="secondary-surface-btn btn-sm-action"
                      onClick={handleStartEdit}
                    >
                      Perbarui Bagian Ini
                    </button>
                  </div>
                </div>

                <div className="profile-dossier-rows">
                  {section.items.map((spec) => (
                    <div key={spec.id} className="profile-dossier-row">
                      <div className="profile-param-col">
                        <div className="profile-param-top">
                          <span className="profile-code-badge">{spec.id}</span>
                          <strong className="profile-param-name">
                            {spec.title}
                          </strong>
                        </div>
                        <span className="profile-param-desc">
                          {spec.subtitle}
                        </span>
                      </div>

                      <div className="profile-value-col">
                        <strong className="profile-registered-value">
                          {spec.value}
                        </strong>
                        <span className="profile-authority-label">
                          Otoritas Verifikasi: {spec.authority}
                        </span>
                      </div>

                      <div className="profile-status-col">
                        <span className="table-status-pill status-pill-accepted">
                          ✓ {spec.status}
                        </span>
                        <button
                          type="button"
                          className="profile-copy-inline-btn"
                          onClick={() =>
                            handleCopyValue(spec.title, spec.value)
                          }
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function BankAccountPage() {
  const { dashboardData, showToast, openModal, reloadDashboard, refreshTick } =
    useVendor()

  const [liveProfile, setLiveProfile] = useState(
    () => dashboardData?.vendor_profile || {}
  )
  const [livePayouts, setLivePayouts] = useState(
    () => dashboardData?.recent_payouts || []
  )
  const [isLoadingBank, setIsLoadingBank] = useState(false)
  const [bankError, setBankError] = useState(null)
  const [isEditingBank, setIsEditingBank] = useState(false)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [payoutFilter, setPayoutFilter] = useState('semua')
  const [searchMutation, setSearchMutation] = useState('')

  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_branch: '',
    account_number: '',
    account_holder: '',
    settlement_schedule: '',
    npwp_number: '',
  })

  useEffect(() => {
    let isMounted = true
    Promise.all([vendorService.getVendorProfile(), vendorService.getPayouts()])
      .then(([profData, payoutsData]) => {
        if (isMounted) {
          if (profData) setLiveProfile(profData)
          if (Array.isArray(payoutsData)) setLivePayouts(payoutsData)
          setBankError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setBankError(
            err?.message ||
              'Gagal menyinkronkan data rekening & mutasi dari server.'
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBank(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [refreshTick])

  const profile = useMemo(
    () => ({
      ...(dashboardData?.vendor_profile || {}),
      ...(liveProfile || {}),
    }),
    [dashboardData, liveProfile]
  )

  const payouts = useMemo(
    () =>
      livePayouts && livePayouts.length > 0
        ? livePayouts
        : dashboardData?.recent_payouts || [],
    [livePayouts, dashboardData]
  )

  const treasuryMetrics = useMemo(() => {
    const settled = payouts.filter((p) => p.status === 'dicairkan')
    const pending = payouts.filter(
      (p) => p.status === 'tertunda' || p.status === 'diproses'
    )
    return {
      settledAmount: settled.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      ),
      settledCount: settled.length,
      pendingAmount: pending.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      ),
      pendingCount: pending.length,
      totalCount: payouts.length,
    }
  }, [payouts])

  const filteredPayouts = useMemo(() => {
    const q = searchMutation.trim().toLowerCase()
    return payouts.filter((p) => {
      if (payoutFilter === 'dicairkan' && p.status !== 'dicairkan') {
        return false
      }
      if (
        payoutFilter === 'antrean' &&
        p.status !== 'tertunda' &&
        p.status !== 'diproses'
      ) {
        return false
      }
      if (!q) return true
      return (
        String(p.invoice_number || '')
          .toLowerCase()
          .includes(q) ||
        String(p.wedding_title || '')
          .toLowerCase()
          .includes(q) ||
        String(p.notes || '')
          .toLowerCase()
          .includes(q) ||
        String(p.bank_name || '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [payouts, payoutFilter, searchMutation])

  const handleOpenEditBank = () => {
    setBankForm({
      bank_name: profile.bank_name || 'Bank Central Asia (BCA)',
      bank_branch: profile.bank_branch || 'KCU Sunter Mall',
      account_number: profile.account_number || '521-0988-123',
      account_holder: profile.account_holder || 'CV Berkah Rasa Nusantara',
      settlement_schedule:
        profile.settlement_schedule || 'Rabu & Jumat (14:00 WIB)',
      npwp_number: profile.npwp_number || '02.841.992.1-043.000',
    })
    setIsEditingBank(true)
  }

  const handleSaveBank = async (e) => {
    e.preventDefault()
    setIsSavingBank(true)
    const rawDigits = bankForm.account_number.replace(/\D/g, '')
    try {
      const updated = await vendorService.updateVendorProfile({
        ...bankForm,
        account_number_raw: rawDigits || bankForm.account_number,
      })
      setLiveProfile(updated)
      await reloadDashboard()
      setIsEditingBank(false)
      showToast(
        'Data rekening giro pencairan & jadwal settlement berhasil disimpan ke database.',
        'success'
      )
    } catch (err) {
      showToast(
        err?.message || 'Gagal memperbarui data rekening bank.',
        'error'
      )
    } finally {
      setIsSavingBank(false)
    }
  }

  const handleCopyText = (label, val) => {
    if (!val) return
    navigator.clipboard?.writeText(String(val))
    showToast(`${label} berhasil disalin ke clipboard.`, 'success')
  }

  const handleDownloadBankPdf = () => {
    downloadBankVerificationPdf(profile, payouts)
    showToast(
      'Surat Konfirmasi Rekening Giro & Rekapitulasi Settlement (PDF) berhasil diunduh.',
      'success'
    )
  }

  const rawAccountNum =
    profile.account_number_raw ||
    String(profile.account_number || '521098812300').replace(/\D/g, '') ||
    '521098812300'

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Page Title Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Pengaturan Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">
              Rekening Bank Pencairan
            </span>
          </div>
          <h1 className="vendor-main-title">
            Rekening Bank Pencairan &amp; Otorisasi Settlement
          </h1>
          <p className="vendor-header-subtitle">
            Pengelolaan rekening giro korporat resmi untuk pencairan termin uang
            muka (DP), pelunasan tagihan katering, dan rekonsiliasi mutasi
            payout SerasiWO.
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
            className="secondary-surface-btn"
            onClick={handleDownloadBankPdf}
          >
            Unduh Konfirmasi Rekening (PDF)
          </button>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('create_payout')}
          >
            + Unggah Invoice Baru
          </button>
        </div>
      </div>

      {/* 4-Card Executive Treasury KPI Strip */}
      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-card kpi-card-green">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Total Dana Sudah Dicairkan</span>
            <span className="jobs-kpi-badge badge-green">
              {treasuryMetrics.settledCount} Termin Lunas
            </span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">
              {formatRupiah(treasuryMetrics.settledAmount || 38000000)}
            </strong>
          </div>
          <p className="jobs-kpi-sub">
            Transfer RTGS / BI-FAST efektif masuk ke rekening giro terdaftar
          </p>
        </div>

        <div className="jobs-kpi-card kpi-card-amber">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Antrean Pencairan WO</span>
            <span className="jobs-kpi-badge badge-amber">
              {treasuryMetrics.pendingCount} Tagihan Aktif
            </span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">
              {formatRupiah(treasuryMetrics.pendingAmount || 48500000)}
            </strong>
          </div>
          <p className="jobs-kpi-sub">
            Menunggu jadwal batch kliring Direktorat Keuangan SerasiWO
          </p>
        </div>

        <div className="jobs-kpi-card kpi-card-ember">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Jadwal Batch Settlement</span>
            <span className="jobs-kpi-badge badge-ember">Otomatis 2x/Minggu</span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">Rabu &amp; Jumat</strong>
            <span className="jobs-kpi-unit">14:00 WIB</span>
          </div>
          <p className="jobs-kpi-sub">
            Cut-off verifikasi faktur pukul 11:00 WIB pada hari pencairan
          </p>
        </div>

        <div className="jobs-kpi-card kpi-card-neutral">
          <div className="jobs-kpi-top">
            <span className="jobs-kpi-label">Metode Kliring &amp; Pajak</span>
            <span className="jobs-kpi-badge badge-neutral">Kode Bank 014</span>
          </div>
          <div className="jobs-kpi-value-row">
            <strong className="jobs-kpi-number">BI-FAST &amp; RTGS</strong>
          </div>
          <p className="jobs-kpi-sub">
            Bebas biaya admin antar-BCA • PPh Pasal 23 tarif resmi 2% (NPWP)
          </p>
        </div>
      </div>

      {/* Corporate Giro Card + Treasury Specification Panel */}
      <div className="bank-account-full-card">
        <div className="bank-card-left-stack">
          <div className="bank-card-visual">
            <div className="bank-visual-top">
              <div className="bank-chip-metal" />
              <span className="bank-institution">
                {(
                  profile.bank_name || 'BANK CENTRAL ASIA (BCA)'
                ).toUpperCase()}
              </span>
            </div>
            <div className="bank-visual-number">
              {profile.account_number || '521-0988-123'}
            </div>
            <div className="bank-visual-footer">
              <div>
                <span className="bank-visual-sub">PEMILIK REKENING GIRO:</span>
                <strong>
                  {(
                    profile.account_holder || 'CV BERKAH RASA NUSANTARA'
                  ).toUpperCase()}
                </strong>
              </div>
              <div>
                <span className="bank-visual-sub">KANTOR CABANG:</span>
                <strong>
                  {(profile.bank_branch || 'KCU SUNTER MALL').toUpperCase()}
                </strong>
              </div>
            </div>
          </div>

          <div className="profile-quick-copy-group">
            <button
              type="button"
              className="profile-copy-chip-btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() =>
                handleCopyText('Nomor Rekening Tanpa Strip', rawAccountNum)
              }
            >
              <span className="profile-copy-chip-label">Salin Angka:</span>
              <span>{rawAccountNum}</span>
            </button>
            <button
              type="button"
              className="profile-copy-chip-btn"
              onClick={() =>
                handleCopyText(
                  'Nama Pemilik Rekening',
                  profile.account_holder || 'CV Berkah Rasa Nusantara'
                )
              }
            >
              Salin Nama
            </button>
          </div>
        </div>

        <div className="bank-policy-details">
          {isEditingBank ? (
            <form
              className="op-edit-form"
              style={{ paddingTop: 0 }}
              onSubmit={handleSaveBank}
            >
              <div className="op-form-header">
                <h3>
                  Formulir Pembaruan Rekening Giro &amp; Parameter Settlement
                </h3>
                <p>
                  Nama pemilik rekening wajib sesuai dengan akta badan hukum
                  yang terdaftar pada NPWP mitra (
                  {profile.legal_name || 'CV Berkah Rasa Nusantara'}).
                </p>
              </div>

              <div className="op-form-grid">
                <label className="op-form-field">
                  <span>Nama Bank Tujuan Pencairan</span>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_name}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, bank_name: e.target.value })
                    }
                  />
                </label>

                <label className="op-form-field">
                  <span>Kantor Cabang Pembuka (KCU / KCP)</span>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_branch}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, bank_branch: e.target.value })
                    }
                  />
                </label>

                <label className="op-form-field">
                  <span>Nomor Rekening Giro Korporat</span>
                  <input
                    type="text"
                    required
                    value={bankForm.account_number}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        account_number: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="op-form-field">
                  <span>Nama Pemilik Rekening (Sesuai Akta &amp; NPWP)</span>
                  <input
                    type="text"
                    required
                    value={bankForm.account_holder}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        account_holder: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="op-form-field">
                  <span>Jadwal Batch Settlement Reguler</span>
                  <input
                    type="text"
                    required
                    value={bankForm.settlement_schedule}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        settlement_schedule: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="op-form-field">
                  <span>Nomor NPWP Pemotongan PPh 23</span>
                  <input
                    type="text"
                    required
                    value={bankForm.npwp_number}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        npwp_number: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="op-form-actions">
                <button
                  type="button"
                  className="secondary-surface-btn"
                  onClick={() => setIsEditingBank(false)}
                  disabled={isSavingBank}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-ember-primary"
                  disabled={isSavingBank}
                >
                  {isSavingBank
                    ? 'Menyimpan ke Database...'
                    : 'Simpan Rekening Baru'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '6px',
                  }}
                >
                  <h2 className="bank-policy-heading" style={{ margin: 0 }}>
                    Spesifikasi Otorisasi Treasury &amp; Kliring Bank Mitra
                  </h2>
                  <span className="table-status-pill status-pill-accepted">
                    ✓ Lulus Verifikasi Know-Your-Vendor (KYV)
                  </span>
                </div>
                <p className="bank-policy-sub">
                  Seluruh pencairan uang muka (DP 50%) dan pelunasan (100%)
                  ditransfer otomatis melalui Cash Management SerasiWO ke
                  rekening giro di bawah ini.
                </p>

                <div className="bank-treasury-spec-grid">
                  <div className="bank-treasury-tile">
                    <span className="bank-treasury-tile-label">
                      TREAS-01 • INSTITUSI &amp; KODE KLIRING
                    </span>
                    <strong className="bank-treasury-tile-value">
                      {profile.bank_name || 'Bank Central Asia (BCA)'}
                    </strong>
                    <span className="bank-treasury-tile-meta">
                      Kode Bank: 014 • SWIFT: CENAIDJA • Cabang:{' '}
                      {profile.bank_branch || 'KCU Sunter Mall'}
                    </span>
                  </div>

                  <div className="bank-treasury-tile">
                    <span className="bank-treasury-tile-label">
                      TREAS-02 • NOMOR REKENING &amp; ENTITAS
                    </span>
                    <strong className="bank-treasury-tile-value">
                      {profile.account_number || '521-0988-123'} ({rawAccountNum}
                      )
                    </strong>
                    <span className="bank-treasury-tile-meta">
                      Atas Nama:{' '}
                      {profile.account_holder || 'CV Berkah Rasa Nusantara'}
                    </span>
                  </div>

                  <div className="bank-treasury-tile">
                    <span className="bank-treasury-tile-label">
                      TREAS-03 • SLA PENCAIRAN &amp; CUT-OFF
                    </span>
                    <strong className="bank-treasury-tile-value">
                      {profile.settlement_schedule ||
                        'Rabu & Jumat (14:00 WIB)'}
                    </strong>
                    <span className="bank-treasury-tile-meta">
                      Faktur disetujui sebelum 11:00 WIB cair di hari yang sama
                    </span>
                  </div>

                  <div className="bank-treasury-tile">
                    <span className="bank-treasury-tile-label">
                      TREAS-04 • PAJAK JASA KATERING (PPH 23)
                    </span>
                    <strong className="bank-treasury-tile-value">
                      NPWP: {profile.npwp_number || '02.841.992.1-043.000'}
                    </strong>
                    <span className="bank-treasury-tile-meta">
                      Tarif PPh Pasal 23: 2% (Bukti potong diterbitkan otomatis)
                    </span>
                  </div>
                </div>
              </div>

              <div className="bank-action-buttons-row">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    className="secondary-surface-btn"
                    onClick={() => openModal('bank_account')}
                  >
                    Pratinjau Kartu Rekening
                  </button>
                  <button
                    type="button"
                    className="secondary-surface-btn"
                    onClick={handleDownloadBankPdf}
                  >
                    Cetak Surat Konfirmasi (PDF)
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-ember-primary"
                  onClick={handleOpenEditBank}
                >
                  Ubah Data Rekening Giro
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Command Bar for Settlement Ledger */}
      <div className="loading-control-toolbar-card">
        <div className="loading-toolbar-top-row">
          <div
            className="loading-event-pills-group"
            role="tablist"
            aria-label="Filter Status Mutasi Pencairan"
          >
            <button
              type="button"
              className={`loading-event-pill ${payoutFilter === 'semua' ? 'pill-selected' : ''}`}
              onClick={() => setPayoutFilter('semua')}
            >
              Semua Mutasi Rekening ({treasuryMetrics.totalCount})
            </button>
            <button
              type="button"
              className={`loading-event-pill ${payoutFilter === 'dicairkan' ? 'pill-selected' : ''}`}
              onClick={() => setPayoutFilter('dicairkan')}
            >
              Sudah Dicairkan / Lunas ({treasuryMetrics.settledCount})
            </button>
            <button
              type="button"
              className={`loading-event-pill ${payoutFilter === 'antrean' ? 'pill-selected' : ''}`}
              onClick={() => setPayoutFilter('antrean')}
            >
              Antrean Verifikasi &amp; Kliring ({treasuryMetrics.pendingCount})
            </button>
          </div>

          <div className="jobs-search-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="jobs-search-input"
              placeholder="Cari nomor faktur (INV/...), nama acara pernikahan, atau catatan..."
              value={searchMutation}
              onChange={(e) => setSearchMutation(e.target.value)}
              aria-label="Cari riwayat mutasi pencairan rekening"
            />
            {searchMutation && (
              <button
                type="button"
                className="jobs-search-clear"
                onClick={() => setSearchMutation('')}
                aria-label="Bersihkan pencarian"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoadingBank && (
        <div
          className="jobs-table-card"
          style={{ padding: '24px', marginBottom: '16px' }}
          role="status"
          aria-live="polite"
        >
          Menyinkronkan mutasi pencairan rekening giro dari database
          PostgreSQL...
        </div>
      )}

      {bankError && (
        <div
          className="jobs-table-card"
          style={{
            padding: '20px 24px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
          role="alert"
        >
          <span>{bankError}</span>
          <button
            type="button"
            className="btn-table-detail"
            onClick={() => reloadDashboard()}
          >
            Coba Muat Ulang
          </button>
        </div>
      )}

      {/* Corporate Settlement & Disbursement Dossier Card */}
      <div className="profile-dossier-card">
        <div className="profile-dossier-header">
          <div className="profile-dossier-header-left">
            <span className="profile-dossier-eyebrow">
              BUKU BESAR PENCAIRAN REKENING •{' '}
              {(profile.bank_name || 'BCA').toUpperCase()}{' '}
              {profile.account_number || '521-0988-123'}
            </span>
            <h3 className="profile-dossier-title">
              Riwayat Mutasi Kredit &amp; Pencairan Termin Tagihan Katering
            </h3>
            <p className="profile-dossier-subtitle">
              Daftar seluruh tagihan katering yang diajukan dan ditransfer ke
              rekening giro{' '}
              <strong>
                {profile.account_holder || 'CV Berkah Rasa Nusantara'}
              </strong>
              .
            </p>
          </div>
          <div className="profile-dossier-header-right">
            <span className="table-status-pill status-pill-accepted">
              ✓ Rekonsiliasi Real-Time
            </span>
            <button
              type="button"
              className="secondary-surface-btn btn-sm-action"
              onClick={handleDownloadBankPdf}
            >
              Ekspor Rekap Mutasi (PDF)
            </button>
          </div>
        </div>

        {filteredPayouts.length === 0 ? (
          <div style={{ padding: '36px 24px' }}>
            <div className="jobs-empty-state">
              <strong>
                Tidak ada riwayat mutasi pencairan yang sesuai dengan filter Anda
              </strong>
              <p>
                Ubah filter status pencairan atau bersihkan kata kunci pencarian
                untuk melihat seluruh mutasi rekening.
              </p>
              <button
                type="button"
                className="secondary-surface-btn"
                onClick={() => {
                  setPayoutFilter('semua')
                  setSearchMutation('')
                }}
              >
                Tampilkan Semua Mutasi
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-dossier-rows">
            {filteredPayouts.map((item) => {
              const isSettled = item.status === 'dicairkan'
              return (
                <div key={item.id} className="profile-dossier-row">
                  <div className="profile-param-col">
                    <div className="profile-param-top">
                      <span className="profile-code-badge">
                        {item.invoice_number}
                      </span>
                      <strong className="profile-param-name">
                        {item.wedding_title}
                      </strong>
                    </div>
                    <span className="profile-param-desc">
                      Tgl Acara: {formatShortDateID(item.event_date)} •
                      Diajukan: {formatShortDateID(item.submitted_at)}
                    </span>
                  </div>

                  <div className="profile-value-col">
                    <strong className="profile-registered-value">
                      {formatRupiah(item.amount || 0)} →{' '}
                      {item.bank_name ||
                        profile.bank_name ||
                        'Bank Central Asia (BCA)'}{' '}
                      ({item.account_number || profile.account_number})
                    </strong>
                    <span className="profile-authority-label">
                      {item.notes ||
                        'Transfer melalui sistem kliring korporat SerasiWO'}
                    </span>
                  </div>

                  <div className="profile-status-col">
                    {isSettled ? (
                      <span className="table-status-pill status-pill-accepted">
                        ✓ Dicairkan (Lunas)
                      </span>
                    ) : (
                      <span className="table-status-pill status-pill-pending">
                        <span className="pulse-dot" />{' '}
                        {item.status_label || 'Diproses Keuangan WO'}
                      </span>
                    )}
                    <button
                      type="button"
                      className="profile-copy-inline-btn"
                      onClick={() => {
                        downloadPayoutReceiptPdf(item)
                        showToast(
                          `Kwitansi PDF (${item.invoice_number}) berhasil diunduh.`,
                          'success'
                        )
                      }}
                    >
                      Kwitansi PDF
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
