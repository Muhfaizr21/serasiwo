import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVendor } from '../context/useVendor'
import {
  VENDOR_OPERATIONAL_MENU,
  VENDOR_PRIMARY_MENU,
  VENDOR_SETTINGS_MENU,
} from '../constants/vendorNavigation'

function SidebarNavIcon({ name }) {
  switch (name) {
    case 'clock':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'file':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    case 'phone':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    case 'shield':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'user':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'card':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      )
    default:
      return null
  }
}

export function VendorSidebar() {
  const navigate = useNavigate()
  const {
    activeTab,
    setActiveTab,
    dashboardData,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useVendor()

  const [isPrimaryGroupOpen, setIsPrimaryGroupOpen] = useState(true)
  const pendingJobsCount = dashboardData?.new_booking_alerts?.length || 0
  const profile = dashboardData?.vendor_profile

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

      <aside className={`smarthr-sidebar ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="smarthr-sidebar-brand-box">
          <Link to="/" className="smarthr-brand-link">
            <span className="smarthr-brand-logo-circle">
              <span className="smarthr-logo-dot" />
            </span>
            <span className="smarthr-brand-name">
              Serasi<span className="brand-accent">WO</span>
            </span>
          </Link>
          <button
            type="button"
            className="smarthr-sidebar-close"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            ✕
          </button>
        </div>

        <div className="smarthr-sidebar-scroll">
          <div className="smarthr-nav-section">
            <div className="smarthr-section-header">
              <span>FITUR UTAMA MITRA</span>
            </div>

            <div className="smarthr-nav-group-parent">
              <button
                type="button"
                className="smarthr-group-title-row"
                onClick={() => setIsPrimaryGroupOpen((prev) => !prev)}
                aria-expanded={isPrimaryGroupOpen}
              >
                <div className="smarthr-group-icon-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Portal Vendor Mitra</span>
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: isPrimaryGroupOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>

              {isPrimaryGroupOpen && (
                <div className="smarthr-sub-menu-list">
                  {VENDOR_PRIMARY_MENU.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`smarthr-sub-item ${activeTab === item.id ? 'active-sub-item' : ''}`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="sub-item-text">{item.label}</span>
                      {item.id === 'jobs' && pendingJobsCount > 0 && (
                        <span className="sub-item-badge badge-alert">{pendingJobsCount} Baru</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="smarthr-nav-section">
            <div className="smarthr-section-header">
              <span>DUKUNGAN OPERASIONAL</span>
            </div>

            {VENDOR_OPERATIONAL_MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`smarthr-single-nav ${activeTab === item.id ? 'active-single-nav' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <div className="single-nav-icon">
                  <SidebarNavIcon name={item.icon} />
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="smarthr-nav-section">
            <div className="smarthr-section-header">
              <span>PENGATURAN MITRA</span>
            </div>

            {VENDOR_SETTINGS_MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`smarthr-single-nav ${activeTab === item.id ? 'active-single-nav' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <div className="single-nav-icon">
                  <SidebarNavIcon name={item.icon} />
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="smarthr-sidebar-footer">
          <div className="smarthr-footer-user-row">
            <div className="smarthr-footer-avatar">
              {(profile?.short_name || profile?.name || 'Mitra Vendor')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join('') || 'MV'}
            </div>
            <div className="smarthr-footer-info">
              <strong className="footer-vendor-name">
                {profile?.short_name || profile?.name || 'Mitra SerasiWO'}
              </strong>
              <span className="footer-vendor-badge">
                {profile?.category || 'Mitra Katering'} • {profile?.rating || '4.9'} ★
              </span>
            </div>
          </div>

          <div className="smarthr-footer-links">
            <Link to="/" className="smarthr-footer-btn">
              Beranda
            </Link>
            <button
              type="button"
              className="smarthr-footer-btn btn-danger"
              onClick={handleLogout}
            >
              Keluar
            </button>
          </div>

          <div className="smarthr-copyright-tag">2026 © SerasiWO Portal Mitra</div>
        </div>
      </aside>
    </>
  )
}
