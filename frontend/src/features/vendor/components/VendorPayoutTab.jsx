import { useState, useEffect } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatRupiah, formatShortDateID } from '../utils/vendorFormatters'

export function VendorPayoutTab() {
  const { openModal, showToast, searchQuery, refreshTick } = useVendor()
  const [payouts, setPayouts] = useState([])

  useEffect(() => {
    let active = true
    vendorService
      .getPayouts()
      .then((data) => {
        if (active) setPayouts(data)
      })
      .catch(() => {
        if (active) showToast('Gagal memuat riwayat penagihan payout', 'error')
      })
    return () => {
      active = false
    }
  }, [refreshTick, showToast])

  const filteredPayouts = payouts.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      p.invoice_number.toLowerCase().includes(q) ||
      p.wedding_title.toLowerCase().includes(q) ||
      p.bank_name.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    )
  })

  const totalDisbursed = payouts
    .filter((p) => p.status === 'dicairkan')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const totalPending = payouts
    .filter((p) => p.status === 'tertunda' || p.status === 'diproses')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="vendor-page-container vendor-tab-content">
      <div className="vendor-card-panel vendor-payout-header-panel">
        <div className="payout-header-info">
          <div>
            <h2 className="vendor-panel-title">Penagihan Vendor &amp; Payout</h2>
            <p className="vendor-panel-subtitle">
              Akses Create &amp; Read: Unggah invoice atau struk tagihan layanan dan pantau status pencairan oleh SerasiWO.
            </p>
          </div>
          <button
            type="button"
            className="btn-ember-primary"
            onClick={() => openModal('create_payout')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Unggah Invoice Tagihan</span>
          </button>
        </div>

        <div className="payout-summary-cards">
          <div className="payout-sum-card">
            <span className="payout-sum-label">Total Dana Dicairkan (Lunas)</span>
            <strong className="payout-sum-val payout-val-green">
              {formatRupiah(totalDisbursed)}
            </strong>
            <span className="payout-sum-note">Ditransfer ke rekening BCA mitra</span>
          </div>

          <div className="payout-sum-card">
            <span className="payout-sum-label">Tagihan Tertunda / Dalam Proses</span>
            <strong className="payout-sum-val payout-val-amber">
              {formatRupiah(totalPending)}
            </strong>
            <span className="payout-sum-note">
              Menunggu verifikasi faktur &amp; batch pembayaran WO
            </span>
          </div>

          <div className="payout-sum-card">
            <span className="payout-sum-label">Rekening Pembayaran Mitra</span>
            <strong className="payout-sum-val">BCA 521-0988-123</strong>
            <span className="payout-sum-note">
              a.n. CV Berkah Rasa Nusantara (Terverifikasi)
            </span>
          </div>
        </div>
      </div>

      <div className="vendor-card-panel vendor-table-panel">
        <div className="vendor-panel-header">
          <div>
            <h3 className="vendor-panel-title">Riwayat Tagihan &amp; Status Pencairan</h3>
            <p className="vendor-panel-subtitle">
              Daftar berkas tagihan yang telah diserahkan ke bagian keuangan WO.
            </p>
          </div>
        </div>

        <div className="vendor-table-wrapper">
          <table className="vendor-data-table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Keterangan Acara</th>
                <th>Nominal Tagihan</th>
                <th>Rekening Tujuan</th>
                <th>Tanggal Pengajuan</th>
                <th>Status Pembayaran</th>
                <th>Aksi / Berkas</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-td">
                    Tidak ada data tagihan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => {
                  const isPending = p.status === 'tertunda'
                  const isProcessing = p.status === 'diproses'
                  const isPaid = p.status === 'dicairkan'

                  return (
                    <tr key={p.id}>
                      <td className="table-invoice-no">
                        <strong>{p.invoice_number}</strong>
                      </td>
                      <td>
                        <div className="table-wedding-title">{p.wedding_title}</div>
                        <span className="table-sub-date">{p.event_date}</span>
                      </td>
                      <td className="table-amount">
                        <strong>{formatRupiah(p.amount)}</strong>
                      </td>
                      <td>
                        <div>{p.bank_name}</div>
                        <span className="table-sub-acc">{p.account_number}</span>
                      </td>
                      <td>{formatShortDateID(p.submitted_at)}</td>
                      <td>
                        {isPaid && (
                          <span className="payout-status-chip chip-paid">
                            ✓ Dicairkan (Lunas)
                          </span>
                        )}
                        {isProcessing && (
                          <span className="payout-status-chip chip-processing">
                            Sedang Diproses WO
                          </span>
                        )}
                        {isPending && (
                          <span className="payout-status-chip chip-pending">
                            Tertunda (Verifikasi)
                          </span>
                        )}
                      </td>
                      <td>
                        <a
                          href={p.invoice_doc_url}
                          target="_blank"
                          rel="noreferrer"
                          className="vendor-table-doc-link"
                          onClick={(e) => {
                            e.preventDefault()
                            showToast(`Membuka dokumen ${p.invoice_number}...`, 'success')
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>Lihat Invoice</span>
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
