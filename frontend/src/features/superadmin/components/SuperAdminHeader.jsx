import { useSuperAdmin } from '../context/SuperAdminContext'
import { RoleSwitcher } from '../../../components/RoleSwitcher'

export function SuperAdminHeader({ theme, onToggleTheme }) {
  const {
    searchQuery,
    setSearchQuery,
    openModal,
    setIsMobileSidebarOpen,
    events,
  } = useSuperAdmin()

  const warningCount = events.filter((e) => e.collision_warning).length

  return (
    <header className="smarthr-topbar">
      <div className="smarthr-topbar-left">
        <button
          type="button"
          className="smarthr-menu-toggle-btn"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label="Buka navigasi Super Admin"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="smarthr-search-container">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari transaksi, klien, vendor, kontrak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="smarthr-search-input"
          />
          <kbd className="smarthr-kbd-pill">CMD + K</kbd>
        </div>
      </div>

      <div className="smarthr-topbar-right">
        {warningCount > 0 && (
          <button
            type="button"
            className="topbar-warning-chip"
            onClick={() => openModal('override_event')}
            title="Ada jadwal yang memerlukan perhatian khusus Super Admin"
          >
            <span className="warning-dot-pulse" />
            <span>{warningCount} Jadwal Perlu Override</span>
          </button>
        )}

        <button
          type="button"
          className="smarthr-top-cta smarthr-btn-ember"
          onClick={() => openModal('override_event')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>Override Jadwal</span>
        </button>

        <button
          type="button"
          className="smarthr-icon-action-btn"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
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

        <RoleSwitcher currentRoleId="super_admin" />

        <div className="smarthr-profile-chip">
          <div className="smarthr-top-avatar superadmin-avatar">
            <span>BA</span>
            <span className="online-indicator" />
          </div>
          <div className="smarthr-profile-text">
            <span className="profile-name">Baskoro Adiwijaya</span>
            <span className="profile-role">Pemilik WO (Super Admin)</span>
          </div>
        </div>
      </div>
    </header>
  )
}
