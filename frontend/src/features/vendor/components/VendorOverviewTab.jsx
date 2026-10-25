import { useState } from 'react'
import { useVendor } from '../context/useVendor'
import {
  VENDOR_CAPACITY_CAPSULES,
  VENDOR_HEATMAP_GRID,
  VENDOR_PEAK_HOURS,
} from '../data/vendorMockData'
import {
  formatRupiah,
  formatShortDateID,
  getDayBadgeParts,
} from '../utils/vendorFormatters'

export function VendorOverviewTab() {
  const { setActiveTab, dashboardData } = useVendor()
  const [activeFilter, setActiveFilter] = useState('Pekan Ini')

  const profile = dashboardData?.vendor_profile || {}
  const metrics = dashboardData?.metrics || {}
  const weeklyEvents = dashboardData?.events_this_week || []
  const pendingJobs = dashboardData?.new_booking_alerts || []

  const weeklyEventsCount = metrics.weekly_events_count ?? weeklyEvents.length
  const pendingJobsCount = metrics.new_booking_alerts ?? pendingJobs.length
  const totalPortions =
    metrics.total_portions_active ??
    weeklyEvents.reduce((sum, ev) => sum + (Number(ev.portions_or_units) || 0), 0)
  const pendingPayoutAmount = metrics.pending_payout_amount ?? 48500000
  const pendingPayoutCount = metrics.pending_payout_count ?? 2

  return (
    <div className="vendor-page-container vendor-dashboard-stage">
      {/* Title Header Section */}
      <div className="vendor-title-row smarthr-title-row">
        <div className="vendor-title-left smarthr-title-left">
          <div className="vendor-breadcrumb smarthr-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Portal Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Overview Katering</span>
          </div>
          <h1 className="vendor-main-title smarthr-main-title">Dashboard Vendor Mitra</h1>
          <p className="vendor-header-subtitle">
            Portal operasional terintegrasi untuk pemantauan pesanan katering, kesiapan dapur, dan pencairan payout SerasiWO.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Hak Akses: <strong>Read &amp; Update</strong>
            </span>
          </div>

          <button
            type="button"
            className="vendor-status-chip chip-amber"
            onClick={() => setActiveTab('jobs')}
            title="Klik untuk membuka tab Manajemen Pekerjaan"
          >
            <span className="chip-indicator amber-dot" />
            <span>
              Booking Baru: <strong>{pendingJobsCount} Menunggu</strong>
            </span>
          </button>
        </div>
      </div>

      {/* Dedicated Filter & Timeframe Toolbar */}
      <div className="vendor-overview-toolbar">
        <div className="vendor-filter-pill-group">
          {['Pekan Ini', 'Bulan Ini', 'Semua Jadwal'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`vendor-toolbar-pill ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="vendor-toolbar-meta">
          <span className="meta-info-text">
            Kategori: <strong>{profile.category || 'Katering & Jamuan'}</strong> • Mitra ID:{' '}
            <code>{profile.id || 'VND-KTR-001'}</code>
          </span>
        </div>
      </div>

      <div className="smarthr-kpi-grid">
        <div className="smarthr-kpi-card">
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Acara Minggu Ini (Terkunci WO)</span>
            <div className="smarthr-kpi-icon-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val">{weeklyEventsCount} Acara</span>
            <span className="smarthr-kpi-trend trend-up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              +1 Acara
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">100% Jadwal terkonfirmasi oleh WO</span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 18 Q 15 8, 28 14 T 50 6 T 68 10"
                  stroke="#16a34a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div
          className="smarthr-kpi-card"
          onClick={() => setActiveTab('jobs')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('jobs')
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Notifikasi Booking Baru</span>
            <div className="smarthr-kpi-icon-bubble ember-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val" style={{ color: '#ff5900' }}>
              {pendingJobsCount} Request
            </span>
            <span className="smarthr-kpi-trend trend-amber">
              <span className="live-amber-dot" /> Wajib Respons
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">Tanggapi di tab Manajemen Pekerjaan</span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 12 Q 18 20, 35 10 T 68 4"
                  stroke="#ff5900"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="smarthr-kpi-card">
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Total Porsi Terjadwal</span>
            <div className="smarthr-kpi-icon-bubble blue-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val">
              {totalPortions.toLocaleString('id-ID')} Porsi
            </span>
            <span className="smarthr-kpi-trend trend-up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              82% Kapasitas
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">{weeklyEventsCount} Ballroom utama pekan ini</span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 20 Q 20 6, 40 14 T 68 8"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div
          className="smarthr-kpi-card"
          onClick={() => setActiveTab('payout')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('payout')
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Estimasi Payout Siap Cair</span>
            <div className="smarthr-kpi-icon-bubble purple-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val">{formatRupiah(pendingPayoutAmount)}</span>
            <span className="smarthr-kpi-trend trend-up">{pendingPayoutCount} Invoice</span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">Menunggu verifikasi pencairan WO</span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 16 Q 18 12, 38 18 T 68 6"
                  stroke="#8b5cf6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="smarthr-dual-panel-grid">
        <div className="smarthr-card ringkasan-acara-panel">
          <div className="smarthr-card-header">
            <div className="card-header-left">
              <h2 className="smarthr-card-title">Ringkasan Acara Minggu Ini</h2>
              <span className="badge-readonly-tag">Akses: Read-Only</span>
            </div>
            <button
              type="button"
              className="smarthr-link-btn"
              onClick={() => setActiveTab('calendar')}
            >
              Lihat di Kalender &gt;
            </button>
          </div>

          <div className="ringkasan-acara-list">
            {weeklyEvents.map((ev) => {
              const badge = getDayBadgeParts(ev.event_date)
              return (
                <div
                  key={ev.id}
                  className={`acara-item-card ${badge.isToday ? 'acara-today' : ''}`}
                >
                  <div className="acara-date-badge">
                    <span className="acara-day">{badge.day}</span>
                    <span className="acara-month">{badge.month}</span>
                    {badge.isToday ? (
                      <span className="acara-pill-today">Hari Ini</span>
                    ) : (
                      <span className="acara-day-name">{badge.dayName}</span>
                    )}
                  </div>
                  <div className="acara-info-col">
                    <div className="acara-title-row">
                      <strong className="acara-couple-name">
                        {ev.couple_short || ev.wedding_title}
                      </strong>
                      <span className="acara-wo-badge">Terkunci Resmi WO</span>
                    </div>
                    <div className="acara-meta-row">
                      <span>📍 {ev.venue}</span>
                      <span>⏰ {ev.time_slot}</span>
                      <span>
                        🍽️ {Number(ev.portions_or_units).toLocaleString('id-ID')} Porsi (
                        {ev.portion_unit_label})
                      </span>
                    </div>
                    <div className="acara-footer-row">
                      <span className="acara-pic">
                        PIC WO: {ev.pic_wo || 'Dian Paramita (0812-3456-7890)'}
                      </span>
                      <span className="acara-readiness-chip">
                        Progres: {ev.readiness_status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="smarthr-card peak-hours-card">
          <div className="smarthr-card-header">
            <div>
              <h2 className="smarthr-card-title">Timeline Jam Sibuk Produksi &amp; Loading</h2>
              <p className="card-sub-desc">
                Intensitas aktivitas dapur mitra dari jam 06:00 sampai 18:00 WIB
              </p>
            </div>
          </div>

          <div className="peak-hours-content">
            <div className="peak-hours-graph-col">
              {VENDOR_PEAK_HOURS.map((item) => (
                <div key={item.time} className="peak-hour-bar-row">
                  <span className="peak-hour-time">{item.time}</span>
                  <div className="peak-hour-bar-track">
                    <div
                      className="peak-hour-bar-fill"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="peak-hour-label">
                    {item.label} ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="smarthr-middle-grid">
        <div className="smarthr-card storage-capsule-card">
          <div className="smarthr-card-header">
            <div>
              <h2 className="smarthr-card-title">Alokasi Kapasitas Mitra Katering</h2>
              <p className="card-sub-desc">
                Penggunaan fasilitas produksi dapur &amp; armada saat ini
              </p>
            </div>
          </div>

          <div className="storage-capsules-container">
            {VENDOR_CAPACITY_CAPSULES.map((cap) => (
              <div key={cap.label} className="capsule-col">
                <span className="capsule-top-amount">{cap.amount}</span>
                <div
                  className={`capsule-tube ${
                    cap.isHighlight ? 'capsule-tube-highlight' : ''
                  }`}
                >
                  <div
                    className="capsule-tube-fill"
                    style={{ height: `${cap.pct}%` }}
                  />
                </div>
                <span className="capsule-label">{cap.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="smarthr-card heatmap-error-card">
          <div className="smarthr-card-header">
            <div>
              <h2 className="smarthr-card-title">Heatmap Kepadatan Pesanan (30 Hari)</h2>
              <p className="card-sub-desc">
                Visual matriks utilisasi slot katering &amp; pesanan luar
              </p>
            </div>
            <div className="heatmap-legend-pills">
              <span className="legend-chip-low">Low</span>
              <span className="legend-chip-mid">Mid</span>
              <span className="legend-chip-high">Full Booked</span>
            </div>
          </div>

          <div className="heatmap-grid-scroll">
            <div className="heatmap-grid-body">
              {VENDOR_HEATMAP_GRID.map((row, rowIdx) => (
                <div key={rowIdx} className="heatmap-row">
                  {row.map((val, colIdx) => (
                    <div
                      key={colIdx}
                      className={`heatmap-cell heat-level-${val}`}
                      title={`Tingkat pesanan: ${val}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="smarthr-card inc-logs-card">
        <div className="smarthr-card-header">
          <div className="card-header-left">
            <h2 className="smarthr-card-title">
              Notifikasi Booking Baru (Menunggu Respons Mitra)
            </h2>
            <span className="badge-pending-count">
              {pendingJobsCount} Request Menunggu Keputusan
            </span>
          </div>
          <button
            type="button"
            className="smarthr-btn-orange-solid"
            onClick={() => setActiveTab('jobs')}
          >
            Buka Tab Manajemen Pekerjaan (Jobs) &gt;
          </button>
        </div>

        <div className="smarthr-table-wrapper">
          <table className="smarthr-incidents-table">
            <thead>
              <tr>
                <th>Pasangan Pengantin</th>
                <th>Tanggal Acara</th>
                <th>Lokasi Ballroom</th>
                <th>Jumlah Porsi</th>
                <th>Paket Layanan</th>
                <th>Estimasi Nilai</th>
                <th>Aksi Wajib</th>
              </tr>
            </thead>
            <tbody>
              {pendingJobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-td">
                    Semua permintaan booking baru telah direspons oleh mitra.
                  </td>
                </tr>
              ) : (
                pendingJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.couple_short || job.wedding_title}</strong>
                      <div className="table-sub-detail">
                        {job.client_tier || 'Klien SerasiWO'}
                      </div>
                    </td>
                    <td>{formatShortDateID(job.event_date)}</td>
                    <td>{job.venue}</td>
                    <td>
                      <strong>{Number(job.portions).toLocaleString('id-ID')} Porsi</strong>
                    </td>
                    <td>{job.package_name}</td>
                    <td>
                      <strong style={{ color: '#16a34a' }}>
                        {formatRupiah(job.payout_amount)}
                      </strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="smarthr-table-action-btn"
                        onClick={() => setActiveTab('jobs')}
                      >
                        Terima / Tolak di Jobs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
