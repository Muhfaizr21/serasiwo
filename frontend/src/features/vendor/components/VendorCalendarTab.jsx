import { useState, useEffect, useCallback, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatShortDateID } from '../utils/vendorFormatters'

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
  const { openModal, showToast, refreshTick, reloadDashboard } = useVendor()
  const [calendarData, setCalendarData] = useState({ blocked_dates: [], wo_events: [] })

  const [currentYear, setCurrentYear] = useState(() => INITIAL_NOW.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(() => INITIAL_NOW.getMonth())
  const [calendarFilter, setCalendarFilter] = useState('all')

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
        `Tanggal ${date} berhasil dibuka kembali untuk booking SerasiWO`,
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

  return (
    <div className="vendor-page-container vendor-tab-content">
      <div className="vendor-calendar-layout">
        <div className="vendor-card-panel vendor-calendar-main">
          <div className="vendor-panel-header">
            <div>
              <div className="calendar-title-badge-row">
                <h2 className="vendor-panel-title">Kalender Ketersediaan Mitra</h2>
                <span className="badge-update-tag">Akses: Read &amp; Update</span>
              </div>
              <p className="vendor-panel-subtitle">
                Pantau jadwal resmi SerasiWO dan gunakan tombol &quot;Blokir Tanggal&quot; jika penuh pesanan luar WO.
              </p>
            </div>

            <div className="vendor-panel-actions">
              <button
                type="button"
                className="btn-ember-primary"
                onClick={() => openModal('block_date')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ Blokir Tanggal Baru</span>
              </button>
            </div>
          </div>

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
                }}
              >
                Hari Ini
              </button>
            </div>

            <div className="calendar-filter-pills">
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

                return (
                  <div
                    key={`${d.date}-${index}`}
                    className={`calendar-day-cell ${
                      d.isOtherMonth ? 'day-cell-other-month' : ''
                    } ${
                      isWO
                        ? 'day-cell-wo'
                        : isBlocked
                        ? 'day-cell-blocked'
                        : 'day-cell-available'
                    } ${d.isToday ? 'day-cell-today' : ''} ${isDimmed ? 'day-cell-dimmed' : ''}`}
                    onClick={() => {
                      if (isWO) {
                        showToast(
                          `Tanggal ${d.date} telah terkunci resmi untuk acara SerasiWO: ${woEvent.title}`,
                          'success'
                        )
                      } else if (isBlocked) {
                        showToast(
                          `Tanggal ${d.date} sedang diblokir: ${
                            blockedItem.reason || 'Pesanan Luar'
                          }. Anda dapat membukanya kembali di panel kanan.`,
                          'warning'
                        )
                      } else {
                        openModal('block_date', { date: d.date })
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
                          <span className="day-badge-pill">WO</span>
                        </div>
                      )}

                      {isBlocked && (
                        <div className="day-event-badge blocked-event-badge">
                          <strong className="day-badge-title">Penuh Pesanan Luar</strong>
                          <span className="day-badge-venue badge-reason-sub">
                            {blockedItem.reason || 'Non-WO'}
                          </span>
                          <span className="day-badge-pill">Blokir</span>
                        </div>
                      )}

                      {!isWO && !isBlocked && !d.isOtherMonth && (
                        <span className="day-avail-hint">+ Blokir</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="vendor-side-panel-col">
          <div className="vendor-card-panel access-info-panel">
            <h3 className="vendor-panel-title">Aturan Ketersediaan</h3>
            <p className="access-info-desc">
              Sesuai SOP SerasiWO, mitra katering berhak memblokir tanggal jika kapasitas produksi mandiri telah penuh oleh pesanan di luar WO.
            </p>
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
                <p className="vendor-panel-subtitle">Pesanan di luar SerasiWO</p>
              </div>
            </div>

            <div className="vendor-blocked-list">
              {activeBlockedDates.length === 0 ? (
                <p className="vendor-empty-hint">Belum ada tanggal yang diblokir oleh mitra.</p>
              ) : (
                activeBlockedDates.map((b) => (
                  <div key={b.date} className="vendor-blocked-item">
                    <div className="vendor-blocked-item-info">
                      <strong>{formatShortDateID(b.date)}</strong>
                      <p>{b.reason || 'Penuh pesanan mandiri di luar WO'}</p>
                    </div>

                    <button
                      type="button"
                      className="vendor-unblock-btn"
                      onClick={() => handleUnblock(b.date)}
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
              onClick={() => openModal('block_date')}
            >
              + Tambah Tanggal Blokir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
