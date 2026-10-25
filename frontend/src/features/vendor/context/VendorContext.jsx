import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { vendorService } from '../services/vendorService'
import {
  resolveVendorPathFromTab,
  resolveVendorTabFromPath,
} from '../constants/vendorNavigation'
import { VendorContext } from './VendorContextObject'

export function VendorProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const toastTimerRef = useRef(null)

  const activeTab = resolveVendorTabFromPath(location.pathname)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModal, setActiveModal] = useState(null)
  const [modalPayload, setModalPayload] = useState(null)
  const [toast, setToast] = useState(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const setActiveTab = useCallback(
    (nextTab) => {
      setIsMobileSidebarOpen(false)
      const targetPath = resolveVendorPathFromTab(nextTab)
      if (location.pathname !== targetPath) {
        navigate(targetPath)
      }
    },
    [location.pathname, navigate]
  )

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const reloadDashboard = useCallback(async () => {
    try {
      const data = await vendorService.getDashboard()
      setDashboardData(data)
      setRefreshTick((prev) => prev + 1)
    } catch {
      showToast('Gagal memuat pembaruan data vendor', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    let isMounted = true
    vendorService
      .getDashboard()
      .then((data) => {
        if (isMounted) setDashboardData(data)
      })
      .catch(() => {
        if (isMounted) showToast('Gagal memuat pembaruan data vendor', 'error')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [showToast])

  const openModal = useCallback((modalType, payload = null) => {
    setActiveModal(modalType)
    setModalPayload(payload)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setModalPayload(null)
  }, [])

  const value = {
    activeTab,
    setActiveTab,
    dashboardData,
    loading,
    refreshTick,
    reloadDashboard,
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
  }

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
}
