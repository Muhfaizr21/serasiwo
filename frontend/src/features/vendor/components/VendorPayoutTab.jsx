import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatRupiah, formatShortDateID } from '../utils/vendorFormatters'
import { downloadPayoutReceiptPdf } from '../utils/vendorPdfGenerator'

export function VendorPayoutTab() {
  const {
    openModal,
    showToast,
    searchQuery,
    refreshTick,
    reloadDashboard,
    setActiveTab,
    vendorData,
  } = useVendor()
  const [payouts, setPayouts] = useState([])
  const [filterStatus, setFilterStatus] = useState('semua')
  const [localSearch, setLocalSearch] = useState('')
  const [sortField, setSortField] = useState('submitted_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedPayoutId, setExpandedPayoutId] = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [busyId, setBusyId] = useState(null)

  const loadPayouts = useCallback(async () => {
    try {
      const data = await vendorService.getPayouts()
      setPayouts(Array.isArray(data) ? data : [])
    } catch {
      showToast('Gagal memuat riwayat penagihan payout', 'error')
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    vendorService
      .getPayouts()
      .then((data) => {
        if (active) setPayouts(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (active) showToast('Gagal memuat riwayat penagihan payout', 'error')
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
      setSortOrder('desc')
    }
  }

  const toggleExpand = (payoutId) => {
    setExpandedPayoutId((prev) => (prev === payoutId ? null : payoutId))
  }

  const handlePayoutAction = async (payout, action, customNote = '') => {
    setBusyId(`${payout.id}_${action}`)
    try {
      await vendorService.actionPayout(payout.id, action, customNote)
      if (action === 'verifikasi') {
        showToast(
          `Faktur ${payout.invoice_number} diverifikasi dan masuk antrian pencairan WO!`,
          'success'
        )
      } else if (action === 'cairkan') {
        showToast(
          `Dana faktur ${payout.invoice_number} (${formatRupiah(payout.amount)}) telah dicairkan (Lunas)!`,
          'success'
        )
      } else if (action === 'batalkan') {
        showToast(
          `Pengajuan faktur ${payout.invoice_number} telah dibatalkan dari database.`,
          'success'
        )
        setExpandedPayoutId(null)
      } else if (action === 'update_catatan') {
        showToast('Catatan faktur berhasil diperbarui!', 'success')
        setEditingNoteId(null)
      }
      await loadPayouts()
      await reloadDashboard()
    } catch (err) {
      showToast(err.message || 'Gagal memproses aksi tagihan', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleDownloadReceipt = (p) => {
    downloadPayoutReceiptPdf(p)
    showToast(`Kwitansi PDF resmi ${p.invoice_number} berhasil diunduh!`, 'success')
  }

  const metrics = useMemo(() => {
    const paidList = payouts.filter((p) => p.status === 'dicairkan')
    const processingList = payouts.filter((p) => p.status === 'diproses')
    const pendingList = payouts.filter((p) => p.status === 'tertunda')

    const disbursedAmount = paidList.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    )
    const pendingAmount = [...processingList, ...pendingList].reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    )
    const totalAmount = payouts.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    )

    return {
      allCount: payouts.length,
      paidCount: paidList.length,
      processingCount: processingList.length,
      pendingCount: pendingList.length,
      disbursedAmount,
      pendingAmount,
      totalAmount,
    }
  }, [payouts])

  const activeQuery = (localSearch || searchQuery || '').trim().toLowerCase()

  const processedPayouts = useMemo(() => {
    const list = payouts.filter((p) => {
      if (filterStatus !== 'semua' && p.status !== filterStatus) {
        return false
      }
      if (!activeQuery) return true
      return (
        (p.invoice_number || '').toLowerCase().includes(activeQuery) ||
        (p.wedding_title || '').toLowerCase().includes(activeQuery) ||
        (p.bank_name || '').toLowerCase().includes(activeQuery) ||
        (p.status_label || p.status || '').toLowerCase().includes(activeQuery) ||
        (p.notes || '').toLowerCase().includes(activeQuery)
      )
    })

    return [...list].sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'submitted_at' || sortField === 'event_date') {
        valA = new Date(valA || 0).getTime()
        valB = new Date(valB || 0).getTime()
      } else if (sortField === 'amount') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = (valB || '').toLowerCase()
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [payouts, filterStatus, activeQuery, sortField, sortOrder])

  const handleExportCsv = () => {
    if (processedPayouts.length === 0) {
      showToast('Tidak ada data tagihan untuk diekspor', 'error')
      return
    }
    const headers = [
      'No. Invoice',
      'ID Pekerjaan',
      'Keterangan Acara',
      'Tanggal Acara',
      'Nominal Tagihan (IDR)',
      'Bank Tujuan',
      'No. Rekening',
      'Atas Nama',
      'Status Pembayaran',
      'Tanggal Pengajuan',
      'Catatan',
    ]
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = processedPayouts.map((p) =>
      [
        p.invoice_number,
        p.job_id,
        p.wedding_title,
        p.event_date,
        p.amount,
        p.bank_name,
        p.account_number,
        p.account_holder,
        p.status_label || p.status,
        p.submitted_at,
        p.notes || '',
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
      `Rekap_Payout_Vendor_SerasiWO_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(
      `Berhasil mengekspor ${processedPayouts.length} baris rekap tagihan ke CSV`,
      'success'
    )
  }

  const profileBank = vendorData?.vendor_profile?.bank_name || 'Bank Central Asia (BCA)'
  const profileAccNo = vendorData?.vendor_profile?.account_number || '521-0988-123'
  const profileHolder =
    vendorData?.vendor_profile?.account_holder || 'CV Berkah Rasa Nusantara'

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
            <span className="smarthr-crumb-active">Penagihan &amp; Payout</span>
          </div>
          <h1 className="vendor-main-title">Penagihan Vendor &amp; Pencairan Payout</h1>
          <p className="vendor-header-subtitle">
            Unggah berkas invoice tagihan layanan katering, pantau verifikasi keuangan SerasiWO, dan unduh kwitansi pencairan resmi.
          </p>
        </div>

        <div className="vendor-title-badges">
          <div className="vendor-status-chip chip-green">
            <span className="chip-indicator green-dot" />
            <span>
              Database: <strong>Supabase PostgreSQL Live</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('create_payout')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Unggah Invoice Tagihan</span>
          </button>
        </div>
      </div>

      {/* 4-Card KPI Summary Strip */}
      <div className="jobs-kpi-summary-strip">
        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">TOTAL DANA DICAIRKAN (LUNAS)</span>
          <strong className="jobs-kpi-val text-green">
            {formatRupiah(metrics.disbursedAmount)}
          </strong>
          <span className="jobs-kpi-sub">
            {metrics.paidCount} faktur lunas ditransfer ke rekening mitra
          </span>
        </div>

        <div
          className={`jobs-kpi-item ${
            metrics.pendingCount > 0 ? 'jobs-kpi-pending-alert' : ''
          }`}
        >
          <span className="jobs-kpi-label">TAGIHAN TERTUNDA / DIPROSES</span>
          <strong className="jobs-kpi-val text-amber">
            {formatRupiah(metrics.pendingAmount)}
          </strong>
          <span className="jobs-kpi-sub">
            {metrics.pendingCount} menunggu verifikasi • {metrics.processingCount} antrian transfer
          </span>
        </div>

        <div className="jobs-kpi-item">
          <span className="jobs-kpi-label">AKUMULASI TAGIHAN TERCATAT</span>
          <strong className="jobs-kpi-val text-ember">
            {formatRupiah(metrics.totalAmount)}
          </strong>
          <span className="jobs-kpi-sub">
            Total {metrics.allCount} pengajuan invoice di database
          </span>
        </div>

        <div
          className="jobs-kpi-item"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('bank_account')}
          title="Klik untuk membuka pengaturan rekening bank pencairan"
        >
          <span className="jobs-kpi-label">REKENING PENCAIRAN MITRA</span>
          <strong className="jobs-kpi-val">{profileAccNo}</strong>
          <span className="jobs-kpi-sub">
            {profileBank} • {profileHolder}
          </span>
        </div>
      </div>

      {/* Filter Chips & Search Toolbar */}
      <div className="vendor-card-panel jobs-filter-toolbar-card">
        <div className="vendor-jobs-filter-row">
          <div className="vendor-filter-chips">
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'semua' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('semua')}
            >
              Semua Tagihan ({metrics.allCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'tertunda' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('tertunda')}
            >
              {metrics.pendingCount > 0 && <span className="chip-alert-dot" />}
              Tertunda Verifikasi ({metrics.pendingCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'diproses' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('diproses')}
            >
              Sedang Diproses ({metrics.processingCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterStatus === 'dicairkan' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('dicairkan')}
            >
              Dicairkan / Lunas ({metrics.paidCount})
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
                placeholder="Cari no. invoice, acara, bank..."
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

      {/* High-Density Data Table */}
      <div className="vendor-card-panel jobs-table-card">
        {processedPayouts.length === 0 ? (
          <div className="vendor-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <h3>Tidak ada berkas tagihan ditemukan</h3>
            <p>
              Belum ada data faktur yang sesuai dengan filter atau kata kunci pencarian Anda.
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
            <table className="jobs-data-table">
              <thead>
                <tr>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('invoice_number')}
                    title="Urutkan berdasarkan nomor faktur"
                  >
                    <div className="th-sort-wrapper">
                      <span>NO. INVOICE &amp; PENGAJUAN</span>
                      <span className="th-sort-icon">
                        {sortField === 'invoice_number'
                          ? sortOrder === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('wedding_title')}
                    title="Urutkan berdasarkan nama acara"
                  >
                    <div className="th-sort-wrapper">
                      <span>KETERANGAN ACARA &amp; PEKERJAAN</span>
                      <span className="th-sort-icon">
                        {sortField === 'wedding_title'
                          ? sortOrder === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </div>
                  </th>
                  <th>REKENING TUJUAN</th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('amount')}
                    title="Urutkan berdasarkan nominal tagihan"
                  >
                    <div className="th-sort-wrapper">
                      <span>NOMINAL TAGIHAN</span>
                      <span className="th-sort-icon">
                        {sortField === 'amount'
                          ? sortOrder === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </div>
                  </th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort('submitted_at')}
                    title="Urutkan berdasarkan waktu pengajuan"
                  >
                    <div className="th-sort-wrapper">
                      <span>STATUS PENCAIRAN</span>
                      <span className="th-sort-icon">
                        {sortField === 'submitted_at'
                          ? sortOrder === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="col-actions text-right">AKSI &amp; BERKAS</th>
                </tr>
              </thead>
              <tbody>
                {processedPayouts.map((p) => {
                  const isPending = p.status === 'tertunda'
                  const isProcessing = p.status === 'diproses'
                  const isPaid = p.status === 'dicairkan'
                  const isExpanded = expandedPayoutId === p.id
                  const isEditingNote = editingNoteId === p.id

                  return (
                    <Fragment key={p.id}>
                      <tr
                        className={`jobs-table-row ${
                          isPending ? 'row-pending-highlight' : ''
                        } ${isExpanded ? 'row-expanded-highlight' : ''}`}
                      >
                        <td>
                          <div className="cell-date-box">
                            <strong
                              className="cell-primary-text wedding-link-title"
                              style={{ fontFamily: 'monospace' }}
                              onClick={() => toggleExpand(p.id)}
                            >
                              {p.invoice_number}
                            </strong>
                            <span className="cell-sub-text">
                              Diajukan: {formatShortDateID(p.submitted_at)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="cell-event-box">
                            <span className="cell-category-tag">
                              Kode Job: {p.job_id || 'job-general'}
                            </span>
                            <strong
                              className="cell-primary-text wedding-link-title"
                              onClick={() => toggleExpand(p.id)}
                            >
                              {p.wedding_title}
                            </strong>
                            <span className="cell-sub-text">
                              Pelaksanaan: {formatShortDateID(p.event_date)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="cell-venue-box">
                            <strong className="cell-primary-text">{p.bank_name}</strong>
                            <span className="cell-sub-text">
                              {p.account_number} • {p.account_holder}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="cell-amount-box">
                            <strong className="cell-amount-text">
                              {formatRupiah(p.amount)}
                            </strong>
                            <span className="cell-sub-text">Net Transfer Mitra</span>
                          </div>
                        </td>

                        <td>
                          {isPaid && (
                            <span className="table-status-pill status-pill-accepted">
                              ✓ Dicairkan (Lunas)
                            </span>
                          )}
                          {isProcessing && (
                            <span className="payout-status-chip chip-processing">
                              Sedang Diproses WO
                            </span>
                          )}
                          {isPending && (
                            <span className="table-status-pill status-pill-pending">
                              <span className="pulse-dot" /> Tertunda (Verifikasi)
                            </span>
                          )}
                        </td>

                        <td className="col-actions text-right">
                          <div className="table-action-button-group">
                            <button
                              type="button"
                              className="secondary-surface-btn btn-sm-action"
                              onClick={() => handleDownloadReceipt(p)}
                              title="Unduh bukti kwitansi tagihan format PDF"
                            >
                              Kwitansi PDF ↓
                            </button>

                            <button
                              type="button"
                              className="btn-table-detail"
                              onClick={() => toggleExpand(p.id)}
                            >
                              {isExpanded ? 'Tutup ▲' : 'Rincian ▼'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${p.id}-drawer`} className="jobs-expanded-subrow">
                          <td colSpan={6}>
                            <div className="expanded-detail-drawer">
                              <div className="expanded-grid">
                                <div className="expanded-detail-col">
                                  <h4 className="expanded-heading">
                                    Rincian Pencairan &amp; Rekening Tujuan:
                                  </h4>
                                  <div className="expanded-menu-box">
                                    <p>
                                      <strong>Bank Tujuan:</strong> {p.bank_name} (
                                      {p.account_number}) a.n. {p.account_holder}
                                    </p>
                                    <p style={{ marginTop: '6px' }}>
                                      <strong>Status Saat Ini:</strong>{' '}
                                      {p.status_label || p.status}
                                      {p.disbursed_at
                                        ? ` • Dicairkan pada ${formatShortDateID(p.disbursed_at)}`
                                        : ''}
                                    </p>
                                    <p style={{ marginTop: '6px' }}>
                                      <strong>Berkas Lampiran:</strong>{' '}
                                      <code>{p.invoice_doc_url}</code>
                                    </p>
                                  </div>
                                </div>

                                <div className="expanded-detail-col">
                                  <h4 className="expanded-heading">
                                    Catatan Verifikasi &amp; Keterangan Faktur:
                                  </h4>
                                  <div className="expanded-special-box">
                                    {!isEditingNote ? (
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'flex-start',
                                          gap: '10px',
                                        }}
                                      >
                                        <p className="special-req-text">
                                          {p.notes ||
                                            'Tidak ada catatan khusus pada faktur ini.'}
                                        </p>
                                        <button
                                          type="button"
                                          className="secondary-surface-btn btn-sm-action"
                                          onClick={() => {
                                            setNoteDrafts((prev) => ({
                                              ...prev,
                                              [p.id]: p.notes || '',
                                            }))
                                            setEditingNoteId(p.id)
                                          }}
                                        >
                                          Ubah Catatan
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="drawer-step-input-row">
                                        <input
                                          type="text"
                                          className="drawer-step-input"
                                          value={noteDrafts[p.id] ?? p.notes ?? ''}
                                          onChange={(e) =>
                                            setNoteDrafts((prev) => ({
                                              ...prev,
                                              [p.id]: e.target.value,
                                            }))
                                          }
                                          placeholder="Masukkan catatan tambahan untuk tim keuangan WO..."
                                        />
                                        <button
                                          type="button"
                                          className="btn-table-accept"
                                          disabled={
                                            busyId === `${p.id}_update_catatan`
                                          }
                                          onClick={() =>
                                            handlePayoutAction(
                                              p,
                                              'update_catatan',
                                              noteDrafts[p.id] || ''
                                            )
                                          }
                                        >
                                          Simpan
                                        </button>
                                        <button
                                          type="button"
                                          className="secondary-surface-btn btn-sm-action"
                                          onClick={() => setEditingNoteId(null)}
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="expanded-footer-bar">
                                <div className="expanded-left-meta">
                                  <span>
                                    ID Transaksi: <code>{p.id}</code>
                                  </span>
                                  <span>
                                    No. Faktur: <code>{p.invoice_number}</code>
                                  </span>
                                </div>

                                <div className="expanded-actions">
                                  <button
                                    type="button"
                                    className="secondary-surface-btn btn-sm-action"
                                    onClick={() => handleDownloadReceipt(p)}
                                  >
                                    Unduh Kwitansi Resmi (.pdf)
                                  </button>

                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn-table-reject"
                                        disabled={busyId === `${p.id}_batalkan`}
                                        onClick={() =>
                                          handlePayoutAction(p, 'batalkan')
                                        }
                                      >
                                        Batalkan Pengajuan
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-action-accept"
                                        disabled={busyId === `${p.id}_verifikasi`}
                                        onClick={() =>
                                          handlePayoutAction(p, 'verifikasi')
                                        }
                                      >
                                        Proses Verifikasi WO →
                                      </button>
                                    </>
                                  )}

                                  {isProcessing && (
                                    <button
                                      type="button"
                                      className="btn-action-accept"
                                      disabled={busyId === `${p.id}_cairkan`}
                                      onClick={() =>
                                        handlePayoutAction(p, 'cairkan')
                                      }
                                    >
                                      ✓ Konfirmasi Dana Cair (Lunas)
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
                  Menampilkan <strong>{processedPayouts.length}</strong> dari{' '}
                  <strong>{payouts.length}</strong> faktur tagihan
                </span>
              </div>
              <div className="jobs-footer-right">
                <span className="jobs-footer-hint">
                  Klik baris faktur untuk melihat rincian rekening, mengunduh kwitansi, atau memproses status pencairan
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
