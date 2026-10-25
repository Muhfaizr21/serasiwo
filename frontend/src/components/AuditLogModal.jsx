import { useEffect } from 'react'

export function AuditLogModal({ guide, onClose }) {
  useEffect(() => {
    if (!guide) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [guide, onClose])

  if (!guide) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <span className="status-chip status-chip-ember">
              {guide.category} · {guide.readTime}
            </span>
            <h2 id="guide-modal-title" className="modal-title">
              {guide.title}
            </h2>
          </div>
          <button
            type="button"
            className="secondary-surface-btn"
            onClick={onClose}
            aria-label="Tutup panduan"
          >
            Tutup (Esc)
          </button>
        </div>

        <div className="guide-modal-paragraphs">
          {guide.fullContent.map((paragraph) => (
            <p key={paragraph} className="guide-modal-text">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="modal-footer">
          <a
            href="#konsultasi"
            className="ember-cta-btn"
            onClick={onClose}
          >
            Diskusikan dengan Tim SerasiWO
          </a>
        </div>
      </div>
    </div>
  )
}
