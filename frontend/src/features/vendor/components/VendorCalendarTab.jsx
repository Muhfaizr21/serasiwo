import { useState, useEffect, useCallback, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatLongDateID, formatShortDateID } from '../utils/vendorFormatters'

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const WEEK_HEADERS = [
  { full: 'Senin', abbr: 'Sen' },
  { full: 'Selasa', abbr: 'Sel' },
  { full: 'Rabu', abbr: 'Rab' },
  { full: 'Kamis', abbr: 'Kam' },
  { full: 'Jumat', abbr: 'Jum' },
  { full: 'Sabtu', abbr: 'Sab' },
  { full: 'Minggu', abbr: 'Min' },
]

const INITIAL_NOW = new Date()
const INITIAL_TODAY_STR = INITIAL_NOW.toISOString().split('T')[0]

export function VendorCalendarTab() {
  const { openModal, showToast, refreshTick, reloadDashboard, setActiveTab } = useVendor()
  const [calendarData, setCalendarData] = useState({
    blocked_dates: [],
    wo_events: [],
    source: 'backend_db',
  })

  const [currentYear, setCurrentYear] = useState(() => INITIAL_NOW.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(() => INITIAL_NOW.getMonth())
  const [calendarFilter, setCalendarFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(INITIAL_TODAY_STR)

  const loadCalendar = useCallback(async () => {
    try {
      const data = await vendorService.getCalendar()
      setCalendarData(data)
    } catch {
      showToast('Gagal memuat kalender ketersediaan', 'error')
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    vendorService
      .getCalendar()
      .then((data) => {
        if (active) setCalendarData(data)
      })
      .catch(() => {
        if (active) showToast('Gagal memuat kalender ketersediaan', 'error')
      })
    return () => {
      active = false
    }
  }, [refreshTick, showToast])

  const handleUnblock = async (date) => {
    try {
      await vendorService.toggleDateBlock(date, false, '')
      showToast(
        `Tanggal ${formatShortDateID(date)} berhasil dibuka kembali untuk booking SerasiWO.`,
        'success'
      )
      await loadCalendar()
      await reloadDashboard()
    } catch (err) {
      showToast(err.message || 'Gagal membuka tanggal', 'error')
    }
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const days = []

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i
      const pMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const pYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`
      days.push({
        day: pDay,
        date: dateStr,
        isOtherMonth: true,
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        day: d,
        date: dateStr,
        isOtherMonth: false,
        isToday: dateStr === INITIAL_TODAY_STR,
      })
    }

    const totalSlots = Math.ceil(days.length / 7) * 7
    const remainingSlots = totalSlots - days.length
    for (let n = 1; n <= remainingSlots; n++) {
      const nMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nYear = currentMonth === 11 ? currentYear + 1 : currentYear
      const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
      days.push({
        day: n,
        date: dateStr,
        isOtherMonth: true,
      })
    }

    return days
  }, [currentYear, currentMonth])

  const activeBlockedDates = useMemo(
    () => calendarData.blocked_dates.filter((b) => b.is_blocked && !b.is_wo_event),
    [calendarData.blocked_dates]
  )
  const totalBlocked = activeBlockedDates.length
  const totalWO = calendarData.wo_events.length

  const filteredDays = useMemo(() => {
    return calendarDays.map((d) => {
      const woEvent = calendarData.wo_events.find((e) => e.event_date === d.date)
      const isWO = Boolean(woEvent)

      const blockedItem = activeBlockedDates.find((b) => b.date === d.date)
      const isBlocked = Boolean(blockedItem)

      let isDimmed = false
      if (calendarFilter === 'wo' && !isWO) isDimmed = true
      if (calendarFilter === 'blocked' && !isBlocked) isDimmed = true

      return {
        ...d,
        woEvent,
        isWO,
        blockedItem,
        isBlocked,
        isDimmed,
      }
    })
  }, [calendarDays, calendarData.wo_events, activeBlockedDates, calendarFilter])

  const selectedDayDetail = useMemo(() => {
    const woEvent = calendarData.wo_events.find((e) => e.event_date === selectedDate)
    const blockedItem = activeBlockedDates.find((b) => b.date === selectedDate)
    return {
      date: selectedDate,
      woEvent,
      blockedItem,
    }
  }, [selectedDate, calendarData.wo_events, activeBlockedDates])

  const handleSelectCell = (d) => {
    setSelectedDate(d.date)
    if (!d.isWO && !d.isBlocked) {
      openModal('block_date', {
        date: d.date,
        isBlocked: true,
        reason: 'Full booked pesanan katering di luar WO',
      })
    }
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      {/* Standardized Enterprise Header */}
      <div className="vendor-title-row">
        <div className="vendor-title-left">
          <div className="vendor-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Portal Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Kalender Ketersediaan</span>
          </div>
          <h1 className="vendor-main-title">Kalender Ketersediaan &amp; Blokir Jadwal Mitra</h1>
          <p className="vendor-header-subtitle">
            Pantau jadwal acara resmi SerasiWO dan kunci tanggal apabila kapasitas produksi dapur telah penuh oleh pesanan eksternal.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Database: <strong>{calendarData.source === 'backend_db' ? 'Terhubung API & DB' : 'Replikasi Lokal'}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() =>
              openModal('block_date', {
                date: selectedDate,
                isBlocked: true,
                reason: 'Full booked pesanan katering di luar WO',
              })
            }
          >
            + Blokir Tanggal Baru
          </button>
        </div>
      </div>

      <div className="vendor-calendar-layout">
        <div className="vendor-card-panel vendor-calendar-main">
          <div className="calendar-month-toolbar">
            <div className="month-picker-group">
              <button
                type="button"
                className="month-nav-btn"
                onClick={handlePrevMonth}
                aria-label="Bulan sebelumnya"
              >
                ‹
              </button>
              <span className="month-title-display">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                className="month-nav-btn"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
              >
                ›
              </button>
              <button
                type="button"
                className="calendar-today-btn"
                onClick={() => {
                  setCurrentYear(INITIAL_NOW.getFullYear())
                  setCurrentMonth(INITIAL_NOW.getMonth())
                  setSelectedDate(INITIAL_TODAY_STR)
                }}
              >
                Hari Ini
              </button>
            </div>

            <div className="calendar-filter-pills" role="group" aria-label="Filter Kalender">
              <button
                type="button"
                className={`cal-filter-btn ${calendarFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('all')}
              >
                Semua Jadwal
              </button>
              <button
                type="button"
                className={`cal-filter-btn ${calendarFilter === 'wo' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('wo')}
              >
                Acara WO ({totalWO})
              </button>
              <button
                type="button"
                className={`cal-filter-btn ${calendarFilter === 'blocked' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('blocked')}
              >
                Diblokir ({totalBlocked})
              </button>
            </div>

            <div className="vendor-calendar-legend">
              <div className="legend-item">
                <span className="legend-box legend-wo" />
                <span>Acara SerasiWO</span>
              </div>
              <div className="legend-item">
                <span className="legend-box legend-blocked" />
                <span>Diblokir Mitra</span>
              </div>
              <div className="legend-item">
                <span className="legend-box legend-avail" />
                <span>Tersedia</span>
              </div>
            </div>
          </div>

          <div className="vendor-calendar-wrapper">
            <div className="calendar-week-header">
              {WEEK_HEADERS.map((h) => (
                <div key={h.full} className="week-col-name">
                  <span className="cal-day-full">{h.full}</span>
                  <span className="cal-day-abbr">{h.abbr}</span>
                </div>
              ))}
            </div>

            <div className="calendar-days-container">
              {filteredDays.map((d, index) => {
                const { woEvent, isWO, blockedItem, isBlocked, isDimmed } = d
                const isSelected = d.date === selectedDate

                return (
                  <div
                    key={`${d.date}-${index}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Tanggal ${d.date}`}
                    className={`calendar-day-cell ${
                      d.isOtherMonth ? 'day-cell-other-month' : ''
                    } ${
                      isWO
                        ? 'day-cell-wo'
                        : isBlocked
                        ? 'day-cell-blocked'
                        : 'day-cell-available'
                    } ${d.isToday ? 'day-cell-today' : ''} ${
                      isSelected ? 'day-cell-selected' : ''
                    } ${isDimmed ? 'day-cell-dimmed' : ''}`}
                    onClick={() => handleSelectCell(d)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectCell(d)
                      }
                    }}
                  >
                    <div className="day-cell-header">
                      <span className="day-cell-number">{d.day}</span>
                      {d.isToday && <span className="day-cell-today-pill">Hari ini</span>}
                    </div>

                    <div className="day-cell-body">
                      {isWO && (
                        <div className="day-event-badge wo-event-badge">
                          <strong className="day-badge-title">{woEvent.title}</strong>
                          <span className="day-badge-venue badge-venue-sub">
                            {woEvent.venue}
                          </span>
                          <span className="day-badge-pill">Terkunci WO</span>
                        </div>
                      )}

                      {isBlocked && (
                        <div className="day-event-badge blocked-event-badge">
                          <strong className="day-badge-title">Penuh Pesanan Luar</strong>
                          <span className="day-badge-venue badge-reason-sub">
                            {blockedItem.reason || 'Non-WO'}
                          </span>
                          <span className="day-badge-pill">Diblokir</span>
                        </div>
                      )}

                      {!isWO && !isBlocked && !d.isOtherMonth && (
                        <span className="day-avail-hint">+ Blokir Tanggal</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="vendor-side-panel-col">
          {/* Dynamic Date Inspector Card */}
          <div className="vendor-card-panel calendar-inspector-card">
            <div className="inspector-header">
              <span className="inspector-eyebrow">DETAIL TANGGAL TERPILIH</span>
              <h3 className="inspector-date-title">{formatLongDateID(selectedDate)}</h3>
            </div>

            {selectedDayDetail.woEvent ? (
              <div className="inspector-status-box wo-box">
                <div className="inspector-badge-row">
                  <span className="inspector-pill pill-wo">Acara Resmi SerasiWO</span>
                  <span className="inspector-time">{selectedDayDetail.woEvent.time_slot}</span>
                </div>
                <strong className="inspector-event-name">
                  {selectedDayDetail.woEvent.wedding_title}
                </strong>
                <p className="inspector-venue-text">
                  Lokasi: {selectedDayDetail.woEvent.venue}
                </p>
                <div className="inspector-meta-grid">
                  <div>
                    <span>Kuantitas Pesanan:</span>
                    <strong>
                      {selectedDayDetail.woEvent.portions.toLocaleString('id-ID')}{' '}
                      {selectedDayDetail.woEvent.unit_label}
                    </strong>
                  </div>
                  <div>
                    <span>Status Kesiapan:</span>
                    <strong>{selectedDayDetail.woEvent.readiness_status}</strong>
                  </div>
                </div>
                <div className="inspector-actions">
                  <button
                    type="button"
                    className="secondary-surface-btn"
                    onClick={() => setActiveTab('loading_schedule')}
                  >
                    Buka Jadwal Loading Dock
                  </button>
                  <button
                    type="button"
                    className="btn-ember-primary"
                    onClick={() => setActiveTab('readiness')}
                  >
                    Update Kesiapan
                  </button>
                </div>
              </div>
            ) : selectedDayDetail.blockedItem ? (
              <div className="inspector-status-box blocked-box">
                <div className="inspector-badge-row">
                  <span className="inspector-pill pill-blocked">Diblokir oleh Mitra</span>
                </div>
                <strong className="inspector-event-name">
                  Kapasitas Dapur Penuh (Non-WO)
                </strong>
                <p className="inspector-venue-text">
                  Alasan: {selectedDayDetail.blockedItem.reason}
                </p>
                <div className="inspector-actions">
                  <button
                    type="button"
                    className="secondary-surface-btn"
                    onClick={() =>
                      openModal('block_date', {
                        date: selectedDate,
                        isBlocked: true,
                        reason: selectedDayDetail.blockedItem.reason,
                      })
                    }
                  >
                    Ubah Alasan
                  </button>
                  <button
                    type="button"
                    className="vendor-unblock-btn"
                    onClick={() => handleUnblock(selectedDate)}
                  >
                    Buka Kembali Tanggal
                  </button>
                </div>
              </div>
            ) : (
              <div className="inspector-status-box avail-box">
                <div className="inspector-badge-row">
                  <span className="inspector-pill pill-avail">Tersedia untuk Booking WO</span>
                </div>
                <strong className="inspector-event-name">
                  Slot Produksi Dapur Masih Terbuka
                </strong>
                <p className="inspector-venue-text">
                  Admin Operasional SerasiWO dapat mengirimkan request pekerjaan katering pada tanggal ini.
                </p>
                <button
                  type="button"
                  className="btn-ember-primary"
                  style={{ width: '100%' }}
                  onClick={() =>
                    openModal('block_date', {
                      date: selectedDate,
                      isBlocked: true,
                      reason: 'Full booked pesanan katering di luar WO',
                    })
                  }
                >
                  Blokir Tanggal Ini ({formatShortDateID(selectedDate)})
                </button>
              </div>
            )}
          </div>

          <div className="vendor-card-panel access-info-panel">
            <h3 className="vendor-panel-title">Ringkasan Ketersediaan Bulan Ini</h3>
            <div className="access-stats-grid">
              <div className="access-stat-box">
                <span className="stat-num text-green">{totalWO}</span>
                <span className="stat-label">Acara Terkunci WO</span>
              </div>
              <div className="access-stat-box">
                <span className="stat-num text-red">{totalBlocked}</span>
                <span className="stat-label">Tanggal Diblokir</span>
              </div>
            </div>
          </div>

          <div className="vendor-card-panel">
            <div className="vendor-panel-header">
              <div>
                <h3 className="vendor-panel-title">Daftar Tanggal Diblokir</h3>
                <p className="vendor-panel-subtitle">Pesanan mandiri di luar SerasiWO</p>
              </div>
            </div>

            <div className="vendor-blocked-list">
              {activeBlockedDates.length === 0 ? (
                <p className="vendor-empty-hint">Belum ada tanggal yang diblokir oleh mitra.</p>
              ) : (
                activeBlockedDates.map((b) => (
                  <div
                    key={b.date}
                    className="vendor-blocked-item"
                    onClick={() => setSelectedDate(b.date)}
                  >
                    <div className="vendor-blocked-item-info">
                      <strong>{formatShortDateID(b.date)}</strong>
                      <p>{b.reason || 'Penuh pesanan mandiri di luar WO'}</p>
                    </div>

                    <button
                      type="button"
                      className="vendor-unblock-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnblock(b.date)
                      }}
                      title="Buka kembali tanggal untuk booking SerasiWO"
                    >
                      Buka Kembali
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn-outline-block-full"
              onClick={() =>
                openModal('block_date', {
                  date: selectedDate,
                  isBlocked: true,
                  reason: 'Full booked pesanan katering di luar WO',
                })
              }
            >
              + Tambah Tanggal Blokir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
