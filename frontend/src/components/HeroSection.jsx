import { useState } from 'react'
import { WEDDING_SERVICES } from '../data/serasiwoData'

export function HeroSection() {
  const [emailInput, setEmailInput] = useState('')
  const [formFeedback, setFormFeedback] = useState(null)
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0)

  const currentService =
    WEDDING_SERVICES[selectedServiceIndex] || WEDDING_SERVICES[0]

  const handleRequestSubmit = (event) => {
    event.preventDefault()
    const trimmed = emailInput.trim()

    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setFormFeedback({
        status: 'error',
        message: 'Masukkan alamat email aktif Anda (contoh: pasangan@email.com).',
      })
      return
    }

    setFormFeedback({
      status: 'success',
      message: `Terima kasih! Buku pengantar perencanaan pernikahan SerasiWO akan dikirimkan ke ${trimmed}. Anda juga dapat mengisi detail rencana acara pada formulir konsultasi di bawah.`,
    })
    setEmailInput('')
  }

  return (
    <section id="top" className="hero-section" aria-labelledby="hero-heading">
      <div className="container hero-split">
        <div className="hero-copy-col">
          <h1 id="hero-heading" className="hero-display-title">
            Wujudkan hari pernikahan yang tenang, terencana rapi, dan berkesan bagi kedua keluarga.
          </h1>

          <p className="hero-subtext">
            SerasiWO hadir sebagai mitra perencana dan pelaksana pernikahan yang mengurus setiap detail dari awal hingga akhir: mulai dari perumusan konsep dan anggaran, pemilihan gedung serta vendor terpercaya, hingga pengawalan penuh di hari bahagia Anda.
          </p>

          <form
            className="hero-capture-form"
            onSubmit={handleRequestSubmit}
            noValidate
            aria-label="Formulir permintaan buku panduan persiapan pernikahan"
          >
            <div className="email-capture-pair">
              <label htmlFor="hero-email-input" className="sr-only">
                Alamat email Anda
              </label>
              <input
                id="hero-email-input"
                type="email"
                className="hero-email-input"
                placeholder="Masukkan alamat email Anda"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
              <button type="submit" className="ember-cta-btn hero-submit-btn">
                Mulai Merencanakan
              </button>
            </div>

            {formFeedback && (
              <p
                className={
                  formFeedback.status === 'error'
                    ? 'form-feedback form-feedback-error'
                    : 'form-feedback form-feedback-success'
                }
                role="status"
              >
                {formFeedback.message}
              </p>
            )}
          </form>

          <div className="hero-ghost-row">
            <a href="#tujuan" className="ghost-link-btn">
              <span className="ember-play-circle" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 1.8L8.2 5L2.5 8.2V1.8Z" fill="currentColor" />
                </svg>
              </span>
              <span>Pelajari filosofi dan tujuan pendampingan SerasiWO</span>
            </a>
          </div>
        </div>

        <div className="hero-visual-col">
          <div className="product-stage" aria-label="Ringkasan layanan pendampingan pernikahan SerasiWO">
            <div className="stage-topbar">
              <div className="stage-window-title">
                <span className="stage-brand-dot" aria-hidden="true" />
                <span>Pendekatan Perencanaan SerasiWO</span>
              </div>

              <div
                className="stage-role-tabs"
                role="tablist"
                aria-label="Pilih cakupan layanan pernikahan"
              >
                {WEDDING_SERVICES.map((service, idx) => {
                  const active = idx === selectedServiceIndex
                  return (
                    <button
                      key={service.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={
                        active
                          ? 'stage-role-tab stage-role-tab-active'
                          : 'stage-role-tab'
                      }
                      onClick={() => setSelectedServiceIndex(idx)}
                    >
                      {idx === 0
                        ? 'Full Planning'
                        : idx === 1
                        ? 'Koordinasi Hari-H'
                        : 'Adat & Intimate'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="stage-main-card">
              <div className="stage-card-header">
                <div>
                  <span className="stage-badge">{currentService.category}</span>
                  <h2 className="stage-event-name">{currentService.title}</h2>
                  <p className="stage-event-date">{currentService.summary}</p>
                </div>
              </div>

              <div className="stage-vendor-tracker">
                <div className="stage-tracker-header">
                  <span>Fokus Pendampingan Tim Kami</span>
                  <span>Terstruktur &amp; Terukur</span>
                </div>
                <div className="stage-tracker-rows">
                  {currentService.deliverables.map((item, index) => (
                    <div key={item} className="stage-tracker-row">
                      <div>
                        <strong>0{index + 1} · {item}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="stage-footnote">
                <strong>Cocok Untuk:</strong> {currentService.idealFor}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
