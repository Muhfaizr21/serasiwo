import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function Navbar({ theme, onToggleTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="site-header">
      <nav className="primary-nav" aria-label="Navigasi utama">
        <div className="container nav-inner">
          <Link to="/" className="brand-wordmark" aria-label="Beranda SerasiWO">
            <span className="brand-ember-dot" aria-hidden="true" />
            <span>SerasiWO</span>
          </Link>

          <ul className="nav-links">
            <li>
              <a href="#tujuan" className="nav-link">
                Tujuan Kami
              </a>
            </li>
            <li>
              <a href="#layanan" className="nav-link">
                Layanan
              </a>
            </li>
            <li>
              <a href="#perjalanan" className="nav-link">
                Tahapan Persiapan
              </a>
            </li>
            <li>
              <a href="#vendor" className="nav-link">
                Kurasi Vendor
              </a>
            </li>
            <li>
              <a href="#panduan" className="nav-link">
                Panduan Pengantin
              </a>
            </li>
          </ul>

          <div className="nav-actions">
            <button
              type="button"
              className="nav-text-link"
              onClick={onToggleTheme}
              aria-pressed={theme === 'dark'}
              aria-label={
                theme === 'light'
                  ? 'Aktifkan tampilan mode gelap'
                  : 'Aktifkan tampilan mode terang'
              }
            >
              {theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
            </button>

            <Link to="/login" className="secondary-surface-btn nav-login-btn">
              Masuk Portal
            </Link>

            <a href="#konsultasi" className="ember-cta-btn">
              Konsultasi Pernikahan
            </a>
          </div>

          <div className="mobile-nav-controls">
            <button
              type="button"
              className="nav-text-link"
              onClick={onToggleTheme}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'light' ? 'Gelap' : 'Terang'}
            </button>
            <button
              type="button"
              className="mobile-menu-btn"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? 'Tutup' : 'Menu'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            className="mobile-drawer"
            role="dialog"
            aria-label="Menu navigasi seluler"
          >
            <ul className="mobile-nav-list">
              <li>
                <a href="#tujuan" className="mobile-nav-link" onClick={closeMobileMenu}>
                  Tujuan Kami
                </a>
              </li>
              <li>
                <a href="#layanan" className="mobile-nav-link" onClick={closeMobileMenu}>
                  Layanan Pernikahan
                </a>
              </li>
              <li>
                <a href="#perjalanan" className="mobile-nav-link" onClick={closeMobileMenu}>
                  Tahapan Persiapan
                </a>
              </li>
              <li>
                <a href="#vendor" className="mobile-nav-link" onClick={closeMobileMenu}>
                  Kurasi Vendor
                </a>
              </li>
              <li>
                <a href="#panduan" className="mobile-nav-link" onClick={closeMobileMenu}>
                  Panduan Pengantin
                </a>
              </li>
              <li>
                <Link to="/login" className="mobile-nav-link" onClick={closeMobileMenu}>
                  Masuk Portal (Login)
                </Link>
              </li>
            </ul>
            <div className="mobile-drawer-actions">
              <Link
                to="/login"
                className="secondary-surface-btn full-width-btn"
                onClick={closeMobileMenu}
              >
                Masuk ke Portal Operasional
              </Link>
              <a
                href="#konsultasi"
                className="ember-cta-btn full-width-btn"
                onClick={closeMobileMenu}
              >
                Konsultasi Pernikahan
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
