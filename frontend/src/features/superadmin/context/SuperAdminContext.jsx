import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { superAdminService } from '../services/superAdminService'

const SuperAdminContext = createContext(null)

export function SuperAdminProvider({ children }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [metricsData, setMetricsData] = useState(null)
  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [vendors, setVendors] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModal, setActiveModal] = useState(null)
  const [modalPayload, setModalPayload] = useState(null)
  const [toast, setToast] = useState(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }, [])

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [m, ev, cl, vn, lg] = await Promise.all([
        superAdminService.getOverviewMetrics(),
        superAdminService.getMasterEvents(),
        superAdminService.getClients(),
        superAdminService.getVendors(),
        superAdminService.getAuditLogs(),
      ])
      setMetricsData(m)
      setEvents(ev)
      setClients(cl)
      setVendors(vn)
      setAuditLogs(lg)
    } catch {
      showToast('Gagal memuat data Super Admin', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const openModal = useCallback((modalType, payload = null) => {
    setActiveModal(modalType)
    setModalPayload(payload)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setModalPayload(null)
  }, [])

  const handleOverrideSchedule = (eventId, newDate, newVenue, overrideReason) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              date: newDate || e.date,
              venue: newVenue || e.venue,
              collision_warning: false,
              overridden_by_owner: true,
              override_reason: overrideReason,
            }
          : e
      )
    )

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actor: 'Baskoro Adiwijaya (Super Admin)',
        action: 'Force Override Jadwal & Vendor',
        target: `Acara ${eventId}`,
        note: `Override jadwal disetujui: ${overrideReason}`,
      },
      ...prev,
    ])

    showToast('Jadwal berhasil di-override secara paksa oleh Pemilik WO.', 'success')
    closeModal()
  }

  const handleSaveClient = (clientData) => {
    if (clientData.id) {
      setClients((prev) =>
        prev.map((c) => (c.id === clientData.id ? { ...c, ...clientData } : c))
      )
      showToast('Data klien berhasil diperbarui!', 'success')
    } else {
      const newClient = {
        ...clientData,
        id: `cli-${Date.now()}`,
      }
      setClients((prev) => [newClient, ...prev])
      showToast('Klien baru berhasil didaftarkan ke sistem!', 'success')
    }
    closeModal()
  }

  const handleDeleteClient = (clientId) => {
    const target = clients.find((c) => c.id === clientId)
    setClients((prev) => prev.filter((c) => c.id !== clientId))

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actor: 'Baskoro Adiwijaya (Super Admin)',
        action: 'Hapus Klien Permanen',
        target: target ? target.name : clientId,
        note: 'Data arsip klien dihapus oleh pemilik WO.',
      },
      ...prev,
    ])

    showToast('Data klien berhasil dihapus permanen dari sistem.', 'success')
    closeModal()
  }

  const handleToggleVendorStatus = (vendorId) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === vendorId) {
          const nextStatus = v.status === 'active' ? 'blacklisted' : 'active'
          showToast(
            nextStatus === 'blacklisted'
              ? `Vendor ${v.name} telah di-blacklist!`
              : `Vendor ${v.name} telah diaktifkan kembali.`,
            nextStatus === 'blacklisted' ? 'error' : 'success'
          )
          return { ...v, status: nextStatus }
        }
        return v
      })
    )
  }

  const value = {
    activeTab,
    setActiveTab,
    loading,
    metricsData,
    events,
    clients,
    vendors,
    auditLogs,
    searchQuery,
    setSearchQuery,
    activeModal,
    modalPayload,
    openModal,
    closeModal,
    toast,
    showToast,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    handleOverrideSchedule,
    handleSaveClient,
    handleDeleteClient,
    handleToggleVendorStatus,
    reloadAll: loadAllData,
  }

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  )
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext)
  if (!context) {
    throw new Error('useSuperAdmin must be used within SuperAdminProvider')
  }
  return context
}
