import { useState } from 'react'
import { WEDDING_GUIDES } from '../data/serasiwoData'

export function WorkspaceSimulatorSection({ onOpenGuide }) {
  const [consultations, setConsultations] = useState([
    {
      id: 'KONSUL-01',
      coupleName: 'Raka & Nabila',
      plannedDate: 'November 2026',
      guestEstimate: '600 Tamu',
      serviceType: 'Perencanaan Pernikahan Penuh (Full Planning)',
      venueNote: 'Resepsi malam di Jakarta Selatan dengan prosesi adat Sunda',
      status: 'Jadwal Diskusi Terkonfirmasi',
    },
  ])
  const [listState, setListState] = useState('ready')
  const [formState, setFormState] = useState({
    coupleName: '',
    contactInfo: '',
    plannedDate: '',
    guestEstimate: '',
    serviceType: 'Perencanaan Pernikahan Penuh (Full Planning)',
    venueNote: '',
  })
  const [formFeedback, setFormFeedback] = useState(null)

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    if (formFeedback) setFormFeedback(null)
  }

  const handleConsultationSubmit = (event) => {
    event.preventDefault()
    if (
      !formState.coupleName.trim() ||
      !formState.contactInfo.trim() ||
      !formState.plannedDate.trim()
    ) {
      setFormFeedback({
        type: 'error',
        text: 'Mohon lengkapi nama pasangan, kontak email atau WhatsApp, serta rencana waktu pernikahan Anda.',
      })
      return
    }

    setListState('loading')
    window.setTimeout(() => {
      const nextItem = {
        id: `KONSUL-0${consultations.length + 1}`,
        coupleName: formState.coupleName.trim(),
        plannedDate: formState.plannedDate.trim(),
        guestEstimate: formState.guestEstimate.trim() || 'Belum ditentukan',
        serviceType: formState.serviceType,
        venueNote:
          formState.venueNote.trim() ||
          'Diskusi awal pemetaan konsep dan estimasi anggaran pernikahan',
        status: 'Menunggu Konfirmasi Konsultan',
      }

      setConsultations((prev) => [nextItem, ...prev])
      setListState('ready')
      setFormState({
        coupleName: '',
        contactInfo: '',
        plannedDate: '',
        guestEstimate: '',
        serviceType: 'Perencanaan Pernikahan Penuh (Full Planning)',
        venueNote: '',
      })
      setFormFeedback({
        type: 'success',
        text: `Permintaan konsultasi untuk pasangan ${nextItem.coupleName} telah berhasil dicatat. Tim perencana SerasiWO akan menghubungi Anda untuk menyepakati jadwal pertemuan.`,
      })
    }, 350)
  }

  return (
    <>
      <section
        id="panduan"
        className="guides-section fog-band"
        aria-labelledby="panduan-heading"
      >
        <div className="container">
          <div className="section-header-centered">
            <span className="feature-card-eyebrow">
              Wawasan &amp; Edukasi Calon Pengantin
            </span>
            <h2 id="panduan-heading" className="section-heading">
              Panduan menyusun rencana pernikahan yang matang sejak langkah pertama.
            </h2>
            <p className="section-subcopy-centered">
              Kumpulan panduan praktis dari pengalaman tim SerasiWO dalam mendampingi pasangan dan keluarga merencanakan hari pernikahan.
            </p>
          </div>

          <div className="guides-grid">
            {WEDDING_GUIDES.map((guide) => (
              <article key={guide.id} className="article-resource-card">
                <div className="article-card-body">
                  <div className="article-meta-row">
                    <span className="feature-card-eyebrow">
                      {guide.category}
                    </span>
                    <span className="article-read-time">{guide.readTime}</span>
                  </div>
                  <h3 className="article-card-title">{guide.title}</h3>
                  <p className="article-card-excerpt">{guide.excerpt}</p>
                </div>

                <div className="article-card-footer">
                  <button
                    type="button"
                    className="secondary-surface-btn"
                    onClick={() => onOpenGuide(guide)}
                  >
                    Baca Panduan Lengkap
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="konsultasi"
        className="workspace-section"
        aria-labelledby="konsultasi-heading"
      >
        <div className="container">
          <div className="consultation-split-layout">
            <div className="consultation-form-col">
              <span className="feature-card-eyebrow">
                Konsultasi Rencana Pernikahan
              </span>
              <h2 id="konsultasi-heading" className="section-heading">
                Ceritakan rencana hari bahagia Anda kepada tim SerasiWO.
              </h2>
              <p className="section-body-copy">
                Sesi konsultasi awal bertujuan untuk mendengarkan gambaran acara yang Anda inginkan, memberikan pandangan awal mengenai alokasi anggaran, serta menjelaskan tahapan pendampingan kami tanpa ikatan komitmen apa pun.
              </p>

              <form
                className="new-event-form consultation-card-form"
                onSubmit={handleConsultationSubmit}
                noValidate
              >
                <div className="new-event-grid">
                  <div className="form-field">
                    <label htmlFor="consult-couple-name">
                      Nama Anda &amp; Pasangan
                    </label>
                    <input
                      id="consult-couple-name"
                      type="text"
                      className="text-input"
                      placeholder="Masukkan nama pasangan"
                      value={formState.coupleName}
                      onChange={(e) =>
                        handleFieldChange('coupleName', e.target.value)
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="consult-contact">
                      Email atau Nomor WhatsApp
                    </label>
                    <input
                      id="consult-contact"
                      type="text"
                      className="text-input"
                      placeholder="Masukkan email atau nomor aktif"
                      value={formState.contactInfo}
                      onChange={(e) =>
                        handleFieldChange('contactInfo', e.target.value)
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="consult-date">
                      Rencana Bulan / Tahun Acara
                    </label>
                    <input
                      id="consult-date"
                      type="text"
                      className="text-input"
                      placeholder="Contoh: Desember 2026"
                      value={formState.plannedDate}
                      onChange={(e) =>
                        handleFieldChange('plannedDate', e.target.value)
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="consult-guests">
                      Perkiraan Jumlah Tamu
                    </label>
                    <input
                      id="consult-guests"
                      type="text"
                      className="text-input"
                      placeholder="Contoh: 300 hingga 500 tamu"
                      value={formState.guestEstimate}
                      onChange={(e) =>
                        handleFieldChange('guestEstimate', e.target.value)
                      }
                    />
                  </div>

                  <div className="form-field form-field-span-2">
                    <label htmlFor="consult-service">
                      Layanan Pendampingan yang Diminati
                    </label>
                    <select
                      id="consult-service"
                      className="select-input"
                      value={formState.serviceType}
                      onChange={(e) =>
                        handleFieldChange('serviceType', e.target.value)
                      }
                    >
                      <option value="Perencanaan Pernikahan Penuh (Full Planning)">
                        Perencanaan Pernikahan Penuh (Full Wedding Planning)
                      </option>
                      <option value="Koordinasi Hari Pernikahan (On-The-Day Management)">
                        Koordinasi Hari Pernikahan (On-The-Day Management)
                      </option>
                      <option value="Pernikahan Intimate & Prosesi Adat Keluarga">
                        Pernikahan Intimate &amp; Prosesi Adat Keluarga
                      </option>
                    </select>
                  </div>

                  <div className="form-field form-field-span-2">
                    <label htmlFor="consult-note">
                      Gambaran Konsep Acara / Kebutuhan Khusus
                    </label>
                    <input
                      id="consult-note"
                      type="text"
                      className="text-input"
                      placeholder="Tuliskan rencana lokasi, adat, atau hal yang ingin didiskusikan"
                      value={formState.venueNote}
                      onChange={(e) =>
                        handleFieldChange('venueNote', e.target.value)
                      }
                    />
                  </div>
                </div>

                {formFeedback && (
                  <p
                    className={
                      formFeedback.type === 'error'
                        ? 'form-feedback form-feedback-error'
                        : 'form-feedback'
                    }
                    role="status"
                  >
                    {formFeedback.text}
                  </p>
                )}

                <div className="new-event-form-actions">
                  <button type="submit" className="ember-cta-btn">
                    Kirim Permintaan Konsultasi
                  </button>
                </div>
              </form>
            </div>

            <div className="consultation-queue-col">
              <div className="queue-panel">
                <div className="queue-panel-header">
                  <span className="status-chip status-chip-ember">
                    RINGKASAN PENGAJUAN SESI INI
                  </span>
                  <h3 className="subsection-heading">
                    Agenda Diskusi Rencana Pernikahan
                  </h3>
                  <p className="section-caption">
                    Setiap pengajuan konsultasi yang Anda kirimkan melalui formulir di samping akan tercatat di bawah ini.
                  </p>
                </div>

                {listState === 'loading' && (
                  <div className="state-box" role="status" aria-live="polite">
                    <h4 className="state-box-title">
                      Menyimpan jadwal konsultasi Anda...
                    </h4>
                    <p className="state-box-desc">
                      Mohon tunggu sebentar sementara sistem mencatat rincian rencana acara Anda.
                    </p>
                  </div>
                )}

                {listState === 'error' && (
                  <div className="state-box" role="alert">
                    <h4 className="state-box-title">
                      Daftar agenda konsultasi belum dapat dimuat
                    </h4>
                    <p className="state-box-desc">
                      Terjadi gangguan tampilan sementara. Tekan tombol di bawah untuk memulihkan daftar agenda.
                    </p>
                    <div className="state-box-actions">
                      <button
                        type="button"
                        className="ember-cta-btn"
                        onClick={() => setListState('ready')}
                      >
                        Tampilkan Kembali Agenda
                      </button>
                    </div>
                  </div>
                )}

                {listState === 'ready' && consultations.length === 0 && (
                  <div className="state-box" role="status">
                    <h4 className="state-box-title">
                      Belum ada pengajuan jadwal konsultasi
                    </h4>
                    <p className="state-box-desc">
                      Isi formulir rencana pernikahan di samping untuk menjadwalkan diskusi awal bersama konsultan SerasiWO.
                    </p>
                  </div>
                )}

                {listState === 'ready' && consultations.length > 0 && (
                  <div className="consultation-items-list">
                    {consultations.map((item) => (
                      <article key={item.id} className="consultation-item-card">
                        <div className="consultation-item-top">
                          <strong>Pasangan {item.coupleName}</strong>
                          <span className="status-chip">{item.status}</span>
                        </div>
                        <p className="consultation-item-meta">
                          Rencana: {item.plannedDate} · Estimasi:{' '}
                          {item.guestEstimate}
                        </p>
                        <p className="consultation-item-service">
                          Layanan: {item.serviceType}
                        </p>
                        <p className="consultation-item-note">
                          Catatan: {item.venueNote}
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                <div className="queue-panel-footer">
                  <button
                    type="button"
                    className="chip-action-btn"
                    onClick={() => {
                      setConsultations([])
                      setListState('ready')
                    }}
                  >
                    Kosongkan Riwayat Sesi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
