import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendor } from '../context/useVendor'
import { RoleSwitcher } from '../../../components/RoleSwitcher'
import { formatRupiah, formatShortDateID } from '../utils/vendorFormatters'

export function VendorHeader({ theme, onToggleTheme }) {
  const navigate = useNavigate()
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    openModal,
    dashboardData,
    setIsMobileSidebarOpen,
    showToast,
  } = useVendor()

  // Dropdown states
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Notification state
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('serasiwo_read_notif_ids')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // DOM Refs for click outside
  const quickActionRef = useRef(null)
  const notifRef = useRef(null)
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)

  const profile = dashboardData?.vendor_profile || {}
  const picName = profile.pic_name || profile.name || 'Hendra Kusuma'
  const picRole = profile.pic_role || profile.category || 'Mitra Katering'
  const legalName = profile.legal_name || 'CV Berkah Rasa Nusantara'
  const picInitials =
    picName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || 'HK'

  // Dynamic notification items
  const allNotifications = useMemo(() => {
    const alerts = dashboardData?.new_booking_alerts || []
    const pendingJobs = alerts.length > 0 ? alerts : (dashboardData?.jobs || []).filter((j) => j.status === 'menunggu')
    const payouts = dashboardData?.recent_payouts || []
    const processingPayout = payouts.find((p) => p.status === 'diproses') || payouts[0]

    const list = []

    if (pendingJobs.length > 0) {
      const topJob = pendingJobs[0]
      list.push({
        id: 'notif-pending-booking',
        type: 'amber',
        title: 'Permintaan Booking Baru Masuk',
        desc: `${topJob.wedding_title} (${(topJob.portions || 0).toLocaleString('id-ID')} Porsi) menunggu respons konfirmasi Anda.`,
        time: '15 menit lalu',
        targetTab: 'jobs',
        icon: '📋',
      })
    }

    if (processingPayout) {
      list.push({
        id: `notif-payout-${processingPayout.id || 'recent'}`,
        type: 'blue',
        title: 'Status Verifikasi Invoice WO',
        desc: `Faktur ${processingPayout.invoice_number} (${formatRupiah(processingPayout.amount)}) dalam proses verifikasi keuangan.`,
        time: '1 jam lalu',
        targetTab: 'payout',
        icon: '💳',
      })
    }

    list.push({
      id: 'notif-loading-dock',
      type: 'green',
      title: 'Slot Loading Sasana Kriya Siap',
      desc: 'Pintu Gate B dibuka pukul 06:30 WIB untuk Pernikahan Anisa & Rizky. Armada Chiller siap muat.',
      time: '2 jam lalu',
      targetTab: 'loading_schedule',
      icon: '🚚',
    })

    list.push({
      id: 'notif-sop-hygiene',
      type: 'blue',
      title: 'Sertifikasi Halal & Higiene Aktif',
      desc: 'Sertifikat BPJPH & Dinkes CV Berkah Rasa Nusantara terverifikasi resmi oleh SerasiWO.',
      time: 'Kemarin',
      targetTab: 'sop',
      icon: '✓',
    })

    return list
  }, [dashboardData])

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !readNotifIds.includes(n.id)).length
  }, [allNotifications, readNotifIds])

  // Handle outside click & hotkey ⌘K
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) {
        setIsQuickActionOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
    }

    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setIsQuickActionOpen(false)
        setIsNotifOpen(false)
        setIsProfileOpen(false)
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  // Smart Search Results
  const searchResults = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return null

    const allJobs = dashboardData?.jobs || []
    const matchedJobs = allJobs
      .filter(
        (j) =>
          (j.wedding_title || '').toLowerCase().includes(q) ||
          (j.venue || '').toLowerCase().includes(q) ||
          (j.bride_groom || '').toLowerCase().includes(q)
      )
      .slice(0, 3)

    const allPayouts = dashboardData?.recent_payouts || []
    const matchedPayouts = allPayouts
      .filter(
        (p) =>
          (p.invoice_number || '').toLowerCase().includes(q) ||
          (p.wedding_title || '').toLowerCase().includes(q)
      )
      .slice(0, 2)

    const NAV_ITEMS = [
      { title: 'Kalender Ketersediaan & Blokir Jadwal', tab: 'calendar', badge: 'Kalender' },
      { title: 'Manajemen Pekerjaan (Jobs)', tab: 'jobs', badge: 'Jobs' },
      { title: 'Update Status Kesiapan Produksi', tab: 'readiness', badge: 'Kesiapan' },
      { title: 'Penagihan Vendor & Pencairan Payout', tab: 'payout', badge: 'Payout' },
      { title: 'Jadwal Bongkar Muat & Loading Dock', tab: 'loading_schedule', badge: 'Logistik' },
      { title: 'Manifest Menu & Pemeriksaan Alergen', tab: 'menu_manifest', badge: 'Menu' },
      { title: 'Direktori Kontak PIC Lapangan WO', tab: 'field_pic', badge: 'Kontak' },
      { title: 'Standar Operasional Prosedur (SOP) Katering', tab: 'sop', badge: 'SOP' },
      { title: 'Profil Usaha, NPWP & Legalitas Mitra', tab: 'profile', badge: 'Profil' },
      { title: 'Data Rekening Bank Penerima Payout', tab: 'bank_account', badge: 'Bank' },
    ]
    const matchedNav = NAV_ITEMS.filter(
      (n) => n.title.toLowerCase().includes(q) || n.badge.toLowerCase().includes(q)
    ).slice(0, 3)

    return {
      jobs: matchedJobs,
      payouts: matchedPayouts,
      navigation: matchedNav,
      hasResults: matchedJobs.length > 0 || matchedPayouts.length > 0 || matchedNav.length > 0,
    }
  }, [searchQuery, dashboardData])

  const handleSelectSearchItem = (tab, infoText = '') => {
    setActiveTab(tab)
    setIsSearchOpen(false)
    if (infoText) {
      showToast(`Membuka: ${infoText}`, 'success')
    }
  }

  const handleMarkAllRead = () => {
    const allIds = allNotifications.map((n) => n.id)
    setReadNotifIds(allIds)
    try {
      localStorage.setItem('serasiwo_read_notif_ids', JSON.stringify(allIds))
    } catch {
      // ignore
    }
    showToast('Seluruh notifikasi ditandai sebagai telah dibaca', 'success')
  }

  const handleClickNotif = (notif) => {
    if (!readNotifIds.includes(notif.id)) {
      const next = [...readNotifIds, notif.id]
      setReadNotifIds(next)
      try {
        localStorage.setItem('serasiwo_read_notif_ids', JSON.stringify(next))
      } catch {
        // ignore
      }
    }
    setIsNotifOpen(false)
    setActiveTab(notif.targetTab)
  }

  const handleToggleThemeClick = () => {
    onToggleTheme()
    showToast(theme === 'light' ? 'Mode Gelap diaktifkan' : 'Mode Terang diaktifkan', 'success')
  }

  const handleLogout = () => {
    setIsProfileOpen(false)
    localStorage.removeItem('serasiwo_token')
    localStorage.removeItem('serasiwo_user')
    showToast('Anda telah keluar dari Portal Mitra SerasiWO', 'success')
    navigate('/login')
  }

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

        <div className="vendor-search-container smarthr-search-container" ref={searchRef}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari acara, lokasi venue, katering..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="vendor-search-input smarthr-search-input"
          />
          <kbd
            className="vendor-kbd-pill smarthr-kbd-pill"
            onClick={() => {
              setIsSearchOpen(true)
              searchInputRef.current?.focus()
            }}
            style={{ cursor: 'pointer' }}
            title="Tekan ⌘K untuk mencari"
          >
            ⌘K
          </kbd>

          {/* Interactive Search Palette Dropdown */}
          {isSearchOpen && (
            <div className="vendor-search-palette" role="dialog" aria-label="Hasil pencarian">
              {searchResults ? (
                searchResults.hasResults ? (
                  <>
                    {searchResults.jobs.length > 0 && (
                      <div className="search-palette-group">
                        <div className="search-palette-group-title">ACARA &amp; PESANAN KATERING:</div>
                        {searchResults.jobs.map((j) => (
                          <button
                            key={j.id}
                            type="button"
                            className="search-palette-item"
                            onClick={() => handleSelectSearchItem('jobs', j.wedding_title)}
                          >
                            <span className="search-palette-icon">🍽️</span>
                            <div className="search-palette-text">
                              <span className="search-palette-title">{j.wedding_title}</span>
                              <span className="search-palette-sub">
                                {formatShortDateID(j.event_date)} • {j.venue} ({j.portions} Porsi)
                              </span>
                            </div>
                            <span className="search-palette-badge">Jobs</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.payouts.length > 0 && (
                      <div className="search-palette-group">
                        <div className="search-palette-group-title">TAGIHAN &amp; PAYOUT:</div>
                        {searchResults.payouts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="search-palette-item"
                            onClick={() => handleSelectSearchItem('payout', p.invoice_number)}
                          >
                            <span className="search-palette-icon">💳</span>
                            <div className="search-palette-text">
                              <span className="search-palette-title">{p.invoice_number}</span>
                              <span className="search-palette-sub">
                                {p.wedding_title} • {formatRupiah(p.amount)}
                              </span>
                            </div>
                            <span className="search-palette-badge">{p.status}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.navigation.length > 0 && (
                      <div className="search-palette-group">
                        <div className="search-palette-group-title">PINTASAN MODUL:</div>
                        {searchResults.navigation.map((nav) => (
                          <button
                            key={nav.tab}
                            type="button"
                            className="search-palette-item"
                            onClick={() => handleSelectSearchItem(nav.tab, nav.title)}
                          >
                            <span className="search-palette-icon">⚡</span>
                            <div className="search-palette-text">
                              <span className="search-palette-title">{nav.title}</span>
                              <span className="search-palette-sub">Buka modul {nav.badge}</span>
                            </div>
                            <span className="search-palette-badge">{nav.badge}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="search-palette-empty">
                    Tidak ditemukan acara atau data dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                  </div>
                )
              ) : (
                <div className="search-palette-group">
                  <div className="search-palette-group-title">PINTASAN POPULER:</div>
                  <button
                    type="button"
                    className="search-palette-item"
                    onClick={() => handleSelectSearchItem('jobs', 'Manajemen Pekerjaan')}
                  >
                    <span className="search-palette-icon">📋</span>
                    <div className="search-palette-text">
                      <span className="search-palette-title">Daftar Pekerjaan &amp; Konfirmasi</span>
                      <span className="search-palette-sub">Lihat pesanan masuk dan detail porsi</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="search-palette-item"
                    onClick={() => handleSelectSearchItem('calendar', 'Kalender Ketersediaan')}
                  >
                    <span className="search-palette-icon">📅</span>
                    <div className="search-palette-text">
                      <span className="search-palette-title">Kalender Ketersediaan Mitra</span>
                      <span className="search-palette-sub">Pantau jadwal WO dan blokir tanggal</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="search-palette-item"
                    onClick={() => handleSelectSearchItem('payout', 'Penagihan & Payout')}
                  >
                    <span className="search-palette-icon">💳</span>
                    <div className="search-palette-text">
                      <span className="search-palette-title">Penagihan &amp; Pencairan Payout</span>
                      <span className="search-palette-sub">Unggah faktur dan pantau status transfer</span>
                    </div>
                  </button>
                </div>
              )}

              <div className="search-palette-footer">
                <span>Gunakan kata kunci atau nama acara</span>
                <span>ESC untuk menutup</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Consolidated Quick Action, Notifications, Theme, Role, Profile */}
      <div className="vendor-topbar-right smarthr-topbar-right">
        {/* Quick Action Dropdown */}
        <div className="vendor-quick-action-wrapper" ref={quickActionRef}>
          <button
            type="button"
            className="vendor-quick-action-btn"
            onClick={() => {
              setIsQuickActionOpen((prev) => !prev)
              setIsNotifOpen(false)
              setIsProfileOpen(false)
            }}
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
                <div className="quick-action-icon-circle ember-circle" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="quick-action-info">
                  <strong>+ Unggah Invoice Payout</strong>
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
                <div className="quick-action-icon-circle blue-circle" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="quick-action-info">
                  <strong>+ Blokir Tanggal Dapur</strong>
                  <span>Tandai jadwal penuh atau libur armada</span>
                </div>
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => {
                  setIsQuickActionOpen(false)
                  setActiveTab('readiness')
                }}
                role="menuitem"
              >
                <div className="quick-action-icon-circle ember-circle" aria-hidden="true">
                  <span style={{ fontSize: '15px' }}>✓</span>
                </div>
                <div className="quick-action-info">
                  <strong>Checklist Kesiapan Produksi</strong>
                  <span>Update tahapan sortir, loading, dan standby</span>
                </div>
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => {
                  setIsQuickActionOpen(false)
                  setActiveTab('jobs')
                }}
                role="menuitem"
              >
                <div className="quick-action-icon-circle blue-circle" aria-hidden="true">
                  <span style={{ fontSize: '15px' }}>📋</span>
                </div>
                <div className="quick-action-info">
                  <strong>Respons Booking Baru</strong>
                  <span>Konfirmasi Terima atau Tolak pesanan WO</span>
                </div>
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => {
                  setIsQuickActionOpen(false)
                  setActiveTab('loading_schedule')
                }}
                role="menuitem"
              >
                <div className="quick-action-icon-circle ember-circle" aria-hidden="true">
                  <span style={{ fontSize: '15px' }}>🚚</span>
                </div>
                <div className="quick-action-info">
                  <strong>Jadwal Bongkar Muat (Loading)</strong>
                  <span>Atur slot gate dan armada box katering</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="vendor-notification-wrapper" ref={notifRef}>
          <button
            type="button"
            className="vendor-top-icon-btn smarthr-icon-action-btn"
            onClick={() => {
              setIsNotifOpen((prev) => !prev)
              setIsQuickActionOpen(false)
              setIsProfileOpen(false)
            }}
            title="Notifikasi Operasional & Booking"
            aria-label="Buka notifikasi"
            aria-expanded={isNotifOpen}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="vendor-badge-dot smarthr-badge-dot">{unreadCount}</span>
            )}
          </button>

          {isNotifOpen && (
            <div className="vendor-notification-popover" role="region" aria-label="Daftar notifikasi">
              <div className="notif-popover-header">
                <div className="notif-header-left">
                  <span className="notif-header-title">Notifikasi Operasional</span>
                  {unreadCount > 0 && <span className="notif-count-pill">{unreadCount} Baru</span>}
                </div>
                {unreadCount > 0 && (
                  <button type="button" className="notif-mark-read-btn" onClick={handleMarkAllRead}>
                    Tandai Dibaca
                  </button>
                )}
              </div>

              <div className="notif-popover-list">
                {allNotifications.map((notif) => {
                  const isUnread = !readNotifIds.includes(notif.id)
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      className={`notif-item ${isUnread ? 'notif-item-unread' : ''}`}
                      onClick={() => handleClickNotif(notif)}
                    >
                      <div className={`notif-icon-circle notif-icon-${notif.type}`}>
                        <span>{notif.icon}</span>
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-title-row">
                          <span className="notif-item-title">{notif.title}</span>
                          {isUnread && <span className="notif-unread-dot" />}
                        </div>
                        <p className="notif-item-desc">{notif.desc}</p>
                        <span className="notif-item-time">{notif.time}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="notif-popover-footer">
                <button
                  type="button"
                  className="notif-footer-btn"
                  onClick={() => {
                    setIsNotifOpen(false)
                    setActiveTab('jobs')
                  }}
                >
                  Buka Daftar Semua Pekerjaan →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          className="vendor-top-icon-btn smarthr-icon-action-btn"
          onClick={handleToggleThemeClick}
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

        {/* User Profile Dropdown */}
        <div className="vendor-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="vendor-profile-chip smarthr-profile-chip"
            onClick={() => {
              setIsProfileOpen((prev) => !prev)
              setIsQuickActionOpen(false)
              setIsNotifOpen(false)
            }}
            title={`Akun: ${picName} (${legalName})`}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            style={{ cursor: 'pointer', background: 'transparent' }}
          >
            <div className="vendor-top-avatar smarthr-top-avatar">
              <span>{picInitials}</span>
              <span className="online-indicator" />
            </div>
            <div className="vendor-profile-text smarthr-profile-text">
              <span className="profile-name">{picName}</span>
              <span className="profile-role">{picRole}</span>
            </div>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                color: 'var(--text-tertiary)',
                transform: isProfileOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isProfileOpen && (
            <div className="vendor-profile-menu" role="menu">
              <div className="profile-menu-header">
                <div className="profile-menu-avatar">{picInitials}</div>
                <div className="profile-menu-info">
                  <span className="profile-menu-name">{picName}</span>
                  <span className="profile-menu-legal">{legalName}</span>
                  <span className="profile-menu-badge">✓ Mitra Terverifikasi BPJPH</span>
                </div>
              </div>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setIsProfileOpen(false)
                  setActiveTab('profile')
                }}
                role="menuitem"
              >
                <span className="profile-menu-item-icon">🏢</span>
                <span>Profil Usaha &amp; Legalitas</span>
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setIsProfileOpen(false)
                  setActiveTab('bank_account')
                }}
                role="menuitem"
              >
                <span className="profile-menu-item-icon">💳</span>
                <span>Informasi Rekening Bank</span>
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setIsProfileOpen(false)
                  setActiveTab('sop')
                }}
                role="menuitem"
              >
                <span className="profile-menu-item-icon">📜</span>
                <span>Standar SOP Higienitas Katering</span>
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setIsProfileOpen(false)
                  setActiveTab('field_pic')
                }}
                role="menuitem"
              >
                <span className="profile-menu-item-icon">📞</span>
                <span>Direktori PIC Lapangan WO</span>
              </button>

              <div className="profile-menu-divider" />

              <button
                type="button"
                className="profile-menu-item profile-menu-logout"
                onClick={handleLogout}
                role="menuitem"
              >
                <span className="profile-menu-item-icon">🚪</span>
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

