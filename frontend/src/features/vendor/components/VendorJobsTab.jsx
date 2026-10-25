import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatRupiah, formatShortDateID } from '../utils/vendorFormatters'

export function VendorJobsTab() {
  const { openModal, showToast, searchQuery, refreshTick, reloadDashboard, setActiveTab } =
    useVendor()
  const [filter, setFilter] = useState('semua')
  const [jobs, setJobs] = useState([])
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [localSearch, setLocalSearch] = useState('')
  const [sortField, setSortField] = useState('event_date')
  const [sortOrder, setSortOrder] = useState('asc')

  const loadJobs = useCallback(async () => {
    try {
      const data = await vendorService.getJobs('semua')
      setJobs(Array.isArray(data) ? data : [])
    } catch {
      showToast('Gagal memuat daftar pekerjaan', 'error')
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    vendorService
      .getJobs('semua')
      .then((data) => {
        if (active) setJobs(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) showToast('Gagal memuat daftar pekerjaan', 'error')
      })
    return () => {
      active = false
    }
  }, [refreshTick, showToast])

  const handleQuickAccept = async (job) => {
    try {
      await vendorService.actionJob(job.id, 'terima')
      showToast(
        `Pesanan untuk ${job.wedding_title} berhasil diterima dan masuk jadwal kalender!`,
        'success'
      )
      await loadJobs()
      await reloadDashboard()
    } catch (err) {
      showToast(err.message || 'Gagal menerima pesanan pekerjaan', 'error')
    }
  }

  const handleOpenReject = (job) => {
    openModal('job_decision', { job, action: 'tolak' })
  }

  const toggleExpand = (jobId) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId))
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const activeSearch = localSearch || searchQuery || ''

  const processedJobs = useMemo(() => {
    const list = jobs.filter((j) => {
      if (filter !== 'semua' && j.status !== filter) {
        return false
      }
      if (!activeSearch) return true
      const q = activeSearch.toLowerCase()
      return (
        (j.wedding_title || '').toLowerCase().includes(q) ||
        (j.venue || '').toLowerCase().includes(q) ||
        (j.bride_groom || '').toLowerCase().includes(q) ||
        (j.menu_or_notes || '').toLowerCase().includes(q)
      )
    })

    return [...list].sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'event_date') {
        valA = new Date(valA).getTime()
        valB = new Date(valB).getTime()
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = (valB || '').toLowerCase()
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [jobs, filter, activeSearch, sortField, sortOrder])

  const handleExportCsv = () => {
    if (processedJobs.length === 0) {
      showToast('Tidak ada data pekerjaan untuk diekspor', 'error')
      return
    }
    const headers = [
      'ID Pekerjaan',
      'Acara Pernikahan',
      'Mempelai',
      'Tanggal Acara',
      'Sesi Waktu',
      'Lokasi Venue',
      'Jumlah Porsi',
      'Paket Layanan',
      'Estimasi Payout (IDR)',
      'Status',
    ]
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = processedJobs.map((j) =>
      [
        j.id,
        j.wedding_title,
        j.bride_groom,
        j.event_date,
        j.time_slot,
        j.venue,
        j.portions,
        j.package_name || j.portion_unit_label,
        j.payout_amount,
        j.status,
      ]
        .map(escapeCsv)
        .join(',')
    )
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `Rekap_Pekerjaan_Vendor_SerasiWO_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Berhasil mengekspor ${processedJobs.length} baris rekap pekerjaan ke CSV`, 'success')
  }

  const counts = useMemo(() => {
    return {
      all: jobs.length,
      pending: jobs.filter((j) => j.status === 'menunggu').length,
      accepted: jobs.filter((j) => j.status === 'diterima').length,
      rejected: jobs.filter((j) => j.status === 'ditolak').length,
      totalPayout: jobs.reduce((acc, curr) => acc + (curr.payout_amount || 0), 0),
    }
  }, [jobs])

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
            <span>Portal Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Manajemen Pekerjaan (Jobs)</span>
          </div>
          <h1 className="vendor-main-title">Manajemen Pekerjaan (Jobs)</h1>
          <p className="vendor-header-subtitle">
            Rekap pesanan katering resmi SerasiWO dengan rincian porsi, lokasi ballroom, dan aksi konfirmasi Terima / Tolak.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Hak Akses: <strong>Read &amp; Update</strong>
            </span>
          </div>

          {counts.pending > 0 && (
            <div className="vendor-status-chip chip-amber">
              <span className="chip-indicator amber-dot" />
              <span>
                Menunggu: <strong>{counts.pending} Permintaan</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick KPI Stat Strip */}
      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">TOTAL PESANAN TERCATAT</span>
          <strong className="jobs-kpi-val">{counts.all} Acara</strong>
          <span className="jobs-kpi-sub">Periode Okt - Des 2026</span>
        </div>

        <div className={`jobs-kpi-item ${counts.pending > 0 ? 'jobs-kpi-pending-alert' : ''}`}>
          <span className="jobs-kpi-label">MENUNGGU KONFIRMASI MITRA</span>
          <strong className="jobs-kpi-val text-amber">{counts.pending} Permintaan</strong>
          <span className="jobs-kpi-sub">Perlu respons cepat dalam 1x24 jam</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">PESANAN TERJADWAL RESMI</span>
          <strong className="jobs-kpi-val text-green">{counts.accepted} Diterima</strong>
          <span className="jobs-kpi-sub">Siap masuk tahap checklist kesiapan</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">ESTIMASI TOTAL NILAI PAYOUT</span>
          <strong className="jobs-kpi-val text-ember">{formatRupiah(counts.totalPayout)}</strong>
          <span className="jobs-kpi-sub">Total tagihan ke SerasiWO</span>
        </div>
      </div>

      {/* Dedicated Toolbar Card: Filter Chips & Search Bar */}
      <div className="vendor-card-panel jobs-filter-toolbar-card">
        <div className="vendor-jobs-filter-row">
          <div className="vendor-filter-chips">
            <button
              type="button"
              className={`filter-chip ${filter === 'semua' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilter('semua')}
            >
              Semua Pekerjaan ({counts.all})
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === 'menunggu' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilter('menunggu')}
            >
              {counts.pending > 0 && <span className="chip-alert-dot" />}
              Menunggu Keputusan ({counts.pending})
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === 'diterima' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilter('diterima')}
            >
              Diterima / Terjadwal ({counts.accepted})
            </button>
            <button
              type="button"
              className={`filter-chip ${filter === 'ditolak' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilter('ditolak')}
            >
              Ditolak ({counts.rejected})
            </button>
          </div>

          <div className="vendor-jobs-top-actions">
            <div className="table-search-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Cari acara, venue, menu..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="table-search-input"
              />
              {localSearch && (
                <button
                  type="button"
                  className="table-search-clear"
                  onClick={() => setLocalSearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className="secondary-surface-btn table-export-btn"
              onClick={handleExportCsv}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Ekspor Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern High-Density Data Table */}
      <div className="vendor-card-panel jobs-table-card">
        {processedJobs.length === 0 ? (
          <div className="vendor-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>Tidak ada pekerjaan ditemukan</h3>
            <p>
              Tidak ada data pesanan pekerjaan yang cocok dengan filter atau kata kunci pencarian Anda.
            </p>
            {(activeSearch || filter !== 'semua') && (
              <button
                type="button"
                className="secondary-surface-btn mt-3"
                onClick={() => {
                  setLocalSearch('')
                  setFilter('semua')
                }}
              >
                Reset Filter &amp; Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="jobs-table-responsive-wrapper">
            <table className="jobs-data-table">
              <thead>
                <tr>
                  <th
                    className="col-date sortable-th"
                    onClick={() => handleSort('event_date')}
                    title="Klik untuk mengurutkan berdasarkan tanggal acara"
                  >
                    <div className="th-sort-wrapper">
                      <span>TANGGAL &amp; WAKTU</span>
                      <span className="th-sort-icon">
                        {sortField === 'event_date' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    className="col-event sortable-th"
                    onClick={() => handleSort('wedding_title')}
                    title="Klik untuk mengurutkan berdasarkan nama acara"
                  >
                    <div className="th-sort-wrapper">
                      <span>ACARA &amp; KLIEN</span>
                      <span className="th-sort-icon">
                        {sortField === 'wedding_title' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="col-venue">LOKASI VENUE</th>
                  <th
                    className="col-portions sortable-th"
                    onClick={() => handleSort('portions')}
                    title="Klik untuk mengurutkan berdasarkan jumlah porsi"
                  >
                    <div className="th-sort-wrapper">
                      <span>PORSI &amp; PAKET</span>
                      <span className="th-sort-icon">
                        {sortField === 'portions' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    className="col-amount sortable-th"
                    onClick={() => handleSort('payout_amount')}
                    title="Klik untuk mengurutkan berdasarkan estimasi payout"
                  >
                    <div className="th-sort-wrapper">
                      <span>ESTIMASI PAYOUT</span>
                      <span className="th-sort-icon">
                        {sortField === 'payout_amount' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="col-status">STATUS</th>
                  <th className="col-actions text-right">AKSI OPERASIONAL</th>
                </tr>
              </thead>
              <tbody>
                {processedJobs.map((job) => {
                  const isPending = job.status === 'menunggu'
                  const isAccepted = job.status === 'diterima'
                  const isRejected = job.status === 'ditolak'
                  const isExpanded = expandedJobId === job.id

                  return (
                    <Fragment key={job.id}>
                      <tr
                        className={`jobs-table-row ${isPending ? 'row-pending-highlight' : ''} ${
                          isExpanded ? 'row-expanded-highlight' : ''
                        }`}
                      >
                        <td className="col-date">
                          <div className="cell-date-box">
                            <strong className="cell-primary-text">
                              {formatShortDateID(job.event_date)}
                            </strong>
                            <span className="cell-sub-text time-slot-pill">{job.time_slot}</span>
                          </div>
                        </td>

                        <td className="col-event">
                          <div className="cell-event-box">
                            <span className="cell-category-tag">{job.category}</span>
                            <strong
                              className="cell-primary-text wedding-link-title"
                              onClick={() => toggleExpand(job.id)}
                            >
                              {job.wedding_title}
                            </strong>
                            <span className="cell-sub-text">{job.bride_groom}</span>
                          </div>
                        </td>

                        <td className="col-venue">
                          <div className="cell-venue-box">
                            <strong className="cell-primary-text">{job.venue}</strong>
                            <span className="cell-sub-text venue-sub-text">
                              {job.venue_address}
                            </span>
                          </div>
                        </td>

                        <td className="col-portions">
                          <div className="cell-portions-box">
                            <span className="portion-badge-highlight">
                              {job.portions.toLocaleString('id-ID')} Porsi
                            </span>
                            <span className="cell-sub-text">{job.portion_unit_label}</span>
                          </div>
                        </td>

                        <td className="col-amount">
                          <div className="cell-amount-box">
                            <strong className="cell-amount-text">
                              {formatRupiah(job.payout_amount)}
                            </strong>
                            <span className="cell-sub-text">Faktur WO Net</span>
                          </div>
                        </td>

                        <td className="col-status">
                          {isPending && (
                            <span className="table-status-pill status-pill-pending">
                              <span className="pulse-dot" /> Menunggu Respons
                            </span>
                          )}
                          {isAccepted && (
                            <span className="table-status-pill status-pill-accepted">
                              ✓ Diterima
                            </span>
                          )}
                          {isRejected && (
                            <span className="table-status-pill status-pill-rejected">
                              ✕ Ditolak
                            </span>
                          )}
                        </td>

                        <td className="col-actions text-right">
                          <div className="table-action-button-group">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-table-accept"
                                  onClick={() => handleQuickAccept(job)}
                                  title="Terima pesanan pekerjaan ini"
                                >
                                  ✓ Terima
                                </button>
                                <button
                                  type="button"
                                  className="btn-table-reject"
                                  onClick={() => handleOpenReject(job)}
                                  title="Tolak pesanan pekerjaan ini"
                                >
                                  ✕ Tolak
                                </button>
                              </>
                            ) : isAccepted ? (
                              <button
                                type="button"
                                className="btn-table-detail"
                                onClick={() => toggleExpand(job.id)}
                              >
                                {isExpanded ? 'Tutup Rincian ▲' : 'Rincian Menu ▼'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-table-detail btn-table-muted"
                                onClick={() => toggleExpand(job.id)}
                              >
                                {isExpanded ? 'Tutup ▲' : 'Lihat Alasan ▼'}
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn-table-expand-chevron"
                              onClick={() => toggleExpand(job.id)}
                              aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}
                              title="Buka rincian lengkap pesanan"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                style={{
                                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.15s ease',
                                }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${job.id}-expanded`} className="jobs-expanded-subrow">
                          <td colSpan={7}>
                            <div className="expanded-detail-drawer">
                              <div className="expanded-grid">
                                <div className="expanded-detail-col">
                                  <h4 className="expanded-heading">
                                    Rincian Menu Jamuan &amp; Porsi:
                                  </h4>
                                  <div className="expanded-menu-box">
                                    <p>{job.menu_or_notes}</p>
                                  </div>
                                </div>

                                <div className="expanded-detail-col">
                                  <h4 className="expanded-heading">
                                    Permintaan Khusus &amp; Logistik Venue:
                                  </h4>
                                  <div className="expanded-special-box">
                                    {job.special_request ? (
                                      <p className="special-req-text">
                                        <strong>Catatan Klien:</strong> {job.special_request}
                                      </p>
                                    ) : (
                                      <p className="special-req-empty">
                                        Tidak ada permintaan diet atau menu khusus dari klien.
                                      </p>
                                    )}

                                    {job.decision_note && (
                                      <div className="decision-note-box">
                                        <strong>Alasan Keputusan:</strong> {job.decision_note}
                                      </div>
                                    )}

                                    <div className="expanded-logistics-mini">
                                      <span>Akses Loading: Pintu Dock Barat</span>
                                      <span>Kebutuhan Kru: Minimal 18 personil</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="expanded-footer-bar">
                                <div className="expanded-left-meta">
                                  <span>
                                    ID Pekerjaan: <code>{job.id}</code>
                                  </span>
                                  <span>
                                    Kode Proyek: <code>SR-2026-WO</code>
                                  </span>
                                </div>

                                <div className="expanded-actions">
                                  <button
                                    type="button"
                                    className="secondary-surface-btn btn-sm-action"
                                    onClick={() => setActiveTab('manifest_menu')}
                                  >
                                    Buka Surat Jalan &amp; Menu
                                  </button>
                                  {isAccepted && (
                                    <button
                                      type="button"
                                      className="btn-action-accept"
                                      onClick={() => setActiveTab('readiness')}
                                    >
                                      Update Kesiapan Acara →
                                    </button>
                                  )}
                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn-table-reject"
                                        onClick={() => handleOpenReject(job)}
                                      >
                                        Tolak Pesanan
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-action-accept"
                                        onClick={() => handleQuickAccept(job)}
                                      >
                                        Terima &amp; Jadwalkan
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>

            <div className="jobs-table-footer-bar">
              <div className="jobs-footer-left">
                <span>
                  Menampilkan <strong>{processedJobs.length}</strong> dari{' '}
                  <strong>{jobs.length}</strong> pesanan katering
                </span>
                {(activeSearch || filter !== 'semua') && (
                  <span className="jobs-footer-filter-tag">
                    (Filter: {filter !== 'semua' ? filter : ''}
                    {activeSearch ? ` "${activeSearch}"` : ''})
                  </span>
                )}
              </div>
              <div className="jobs-footer-right">
                <span className="jobs-footer-hint">
                  Klik baris atau tombol Rincian untuk memeriksa menu &amp; logistik
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
