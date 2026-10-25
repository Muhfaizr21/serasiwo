import { useState, useEffect, useCallback } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import { formatLongDateID } from '../utils/vendorFormatters'

export function VendorReadinessTab() {
  const { showToast, reloadDashboard, refreshTick } = useVendor()
  const [readinessList, setReadinessList] = useState([])
  const [editingNotes, setEditingNotes] = useState({})

  const loadReadiness = useCallback(async () => {
    try {
      const data = await vendorService.getReadiness()
      setReadinessList(data)
    } catch {
      showToast('Gagal memuat status kesiapan produksi', 'error')
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    vendorService
      .getReadiness()
      .then((data) => {
        if (active) setReadinessList(data)
      })
      .catch(() => {
        if (active) showToast('Gagal memuat status kesiapan produksi', 'error')
      })
    return () => {
      active = false
    }
  }, [refreshTick, showToast])

  const handleToggleStep = async (jobId, stepId, currentCompleted) => {
    const nextCompleted = !currentCompleted
    const customNote = editingNotes[`${jobId}_${stepId}`] || ''
    try {
      await vendorService.updateReadinessStep(jobId, stepId, nextCompleted, customNote)
      showToast(
        nextCompleted
          ? 'Tahapan kesiapan berhasil ditandai selesai!'
          : 'Tahapan kesiapan diubah kembali ke belum selesai.',
        'success'
      )
      await loadReadiness()
      await reloadDashboard()
    } catch {
      showToast('Gagal memperbarui status kesiapan', 'error')
    }
  }

  return (
    <div className="vendor-page-container vendor-tab-content">
      <div className="vendor-card-panel vendor-readiness-intro">
        <div>
          <h2 className="vendor-panel-title">Update Status Kesiapan Operasional</h2>
          <p className="vendor-panel-subtitle">
            Akses Update: Centang tahapan progres produksi Anda sendiri dari Bahan Mentah Siap menuju Loading hingga Selesai.
          </p>
        </div>
        <span className="vendor-badge-update">Hak Akses: Update Progres</span>
      </div>

      <div className="vendor-readiness-stack">
        {readinessList.length === 0 ? (
          <div className="vendor-card-panel vendor-empty-state">
            <p>Belum ada pekerjaan aktif yang memerlukan pembaruan status kesiapan.</p>
          </div>
        ) : (
          readinessList.map((jobR) => (
            <div key={jobR.job_id} className="vendor-card-panel vendor-readiness-card">
              <div className="readiness-card-header">
                <div>
                  <h3 className="readiness-wedding-title">{jobR.wedding_title}</h3>
                  <div className="readiness-meta-line">
                    <span>{formatLongDateID(jobR.event_date)}</span>
                    <span className="readiness-meta-sep">•</span>
                    <span>{jobR.time_slot}</span>
                    <span className="readiness-meta-sep">•</span>
                    <span>{jobR.venue}</span>
                    <span className="readiness-meta-sep">•</span>
                    <strong>{jobR.portions.toLocaleString('id-ID')} Porsi</strong>
                  </div>
                </div>

                <div className="readiness-status-badge-group">
                  <span className="readiness-current-label">{jobR.current_status}</span>
                  <span className="readiness-percent-chip">
                    {jobR.progress_percent}% Selesai
                  </span>
                </div>
              </div>

              <div className="readiness-progress-track">
                <div
                  className="readiness-progress-fill"
                  style={{ width: `${jobR.progress_percent}%` }}
                />
              </div>

              <div className="readiness-steps-list">
                {jobR.steps.map((step, idx) => {
                  const stepKey = `${jobR.job_id}_${step.step_id}`

                  return (
                    <div
                      key={step.step_id}
                      className={`readiness-step-item ${
                        step.completed ? 'step-item-completed' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={`readiness-step-checkbox ${
                          step.completed ? 'checked' : ''
                        }`}
                        onClick={() =>
                          handleToggleStep(jobR.job_id, step.step_id, step.completed)
                        }
                        aria-label={
                          step.completed
                            ? 'Tandai tahapan belum selesai'
                            : 'Tandai tahapan selesai'
                        }
                      >
                        <div className="step-checkbox-inner">
                          {step.completed ? '✓' : ''}
                        </div>
                      </button>

                      <div className="step-content-col">
                        <div className="step-label-row">
                          <span className="step-order-pill">Langkah {idx + 1}</span>
                          <span className="step-main-label">{step.title}</span>
                          {step.completed && (
                            <span className="step-timestamp">
                              Selesai pada{' '}
                              {step.completed_at
                                ? new Date(step.completed_at).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }) + ' WIB'
                                : 'Hari ini'}
                            </span>
                          )}
                        </div>

                        <p className="readiness-step-desc">{step.description}</p>

                        {step.proof_note && (
                          <div className="readiness-proof-box">
                            <strong>Catatan Lapangan:</strong> <span>{step.proof_note}</span>
                          </div>
                        )}

                        {!step.completed && (
                          <div className="readiness-step-note-input-row">
                            <input
                              type="text"
                              placeholder="Tambah catatan bukti (misal: armada berangkat 06:30)..."
                              value={editingNotes[stepKey] || ''}
                              onChange={(e) =>
                                setEditingNotes((prev) => ({
                                  ...prev,
                                  [stepKey]: e.target.value,
                                }))
                              }
                              className="step-notes-input"
                            />
                            <button
                              type="button"
                              className="btn-action-accept"
                              onClick={() =>
                                handleToggleStep(jobR.job_id, step.step_id, false)
                              }
                            >
                              Tandai Selesai
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
