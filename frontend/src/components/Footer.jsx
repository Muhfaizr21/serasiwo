import { WEDDING_GUIDES } from '../data/serasiwoData'

export function Footer({ onOpenGuide }) {
  return (
    <footer className="abyss-footer">
      <div className="container footer-cta-banner">
        <div>
          <h2 className="footer-cta-heading">
            Mulai langkah pertama menuju hari pernikahan yang tenang dan terencana.
          </h2>
          <p className="footer-cta-subcopy">
            Ceritakan impian pernikahan Anda dan biarkan tim SerasiWO menyiapkan kerangka kerja terbaik untuk kedua keluarga.
          </p>
        </div>
        <div className="footer-cta-actions">
          <a href="#konsultasi" className="ember-cta-btn">
            Jadwalkan Konsultasi
          </a>
        </div>
      </div>

      <div className="container footer-layout">
        <div className="footer-brand-block">
          <a href="#top" className="footer-wordmark">
            <span className="brand-ember-dot" aria-hidden="true" />
            <span>SerasiWO</span>
          </a>
          <p className="footer-description">
            Mitra perencana dan penyelenggara pernikahan (Wedding Organizer) yang mengutamakan ketenangan pasangan, keharmonisan keluarga, dan ketepatan eksekusi di hari bahagia.
          </p>
        </div>

        <div className="footer-links-block">
          <div className="footer-column">
            <h3 className="footer-column-heading">Tentang &amp; Layanan</h3>
            <ul className="footer-link-list">
              <li>
                <a href="#tujuan" className="footer-link">
                  Tujuan &amp; Filosofi Kami
                </a>
              </li>
              <li>
                <a href="#layanan" className="footer-link">
                  Layanan Perencanaan &amp; Hari-H
                </a>
              </li>
              <li>
                <a href="#perjalanan" className="footer-link">
                  4 Tahap Persiapan Pernikahan
                </a>
              </li>
              <li>
                <a href="#vendor" className="footer-link">
                  Kurasi &amp; Koordinasi Vendor
                </a>
              </li>
              <li>
                <a href="#konsultasi" className="footer-link">
                  Formulir Konsultasi Acara
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-column-heading">Panduan Calon Pengantin</h3>
            <ul className="footer-link-list">
              {WEDDING_GUIDES.map((guide) => (
                <li key={guide.id}>
                  <button
                    type="button"
                    className="footer-text-button"
                    onClick={() => onOpenGuide(guide)}
                  >
                    {guide.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="container footer-bottom-bar">
        <p className="footer-copyright">
          © 2026 SerasiWO Wedding Organizer. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  )
}
