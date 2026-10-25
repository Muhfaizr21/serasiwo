import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ROLES = [
  {
    id: 'super_admin',
    title: 'Super Admin',
    subtitle: 'Pemilik WO (Kendali Penuh & Override)',
    path: '/dashboard/super-admin',
    badge: '👑',
  },
  {
    id: 'admin_ops',
    title: 'Admin Operasional',
    subtitle: 'Koordinator Lapangan & Rundown',
    path: '/dashboard/admin-operasional',
    badge: '📋',
  },
  {
    id: 'vendor_mitra',
    title: 'Vendor Mitra',
    subtitle: 'Katering, Dekorasi & Jadwal Mitra',
    path: '/dashboard/vendor',
    badge: '🍽️',
  },
]

export function RoleSwitcher({ currentRoleId = 'vendor_mitra' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const currentRole = ROLES.find((r) => r.id === currentRoleId) || ROLES[2]

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSelectRole = (role) => {
    setIsOpen(false)
    if (role.path) {
      navigate(role.path)
    }
  }

  return (
    <div className="role-switcher-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="role-switcher-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Ganti Peran Pratinjau (Role Switcher)"
      >
        <span className="role-switcher-icon">{currentRole.badge}</span>
        <div className="role-switcher-text">
          <span className="role-switcher-sub">Peran Aktif</span>
          <span className="role-switcher-title">{currentRole.title}</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`role-switcher-arrow ${isOpen ? 'open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="role-switcher-menu" role="menu">
          <div className="role-switcher-menu-header">
            <span>PILIH RUANG KERJA PERAN:</span>
          </div>
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`role-switcher-option ${r.id === currentRoleId ? 'selected' : ''}`}
              onClick={() => handleSelectRole(r)}
              role="menuitem"
            >
              <span className="role-option-badge">{r.badge}</span>
              <div className="role-option-details">
                <span className="role-option-title">{r.title}</span>
                <span className="role-option-sub">{r.subtitle}</span>
              </div>
              {r.id === currentRoleId && (
                <span className="role-option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
