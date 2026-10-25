import { Link, useNavigate } from 'react-router-dom'
import { useSuperAdmin } from '../context/SuperAdminContext'

export function SuperAdminSidebar() {
  const navigate = useNavigate()
  const {
    activeTab,
    setActiveTab,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    events,
  } = useSuperAdmin()

  const warningCount = events.filter((e) => e.collision_warning).length

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    setIsMobileSidebarOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('serasiwo_user')
    navigate('/login')
  }

  return (
    <>
      {isMobileSidebarOpen && (
        <div
          className="vendor-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`smarthr-sidebar superadmin-sidebar-theme ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="smarthr-sidebar-brand-box">
          <Link to="/" className="smarthr-brand-link">
            <span className="smarthr-brand-logo-circle">
              <span className="smarthr-logo-dot" />
            </span>
            <span className="smarthr-brand-name">
              Serasi<span className="brand-accent">WO</span>
            </span>
          </Link>
          <span className="superadmin-tier-tag">Super Admin</span>
          <button
            type="button"
            className="smarthr-sidebar-close"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Tutup navigasi"
          >
            ✕
          </button>
        </div>

        <div className="smarthr-sidebar-scroll">
          <div className="smarthr-nav-section">
            <div className="smarthr-section-header">
              <span>MANAJEMEN UTAMA WO</span>
            </div>

            <div className="smarthr-sub-menu-list">
              <button
                type="button"
                className={`smarthr-sub-item ${activeTab === 'overview' ? 'active-sub-item' : ''}`}
                onClick={() => handleTabClick('overview')}
              >
                <div className="superadmin-nav-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span className="sub-item-text">Dashboard Eksklusif</span>
                </div>
                <span className="sub-item-badge badge-readonly">Read-Only</span>
              </button>

              <button
                type="button"
                className={`smarthr-sub-item ${activeTab === 'calendar' ? 'active-sub-item' : ''}`}
                onClick={() => handleTabClick('calendar')}
              >
                <div className="superadmin-nav-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="sub-item-text">Kalender Master</span>
                </div>
                {warningCount > 0 ? (
                  <span className="sub-item-badge badge-alert">{warningCount} Override</span>
                ) : (
                  <span className="sub-item-badge badge-fullcontrol">Override</span>
                )}
              </button>

              <button
                type="button"
                className={`smarthr-sub-item ${activeTab === 'clients' ? 'active-sub-item' : ''}`}
                onClick={() => handleTabClick('clients')}
              >
                <div className="superadmin-nav-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="sub-item-text">Manajemen Klien</span>
                </div>
                <span className="sub-item-badge badge-fullcontrol">Full CRUD</span>
              </button>

              <button
                type="button"
                className={`smarthr-sub-item ${activeTab === 'vendors' ? 'active-sub-item' : ''}`}
                onClick={() => handleTabClick('vendors')}
              >
                <div className="superadmin-nav-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="sub-item-text">Manajemen Vendor</span>
                </div>
                <span className="sub-item-badge badge-fullcontrol">Blacklist</span>
              </button>

              <button
                type="button"
                className={`smarthr-sub-item ${activeTab === 'finance' ? 'active-sub-item' : ''}`}
                onClick={() => handleTabClick('finance')}
              >
                <div className="superadmin-nav-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span className="sub-item-text">Keuangan & Laba Rugi</span>
                </div>
                <span className="sub-item-badge badge-export">Ekspor P&L</span>
              </button>

              <button
                type="button"
                className={`smarthr-sub-item ${activeTab === 'settings' ? 'active-sub-item' : ''}`}
                onClick={() => handleTabClick('settings')}
              >
                <div className="superadmin-nav-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span className="sub-item-text">Pengaturan & Audit</span>
                </div>
                <span className="sub-item-badge badge-fullcontrol">Audit Log</span>
              </button>
            </div>
          </div>
        </div>

        <div className="smarthr-sidebar-footer">
          <div className="smarthr-footer-user-row">
            <div className="smarthr-footer-avatar superadmin-avatar-mini">BA</div>
            <div className="smarthr-footer-info">
              <strong className="footer-vendor-name">Baskoro Adiwijaya</strong>
              <span className="footer-vendor-badge">Owner / Super Admin</span>
            </div>
          </div>

          <div className="smarthr-footer-links">
            <Link to="/" className="smarthr-footer-btn">Beranda</Link>
            <button type="button" className="smarthr-footer-btn btn-danger" onClick={handleLogout}>
              Keluar
            </button>
          </div>

          <div className="smarthr-copyright-tag">
            2026 © SerasiWO Super Admin
          </div>
        </div>
      </aside>
    </>
  )
}
