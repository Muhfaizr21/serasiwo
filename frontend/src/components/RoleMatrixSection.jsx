import { useState } from 'react'
import { PURPOSE_PILLARS, WEDDING_SERVICES } from '../data/serasiwoData'

export function RoleMatrixSection() {
  const [selectedServiceId, setSelectedServiceId] = useState(
    WEDDING_SERVICES[0].id
  )

  const activeService =
    WEDDING_SERVICES.find((item) => item.id === selectedServiceId) ||
    WEDDING_SERVICES[0]

  return (
    <>
      <section
        id="tujuan"
        className="pillars-section fog-band"
        aria-labelledby="tujuan-heading"
      >
        <div className="container">
          <div className="purpose-intro-grid">
            <div>
              <span className="feature-card-eyebrow">
                Tujuan &amp; Filosofi SerasiWO
              </span>
              <h2 id="tujuan-heading" className="section-heading">
                Mengambil alih kerumitan teknis agar Anda dan keluarga fokus pada kebahagiaan acara.
              </h2>
            </div>
            <div className="purpose-editorial-copy">
              <p className="section-body-copy">
                Merencanakan pernikahan melibatkan puluhan keputusan besar sekaligus ratusan detail kecil yang saling berkaitan. Tanpa pendampingan yang terstruktur, persiapan pernikahan kerap menguras waktu kerja pasangan dan menimbulkan kelelahan bagi orang tua di hari acara.
              </p>
              <p className="section-body-copy">
                SerasiWO didirikan dengan satu tujuan utama: menghadirkan sistem kerja Wedding Organizer yang tertib, transparan dalam pengelolaan anggaran, serta hangat dalam melayani keluarga besar.
              </p>
            </div>
          </div>

          <div className="purpose-cards-layout">
            <article className="feature-category-card purpose-card-featured">
              <div className="feature-card-copy">
                <span className="feature-card-eyebrow">
                  01 · {PURPOSE_PILLARS[0].label}
                </span>
                <h3 className="feature-card-title">
                  {PURPOSE_PILLARS[0].title}
                </h3>
                <p className="feature-card-body">
                  {PURPOSE_PILLARS[0].description}
                </p>
              </div>
              <div className="pillar-mockup">
                <p className="purpose-highlight-note">
                  <strong>Komitmen Lapangan:</strong> {PURPOSE_PILLARS[0].detailPoint}
                </p>
              </div>
            </article>

            <div className="purpose-secondary-stack">
              {PURPOSE_PILLARS.slice(1).map((item, idx) => (
                <article key={item.id} className="feature-category-card">
                  <div className="feature-card-copy">
                    <span className="feature-card-eyebrow">
                      0{idx + 2} · {item.label}
                    </span>
                    <h3 className="feature-card-title">{item.title}</h3>
                    <p className="feature-card-body">{item.description}</p>
                  </div>
                  <div className="pillar-mockup">
                    <p className="purpose-highlight-note">
                      <strong>Komitmen Lapangan:</strong> {item.detailPoint}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="layanan"
        className="workspaces-section"
        aria-labelledby="layanan-heading"
      >
        <div className="container">
          <div className="workspaces-header">
            <span className="feature-card-eyebrow">Layanan Pernikahan</span>
            <h2 id="layanan-heading" className="section-heading">
              Pendampingan yang menyesuaikan tahap persiapan Anda saat ini.
            </h2>
            <p className="section-body-copy">
              Apakah Anda baru saja menentukan tanggal lamaran atau sudah memesan gedung resepsi sendiri, pilih cakupan layanan SerasiWO yang paling sesuai dengan kebutuhan Anda dan pasangan.
            </p>
          </div>

          <div
            className="workspace-tabs-bar"
            role="tablist"
            aria-label="Pilih jenis layanan pernikahan SerasiWO"
          >
            {WEDDING_SERVICES.map((service) => {
              const isSelected = service.id === activeService.id
              return (
                <button
                  key={service.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={
                    isSelected
                      ? 'workspace-tab-item workspace-tab-item-active'
                      : 'workspace-tab-item'
                  }
                  onClick={() => setSelectedServiceId(service.id)}
                >
                  <span className="workspace-tab-name">{service.title}</span>
                  <span className="workspace-tab-role">{service.category}</span>
                </button>
              )
            })}
          </div>

          <div className="workspace-showcase-grid">
            <div className="workspace-narrative-col">
              <span className="workspace-role-pill">
                {activeService.category}
              </span>
              <h3 className="workspace-Async-headline">
                {activeService.title}
              </h3>
              <p className="workspace-narrative-body">
                {activeService.description}
              </p>

              <div className="service-ideal-box">
                <strong>Dirancang Khusus Bagi:</strong>
                <p>{activeService.idealFor}</p>
              </div>

              <div className="workspace-Action-row">
                <a href="#konsultasi" className="ember-cta-btn">
                  Diskusikan Layanan Ini
                </a>
              </div>
            </div>

            <div className="workspace-highlights-col">
              <h4 className="deliverables-list-heading">
                Cakupan Kerja &amp; Pendampingan yang Anda Dapatkan:
              </h4>
              {activeService.deliverables.map((item, idx) => (
                <article key={item} className="workspace-highlight-card">
                  <span className="deliverable-number">Lingkup Kerja 0{idx + 1}</span>
                  <p className="workspace-highlight-title">{item}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
