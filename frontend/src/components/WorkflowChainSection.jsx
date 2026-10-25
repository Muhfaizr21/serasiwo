import { useState } from 'react'
import { PREPARATION_JOURNEY, VENDOR_ECOSYSTEM } from '../data/serasiwoData'

const VENDOR_CATEGORIES = [
  'Semua Kategori',
  'Katering',
  'Dekorasi & Tata Ruang',
  'Busana & Rias Pengantin',
  'Dokumentasi & Hiburan',
]

export function WorkflowChainSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori')
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogState, setCatalogState] = useState('ready')

  const filteredVendors = VENDOR_ECOSYSTEM.filter((item) => {
    const matchCategory =
      selectedCategory === 'Semua Kategori' ||
      item.category === selectedCategory
    const q = searchQuery.trim().toLowerCase()
    const matchQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    return matchCategory && matchQuery
  })

  const handleCategoryChange = (category) => {
    setCatalogState('loading')
    setSelectedCategory(category)
    window.setTimeout(() => {
      setCatalogState('ready')
    }, 220)
  }

  const handleResetFilter = () => {
    setSelectedCategory('Semua Kategori')
    setSearchQuery('')
    setCatalogState('ready')
  }

  return (
    <>
      <section
        id="perjalanan"
        className="workflow-section fog-band"
        aria-labelledby="perjalanan-heading"
      >
        <div className="container">
          <div className="workflow-header-split">
            <div>
              <span className="feature-card-eyebrow">
                Tahapan Persiapan Pernikahan
              </span>
              <h2 id="perjalanan-heading" className="section-heading">
                Perjalanan persiapan yang terarah dari bulan pertama hingga hari bahagia.
              </h2>
            </div>
            <div>
              <p className="section-body-copy">
                Kami membagi persiapan pernikahan ke dalam empat tahapan yang tenang dan terukur, sehingga Anda selalu mengetahui apa yang perlu diputuskan sekarang dan apa yang dapat diselesaikan nanti.
              </p>
            </div>
          </div>

          <div className="timeline-accordion">
            {PREPARATION_JOURNEY.map((item, idx) => {
              const isOpen = activeIndex === idx
              return (
                <div
                  key={item.phase}
                  className={
                    isOpen
                      ? 'timeline-card timeline-card-active'
                      : 'timeline-card'
                  }
                >
                  <button
                    type="button"
                    className="timeline-card-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setActiveIndex(idx)}
                  >
                    <span className="timeline-phase-tag">{item.phase}</span>
                    <span className="timeline-card-title">{item.title}</span>
                    <span className="timeline-lead-actor">{item.timeframe}</span>
                  </button>

                  {isOpen && (
                    <div className="timeline-card-content">
                      <p className="timeline-summary">{item.narrative}</p>
                      <div className="journey-outputs-box">
                        <span className="journey-outputs-title">
                          Hasil Kerja pada Tahap Ini:
                        </span>
                        <ul className="journey-outputs-list">
                          {item.keyOutputs.map((out) => (
                            <li key={out}>{out}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section
        id="vendor"
        className="vendor-curation-section"
        aria-labelledby="vendor-heading"
      >
        <div className="container">
          <div className="workflow-header-split">
            <div>
              <span className="feature-card-eyebrow">
                Kurasi &amp; Koordinasi Vendor
              </span>
              <h2 id="vendor-heading" className="section-heading">
                Menyatukan puluhan pekerja kreatif dan vendor ke dalam satu irama acara.
              </h2>
            </div>
            <div>
              <p className="section-body-copy">
                Keberhasilan resepsi bergantung pada kerja sama yang rapi antara katering, dekorator, perias pengantin, fotografer, dan pengelola gedung. Telusuri bagaimana SerasiWO mengelola setiap bidang vendor di bawah ini.
              </p>
            </div>
          </div>

          <div className="vendor-filter-Controls">
            <div
              className="vendor-category-pills"
              role="group"
              aria-label="Saring berdasarkan bidang vendor pernikahan"
            >
              {VENDOR_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    className={
                      active
                        ? 'vendor-pill-btn vendor-pill-btn-active'
                        : 'vendor-pill-btn'
                    }
                    aria-pressed={active}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            <div className="vendor-search-box">
              <label htmlFor="vendor-search-input" className="sr-only">
                Cari topik koordinasi vendor
              </label>
              <input
                id="vendor-search-input"
                type="search"
                className="text-input"
                placeholder="Cari kata kunci (misal: porsi, rias, pelaminan)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {catalogState === 'loading' && (
            <div className="state-box" role="status" aria-live="polite">
              <h3 className="state-box-title">
                Memuat rincian kurasi mitra vendor...
              </h3>
              <p className="state-box-desc">
                Menyusun informasi standar kerja dan pengawasan lapangan untuk kategori yang dipilih.
              </p>
            </div>
          )}

          {catalogState === 'error' && (
            <div className="state-box" role="alert">
              <h3 className="state-box-title">
                Katalog kurasi vendor belum dapat ditampilkan
              </h3>
              <p className="state-box-desc">
                Terjadi kendala saat memuat data kategori vendor. Tekan tombol di bawah untuk menampilkan kembali seluruh kategori.
              </p>
              <div className="state-box-actions">
                <button
                  type="button"
                  className="ember-cta-btn"
                  onClick={handleResetFilter}
                >
                  Muat Ulang Katalog Vendor
                </button>
              </div>
            </div>
          )}

          {catalogState === 'ready' && filteredVendors.length === 0 && (
            <div className="state-box" role="status">
              <h3 className="state-box-title">
                Tidak ditemukan bidang vendor dengan kata kunci &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="state-box-desc">
                Coba gunakan kata kunci lain seperti katering, dekorasi, rias, atau dokumentasi, atau tampilkan kembali seluruh kategori vendor.
              </p>
              <div className="state-box-actions">
                <button
                  type="button"
                  className="ember-cta-btn"
                  onClick={handleResetFilter}
                >
                  Tampilkan Semua Bidang Vendor
                </button>
              </div>
            </div>
          )}

          {catalogState === 'ready' && filteredVendors.length > 0 && (
            <div className="vendor-cards-grid">
              {filteredVendors.map((vendor) => (
                <article key={vendor.id} className="vendor-curation-card">
                  <div className="vendor-card-top">
                    <span className="feature-card-eyebrow">
                      {vendor.category}
                    </span>
                    <h3 className="feature-card-title">{vendor.title}</h3>
                    <p className="vendor-focus-line">
                      <strong>Fokus Utama:</strong> {vendor.focus}
                    </p>
                    <p className="feature-card-body">{vendor.details}</p>
                  </div>
                  <div className="vendor-stages-footer">
                    <span>Alur Pengawasan: {vendor.stages}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
