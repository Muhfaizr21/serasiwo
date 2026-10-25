import { useState, useRef, useEffect } from 'react'
import { useVendor } from '../context/useVendor'
import { RoleSwitcher } from '../../../components/RoleSwitcher'

export function VendorHeader({ theme, onToggleTheme }) {
  const {
    searchQuery,
    setSearchQuery,
    openModal,
    dashboardData,
    setIsMobileSidebarOpen,
    showToast,
  } = useVendor()

  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)
  const quickActionRef = useRef(null)

  const pendingCount = dashboardData?.new_booking_alerts?.length || 2

  // Handle outside click for quick action dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) {
        setIsQuickActionOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className="vendor-topbar smarthr-topbar">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="vendor-topbar-left smarthr-topbar-left">
        <button
          type="button"
          className="vendor-menu-toggle-btn smarthr-menu-toggle-btn"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label="Buka menu navigasi"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="vendor-search-container smarthr-search-container">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari acara, lokasi venue, katering..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="vendor-search-input smarthr-search-input"
          />
          <kbd className="vendor-kbd-pill smarthr-kbd-pill">⌘K</kbd>
        </div>
      </div>

      {/* Right: Consolidated Quick Action, Notifications, Theme, Role, Profile */}
      <div className="vendor-topbar-right smarthr-topbar-right">
        {/* Quick Action Dropdown */}
        <div className="vendor-quick-action-wrapper" ref={quickActionRef}>
          <button
            type="button"
            className="vendor-quick-action-btn"
            onClick={() => setIsQuickActionOpen((prev) => !prev)}
            aria-expanded={isQuickActionOpen}
            aria-haspopup="true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Aksi Cepat</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                transform: isQuickActionOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isQuickActionOpen && (
            <div className="vendor-quick-action-menu" role="menu">
              <div className="quick-action-menu-header">
                <span>AKSI OPERASIONAL MITRA:</span>
              </div>
              <button
                type="button"
                className="quick-action-item"
                onClick={() => {
                  setIsQuickActionOpen(false)
                  openModal('create_payout')
                }}
                role="menuitem"
              >
                <div className="quick-action-icon-circle ember-circle">📄</div>
                <div className="quick-action-info">
                  <strong>Unggah Invoice Payout</strong>
                  <span>Kirim klaim pembayaran ke SerasiWO</span>
                </div>
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => {
                  setIsQuickActionOpen(false)
                  openModal('block_date')
                }}
                role="menuitem"
              >
                <div className="quick-action-icon-circle blue-circle">📅</div>
                <div className="quick-action-info">
                  <strong>Blokir Tanggal Dapur</strong>
                  <span>Tandai jadwal penuh atau libur armada</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="vendor-top-icon-btn smarthr-icon-action-btn"
          onClick={() => showToast(`Terdapat ${pendingCount} pesanan baru yang membutuhkan konfirmasi mitra.`, 'success')}
          title="Notifikasi Booking"
          aria-label="Notifikasi booking"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {pendingCount > 0 && <span className="vendor-badge-dot smarthr-badge-dot">{pendingCount}</span>}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="vendor-top-icon-btn smarthr-icon-action-btn"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
          aria-label="Toggle tema"
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* Role Switcher */}
        <div className="vendor-role-switcher-container">
          <RoleSwitcher currentRoleId="vendor_mitra" />
        </div>

        {/* User Profile */}
        <div className="vendor-profile-chip smarthr-profile-chip">
          <div className="vendor-top-avatar smarthr-top-avatar">
            <span>HK</span>
            <span className="online-indicator" />
          </div>
          <div className="vendor-profile-text smarthr-profile-text">
            <span className="profile-name">Hendra Kusuma</span>
            <span className="profile-role">Mitra Katering</span>
          </div>
        </div>
      </div>
    </header>
  )
}

