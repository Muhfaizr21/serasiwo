import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatShortDateID } from '../utils/vendorFormatters'

const SHORT_STEP_LABELS = [
  'Bahan Mentah',
  'Loading Armada',
  'Standby Venue',
  'Serah Terima',
]

export function VendorReadinessTab() {
  const { showToast, reloadDashboard, refreshTick, searchQuery, setActiveTab } = useVendor()
  const [readinessList, setReadinessList] = useState([])
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [editingNotes, setEditingNotes] = useState({})
  const [editingCompletedKey, setEditingCompletedKey] = useState(null)
  const [filterStatus, setFilterStatus] = useState('semua')
  const [localSearch, setLocalSearch] = useState('')
  const [sortField, setSortField] = useState('event_date')
  const [sortOrder, setSortOrder] = useState('asc')
  const [submittingKey, setSubmittingKey] = useState(null)

  const loadReadiness = useCallback(async () => {
    try {
      const data = await vendorService.getReadiness()
      setReadinessList(Array.isArray(data) ? data : [])
    } catch {
      showToast('Gagal memuat status kesiapan produksi', 'error')
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    vendorService
      .getReadiness()
      .then((data) => {
        if (active) setReadinessList(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) showToast('Gagal memuat status kesiapan produksi', 'error')
      })
    return () => {
      active = false
    }
  }, [refreshTick, showToast])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleExpand = (jobId) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId))
  }

  const handleToggleStep = async (jobId, stepId, currentCompleted) => {
    const nextCompleted = !currentCompleted
    const stepKey = `${jobId}_${stepId}`
    const customNote = editingNotes[stepKey] || ''
    setSubmittingKey(stepKey)
    try {
      await vendorService.updateReadinessStep(jobId, stepId, nextCompleted, customNote)
      showToast(
        nextCompleted
          ? 'Tahapan kesiapan berhasil ditandai selesai dan tersimpan di Supabase!'
          : 'Tahapan kesiapan dikembalikan ke status belum selesai.',
        'success'
      )
      setEditingCompletedKey(null)
      await loadReadiness()
      await reloadDashboard()
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui status kesiapan', 'error')
    } finally {
      setSubmittingKey(null)
    }
  }

  const handleSaveNoteOnly = async (jobId, step) => {
    const stepKey = `${jobId}_${step.step_id}`
    const customNote =
      editingNotes[stepKey] !== undefined ? editingNotes[stepKey] : step.proof_note || ''
    if (!customNote.trim()) {
      showToast('Catatan lapangan tidak boleh kosong', 'error')
      return
    }
    setSubmittingKey(stepKey)
    try {
      await vendorService.updateReadinessStep(jobId, step.step_id, true, customNote)
      showToast('Catatan bukti lapangan berhasil diperbarui!', 'success')
      setEditingCompletedKey(null)
      await loadReadiness()
      await reloadDashboard()
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan catatan lapangan', 'error')
    } finally {
      setSubmittingKey(null)
    }
  }

  const handleBatchAction = async (jobR, actionType) => {
    const actionKey = `${jobR.job_id}_${actionType}`
    setSubmittingKey(actionKey)
    try {
      if (actionType === 'all_complete') {
        await vendorService.updateReadinessStep(
          jobR.job_id,
          'all_complete',
          true,
          'Seluruh tahapan produksi, loading, standby, dan serah terima selesai 100%.'
        )
        showToast(
          `Seluruh tahapan untuk ${jobR.wedding_title} telah selesai (100%)!`,
          'success'
        )
      } else if (actionType === 'reset_all') {
        await vendorService.updateReadinessStep(jobR.job_id, 'reset_all', false, '')
        showToast(
          `Progres kesiapan untuk ${jobR.wedding_title} direset kembali ke 0%.`,
          'success'
        )
      }
      await loadReadiness()
      await reloadDashboard()
    } catch (err) {
      showToast(err.message || 'Gagal memproses aksi kesiapan', 'error')
    } finally {
      setSubmittingKey(null)
    }
  }

  const metrics = useMemo(() => {
    const total = readinessList.length
    const completed = readinessList.filter((r) => r.progress_percent === 100).length
    const inProgress = readinessList.filter(
      (r) => r.progress_percent > 0 && r.progress_percent < 100
    ).length
    const notStarted = readinessList.filter((r) => r.progress_percent === 0).length
    const avgProgress =
      total > 0
        ? Math.round(
            readinessList.reduce((sum, r) => sum + (r.progress_percent || 0), 0) / total
          )
        : 0
    return { total, completed, inProgress, notStarted, avgProgress }
  }, [readinessList])

  const activeQuery = (localSearch || searchQuery || '').trim().toLowerCase()

  const processedReadiness = useMemo(() => {
    const filtered = readinessList.filter((item) => {
      if (
        filterStatus === 'berjalan' &&
        !(item.progress_percent > 0 && item.progress_percent < 100)
      ) {
        return false
      }
      if (filterStatus === 'belum_mulai' && item.progress_percent !== 0) {
        return false
      }
      if (filterStatus === 'selesai' && item.progress_percent !== 100) {
        return false
      }
      if (!activeQuery) return true
      return (
        (item.wedding_title || '').toLowerCase().includes(activeQuery) ||
        (item.venue || '').toLowerCase().includes(activeQuery) ||
        (item.current_status || '').toLowerCase().includes(activeQuery)
      )
    })

    return [...filtered].sort((a, b) => {
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
  }, [readinessList, filterStatus, activeQuery, sortField, sortOrder])

  const handleExportCsv = () => {
    if (processedReadiness.length === 0) {
      showToast('Tidak ada data kesiapan untuk diekspor', 'error')
      return
    }
    const headers = [
      'ID Pekerjaan',
      'Acara Pernikahan',
      'Tanggal Acara',
      'Waktu',
      'Lokasi Ballroom',
      'Jumlah Porsi',
      'Status Saat Ini',
      'Progres (%)',
    ]
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = processedReadiness.map((r) =>
      [
        r.job_id,
        r.wedding_title,
        r.event_date,
        r.time_slot,
        r.venue,
        `${r.portions} ${r.unit_label || 'Porsi'}`,
        r.current_status,
        `${r.progress_percent}%`,
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
      `Rekap_Kesiapan_Vendor_SerasiWO_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(
      `Berhasil mengekspor ${processedReadiness.length} baris matriks kesiapan ke CSV`,
      'success'
    )
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
            <span>Portal Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Matriks Status Kesiapan</span>
          </div>
          <h1 className="vendor-main-title">Matriks Kesiapan Operasional</h1>
          <p className="vendor-header-subtitle">
            Pantau dan perbarui 4 tahapan produksi katering langsung dari tabel matriks atau klik baris untuk mengedit catatan bukti lapangan.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Database: <strong>Supabase PostgreSQL Live</strong>
            </span>
          </div>
          <div className="vendor-status-chip chip-amber">
            <span>
              Rata-rata Kesiapan: <strong>{metrics.avgProgress}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">TOTAL ACARA TERJADWAL</span>
          <strong className="jobs-kpi-val">{metrics.total} Acara</strong>
          <span className="jobs-kpi-sub">Tersinkronisasi otomatis dari Jobs</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">SEDANG DALAM PROSES</span>
          <strong className="jobs-kpi-val text-amber">{metrics.inProgress} Acara</strong>
          <span className="jobs-kpi-sub">Tahap persiapan dapur &amp; loading</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">MENUNGGU PERSIAPAN (0%)</span>
          <strong className="jobs-kpi-val">{metrics.notStarted} Acara</strong>
          <span className="jobs-kpi-sub">Siap dimulai sesuai jadwal H-2</span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">SELESAI &amp; SERAH TERIMA</span>
          <strong className="jobs-kpi-val text-green">{metrics.completed} Acara</strong>
          <span className="jobs-kpi-sub">Siap diajukan pencairan payout</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="vendor-card-panel jobs-filter-toolbar-card">
        <div className="vendor-jobs-filter-row">
          <div className="vendor-filter-chips">
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'semua' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('semua')}
            >
              Semua Acara ({metrics.total})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'berjalan' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('berjalan')}
            >
              Dalam Proses ({metrics.inProgress})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'belum_mulai' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('belum_mulai')}
            >
              Belum Dimulai ({metrics.notStarted})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'selesai' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('selesai')}
            >
              Selesai 100% ({metrics.completed})
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
                placeholder="Cari acara, lokasi ballroom..."
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
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Operational Readiness Matrix Table */}
      <div className="vendor-card-panel jobs-table-card">
        {processedReadiness.length === 0 ? (
          <div className="vendor-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <h3>Tidak ada data kesiapan yang sesuai</h3>
            <p>
              Belum ada jadwal acara yang cocok dengan filter status atau kata kunci pencarian.
            </p>
            {(filterStatus !== 'semua' || localSearch) && (
              <button
                type="button"
                className="secondary-surface-btn mt-3"
                onClick={() => {
                  setFilterStatus('semua')
                  setLocalSearch('')
                }}
              >
                Reset Filter &amp; Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="jobs-table-responsive-wrapper">
            <table className="jobs-data-table readiness-matrix-table">
              <thead>
                <tr>
                  <th
                    className="col-date sortable-th"
                    onClick={() => handleSort('event_date')}
                    title="Urutkan berdasarkan tanggal pelaksanaan"
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
                    title="Urutkan berdasarkan nama acara"
                  >
                    <div className="th-sort-wrapper">
                      <span>ACARA &amp; BALLROOM</span>
                      <span className="th-sort-icon">
                        {sortField === 'wedding_title' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th>MATRIKS 4 TAHAP PRODUKSI (KLIK UNTUK UPDATE)</th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('progress_percent')}
                    title="Urutkan berdasarkan persentase kesiapan"
                  >
                    <div className="th-sort-wrapper">
                      <span>STATUS &amp; PROGRES</span>
                      <span className="th-sort-icon">
                        {sortField === 'progress_percent'
                          ? sortOrder === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="col-actions text-right">AKSI OPERASIONAL</th>
                </tr>
              </thead>
              <tbody>
                {processedReadiness.map((jobR) => {
                  const firstIncompleteIdx = jobR.steps.findIndex((s) => !s.completed)
                  const nextStep =
                    firstIncompleteIdx !== -1 ? jobR.steps[firstIncompleteIdx] : null
                  const isFullyDone = jobR.progress_percent === 100
                  const isExpanded = expandedJobId === jobR.job_id

                  return (
                    <Fragment key={jobR.job_id}>
                      <tr
                        className={`jobs-table-row ${
                          isFullyDone ? 'row-completed-highlight' : ''
                        } ${isExpanded ? 'row-expanded-highlight' : ''}`}
                      >
                        {/* 1. Tanggal & Waktu */}
                        <td className="col-date">
                          <div className="cell-date-box">
                            <strong className="cell-primary-text">
                              {formatShortDateID(jobR.event_date)}
                            </strong>
                            <span className="cell-sub-text time-slot-pill">
                              {jobR.time_slot}
                            </span>
                          </div>
                        </td>

                        {/* 2. Acara, Venue, & Porsi */}
                        <td className="col-event">
                          <div className="cell-event-box">
                            <strong
                              className="cell-primary-text wedding-link-title"
                              onClick={() => toggleExpand(jobR.job_id)}
                            >
                              {jobR.wedding_title}
                            </strong>
                            <span className="cell-sub-text venue-sub-text">
                              {jobR.venue}
                            </span>
                            <span className="cell-category-tag">
                              {jobR.portions.toLocaleString('id-ID')}{' '}
                              {jobR.unit_label || 'Porsi'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Matriks 4 Tahap Produksi */}
                        <td className="readiness-pipeline-cell">
                          <div className="readiness-pipeline-grid">
                            {jobR.steps.map((step, idx) => {
                              const stepKey = `${jobR.job_id}_${step.step_id}`
                              const isNext = idx === firstIncompleteIdx
                              const isBusy = submittingKey === stepKey

                              return (
                                <button
                                  key={step.step_id}
                                  type="button"
                                  disabled={isBusy}
                                  className={`readiness-step-pill-btn ${
                                    step.completed
                                      ? 'step-pill-done'
                                      : isNext
                                        ? 'step-pill-active'
                                        : 'step-pill-locked'
                                  }`}
                                  onClick={() =>
                                    handleToggleStep(
                                      jobR.job_id,
                                      step.step_id,
                                      step.completed
                                    )
                                  }
                                  title={
                                    step.completed
                                      ? `${step.title}: Selesai (${step.proof_note || 'Klik untuk batalkan'})`
                                      : isNext
                                        ? `Klik untuk menandai '${step.title}' selesai`
                                        : `Selesaikan Langkah ${firstIncompleteIdx + 1} terlebih dahulu`
                                  }
                                >
                                  <div className="step-pill-top">
                                    <span className="step-pill-num">Tahap {idx + 1}</span>
                                    {step.completed ? (
                                      <span className="step-pill-icon-done">✓</span>
                                    ) : isNext ? (
                                      <span className="step-pill-icon-active" />
                                    ) : (
                                      <span className="step-pill-icon-locked">•</span>
                                    )}
                                  </div>
                                  <span className="step-pill-title">
                                    {SHORT_STEP_LABELS[idx] || step.title}
                                  </span>
                                  <span className="step-pill-meta">
                                    {step.completed
                                      ? step.completed_at
                                        ? new Date(step.completed_at).toLocaleTimeString(
                                            'id-ID',
                                            {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            }
                                          ) + ' WIB'
                                        : 'Selesai'
                                      : isNext
                                        ? 'Klik Selesai →'
                                        : 'Menunggu'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </td>

                        {/* 4. Status & Progress Bar */}
                        <td>
                          <div className="cell-readiness-progress">
                            <div>
                              {isFullyDone ? (
                                <span className="table-status-pill status-pill-accepted">
                                  ✓ {jobR.current_status}
                                </span>
                              ) : jobR.progress_percent > 0 ? (
                                <span className="table-status-pill status-pill-pending">
                                  <span className="pulse-dot" /> {jobR.current_status}
                                </span>
                              ) : (
                                <span className="table-status-pill">
                                  {jobR.current_status}
                                </span>
                              )}
                            </div>

                            <div className="readiness-inline-bar-row">
                              <div className="readiness-inline-track">
                                <div
                                  className={`readiness-inline-fill ${
                                    isFullyDone ? 'fill-complete' : ''
                                  }`}
                                  style={{ width: `${jobR.progress_percent}%` }}
                                />
                              </div>
                              <span className="readiness-inline-pct">
                                {jobR.progress_percent}%
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Aksi Operasional */}
                        <td className="col-actions text-right">
                          <div className="table-action-button-group">
                            {nextStep ? (
                              <button
                                type="button"
                                className="btn-table-accept"
                                disabled={
                                  submittingKey === `${jobR.job_id}_${nextStep.step_id}`
                                }
                                onClick={() =>
                                  handleToggleStep(jobR.job_id, nextStep.step_id, false)
                                }
                                title={`Tandai ${nextStep.title} selesai`}
                              >
                                ✓ Selesaikan Tahap {firstIncompleteIdx + 1}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-table-accept"
                                onClick={() => setActiveTab('payout')}
                                title="Lanjutkan ke pengajuan invoice payout"
                              >
                                Ajukan Payout →
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn-table-detail"
                              onClick={() => toggleExpand(jobR.job_id)}
                            >
                              {isExpanded ? 'Tutup ▲' : 'Catatan ▼'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-row Drawer: Edit Catatan Lapangan & Batch Controls */}
                      {isExpanded && (
                        <tr
                          key={`${jobR.job_id}-drawer`}
                          className="jobs-expanded-subrow"
                        >
                          <td colSpan={5}>
                            <div className="expanded-detail-drawer">
                              <div className="readiness-drawer-steps-grid">
                                {jobR.steps.map((step, idx) => {
                                  const stepKey = `${jobR.job_id}_${step.step_id}`
                                  const isNext = idx === firstIncompleteIdx
                                  const isLocked =
                                    !step.completed &&
                                    firstIncompleteIdx !== -1 &&
                                    idx > firstIncompleteIdx
                                  const isEditingNote = editingCompletedKey === stepKey
                                  const isBusy = submittingKey === stepKey

                                  return (
                                    <div
                                      key={step.step_id}
                                      className={`readiness-drawer-step-card ${
                                        step.completed
                                          ? 'drawer-step-done'
                                          : isNext
                                            ? 'drawer-step-next'
                                            : ''
                                      }`}
                                    >
                                      <div className="drawer-step-header">
                                        <div className="drawer-step-title-group">
                                          <button
                                            type="button"
                                            disabled={isBusy}
                                            className={`drawer-step-check-btn ${
                                              step.completed ? 'checked' : ''
                                            }`}
                                            onClick={() =>
                                              handleToggleStep(
                                                jobR.job_id,
                                                step.step_id,
                                                step.completed
                                              )
                                            }
                                            title={
                                              step.completed
                                                ? 'Batalkan tahapan ini'
                                                : 'Tandai tahapan selesai'
                                            }
                                          >
                                            ✓
                                          </button>
                                          <span className="step-order-pill">
                                            Langkah {idx + 1}
                                          </span>
                                          <strong className="cell-primary-text">
                                            {step.title}
                                          </strong>
                                        </div>

                                        {step.completed ? (
                                          <span className="step-timestamp">
                                            ✓{' '}
                                            {step.completed_at
                                              ? new Date(
                                                  step.completed_at
                                                ).toLocaleTimeString('id-ID', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                }) + ' WIB'
                                              : 'Selesai'}
                                          </span>
                                        ) : isNext ? (
                                          <span className="cell-category-tag">
                                            Tahap Aktif
                                          </span>
                                        ) : (
                                          <span className="cell-sub-text">
                                            Menunggu Langkah {firstIncompleteIdx + 1}
                                          </span>
                                        )}
                                      </div>

                                      <p className="drawer-step-desc">
                                        {step.description}
                                      </p>

                                      {step.completed && !isEditingNote && (
                                        <div className="drawer-step-note-box">
                                          <span>
                                            <strong>Bukti Lapangan:</strong>{' '}
                                            {step.proof_note ||
                                              'Terkonfirmasi sesuai SOP SerasiWO.'}
                                          </span>
                                          <button
                                            type="button"
                                            className="secondary-surface-btn btn-sm-action"
                                            onClick={() => {
                                              setEditingNotes((prev) => ({
                                                ...prev,
                                                [stepKey]: step.proof_note || '',
                                              }))
                                              setEditingCompletedKey(stepKey)
                                            }}
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      )}

                                      {step.completed && isEditingNote && (
                                        <div className="drawer-step-input-row">
                                          <input
                                            type="text"
                                            className="drawer-step-input"
                                            value={
                                              editingNotes[stepKey] ??
                                              step.proof_note ??
                                              ''
                                            }
                                            onChange={(e) =>
                                              setEditingNotes((prev) => ({
                                                ...prev,
                                                [stepKey]: e.target.value,
                                              }))
                                            }
                                            placeholder="Perbarui catatan bukti lapangan..."
                                          />
                                          <button
                                            type="button"
                                            className="btn-table-accept"
                                            disabled={isBusy}
                                            onClick={() =>
                                              handleSaveNoteOnly(jobR.job_id, step)
                                            }
                                          >
                                            Simpan
                                          </button>
                                          <button
                                            type="button"
                                            className="secondary-surface-btn btn-sm-action"
                                            onClick={() => setEditingCompletedKey(null)}
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      )}

                                      {!step.completed && (
                                        <div className="drawer-step-input-row">
                                          <input
                                            type="text"
                                            className="drawer-step-input"
                                            placeholder={
                                              isLocked
                                                ? `Selesaikan Langkah ${firstIncompleteIdx + 1} dulu...`
                                                : 'Catatan bukti (misal: armada berangkat 06:30 WIB)...'
                                            }
                                            value={editingNotes[stepKey] || ''}
                                            onChange={(e) =>
                                              setEditingNotes((prev) => ({
                                                ...prev,
                                                [stepKey]: e.target.value,
                                              }))
                                            }
                                          />
                                          <button
                                            type="button"
                                            className="btn-table-accept"
                                            disabled={isBusy}
                                            onClick={() =>
                                              handleToggleStep(
                                                jobR.job_id,
                                                step.step_id,
                                                false
                                              )
                                            }
                                          >
                                            {isBusy ? '...' : 'Selesai'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="expanded-footer-bar">
                                <div className="expanded-left-meta">
                                  <span>
                                    ID Pekerjaan: <code>{jobR.job_id}</code>
                                  </span>
                                  <span>
                                    Lokasi: <strong>{jobR.venue}</strong>
                                  </span>
                                </div>

                                <div className="expanded-actions">
                                  <button
                                    type="button"
                                    className="secondary-surface-btn btn-sm-action"
                                    onClick={() => setActiveTab('kitchen_loading')}
                                  >
                                    Jadwal Loading Dapur
                                  </button>

                                  {jobR.progress_percent > 0 && (
                                    <button
                                      type="button"
                                      className="btn-table-reject"
                                      disabled={
                                        submittingKey === `${jobR.job_id}_reset_all`
                                      }
                                      onClick={() =>
                                        handleBatchAction(jobR, 'reset_all')
                                      }
                                    >
                                      Reset Progres (0%)
                                    </button>
                                  )}

                                  {!isFullyDone && (
                                    <button
                                      type="button"
                                      className="btn-action-accept"
                                      disabled={
                                        submittingKey === `${jobR.job_id}_all_complete`
                                      }
                                      onClick={() =>
                                        handleBatchAction(jobR, 'all_complete')
                                      }
                                    >
                                      Selesaikan Semua Tahap (100%)
                                    </button>
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
                  Menampilkan <strong>{processedReadiness.length}</strong> dari{' '}
                  <strong>{readinessList.length}</strong> acara terjadwal
                </span>
              </div>
              <div className="jobs-footer-right">
                <span className="jobs-footer-hint">
                  Klik kotak Tahap 1 - 4 pada tabel untuk update instan, atau klik Catatan untuk mengisi bukti lapangan
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
