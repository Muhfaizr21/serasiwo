import { useMemo, useState } from 'react'
import { useVendor } from '../context/useVendor'
import { vendorService } from '../services/vendorService'
import {
  formatRupiah,
  formatShortDateID,
  getDayBadgeParts,
} from '../utils/vendorFormatters'

function parseCapacityNumber(rawStr) {
  if (!rawStr) return 5000
  const digitsOnly = String(rawStr).replace(/[^\d]/g, '')
  const parsed = Number(digitsOnly)
  return parsed > 0 ? parsed : 5000
}

function parseIsoDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatDateIso(dateObj) {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function VendorOverviewTab() {
  const {
    setActiveTab,
    dashboardData,
    reloadDashboard,
    showToast,
    searchQuery,
    setSearchQuery,
  } = useVendor()

  const [activeFilter, setActiveFilter] = useState('Semua Jadwal')
  const [isSyncing, setIsSyncing] = useState(false)
  const [processingJobId, setProcessingJobId] = useState(null)
  const [rejectingJob, setRejectingJob] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState(null)

  const profile = dashboardData?.vendor_profile || {}
  const rawEvents = useMemo(
    () => dashboardData?.events_this_week || [],
    [dashboardData]
  )
  const allJobs = useMemo(() => dashboardData?.jobs || [], [dashboardData])
  const pendingJobsRaw = useMemo(
    () =>
      dashboardData?.new_booking_alerts ||
      allJobs.filter((j) => j.status === 'menunggu'),
    [dashboardData, allJobs]
  )
  const dateBlocks = useMemo(
    () => dashboardData?.date_blocks || [],
    [dashboardData]
  )
  const recentPayouts = useMemo(
    () => dashboardData?.recent_payouts || [],
    [dashboardData]
  )
  const activeReadiness = useMemo(
    () => dashboardData?.active_readiness || [],
    [dashboardData]
  )
  const loadingSchedules = useMemo(
    () => dashboardData?.loading_schedules || {},
    [dashboardData]
  )
  const menuManifests = useMemo(
    () => dashboardData?.menu_manifests || {},
    [dashboardData]
  )
  const fieldPics = useMemo(
    () => dashboardData?.field_pics || [],
    [dashboardData]
  )
  const sopChecklist = useMemo(
    () => dashboardData?.sop_checklist || [],
    [dashboardData]
  )

  // Gabungkan acara terjadwal dari vendor_events dan pekerjaan berstatus diterima
  const allScheduledEvents = useMemo(() => {
    const mapByKey = new Map()
    rawEvents.forEach((ev) => {
      const key = ev.job_id || ev.id
      mapByKey.set(key, {
        ...ev,
        id: ev.id || ev.job_id,
        job_id: ev.job_id || ev.id,
        portions_or_units: Number(ev.portions_or_units || ev.portions || 0),
        portion_unit_label: ev.portion_unit_label || 'Porsi Buffet',
      })
    })
    allJobs
      .filter((j) => j.status === 'diterima')
      .forEach((j) => {
        const key = j.id
        if (!mapByKey.has(key)) {
          mapByKey.set(key, {
            id: j.event_id || j.id,
            job_id: j.id,
            wedding_title: j.wedding_title,
            bride_groom: j.bride_groom,
            event_date: j.event_date,
            time_slot: j.time_slot,
            venue: j.venue,
            portions_or_units: Number(j.portions || 0),
            portion_unit_label: j.portion_unit_label || 'Porsi Buffet',
            readiness_status: 'Bahan Mentah Siap',
            readiness_percent: 25,
            note: j.menu_or_notes || '',
          })
        }
      })
    return Array.from(mapByKey.values()).sort((a, b) =>
      String(a.event_date).localeCompare(String(b.event_date))
    )
  }, [rawEvents, allJobs])

  // Tentukan titik tanggal referensi operasional dari jadwal paling awal yang aktif
  const anchorDate = useMemo(() => {
    const dates = [
      ...allScheduledEvents.map((e) => e.event_date),
      ...pendingJobsRaw.map((j) => j.event_date),
      ...dateBlocks.map((b) => b.date),
    ]
      .filter(Boolean)
      .sort()
    if (dates.length > 0) {
      const parsed = parseIsoDate(dates[0])
      if (parsed) return parsed
    }
    return new Date(2026, 9, 25)
  }, [allScheduledEvents, pendingJobsRaw, dateBlocks])

  // Filter berdasarkan rentang waktu ('Pekan Ini', 'Bulan Ini', 'Semua Jadwal') + searchQuery
  const filteredEvents = useMemo(() => {
    const q = String(searchQuery || '')
      .trim()
      .toLowerCase()

    return allScheduledEvents.filter((ev) => {
      const evDate = parseIsoDate(ev.event_date)
      if (evDate && activeFilter !== 'Semua Jadwal') {
        const diffDays = Math.round(
          (evDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (activeFilter === 'Pekan Ini' && (diffDays < -1 || diffDays > 7)) {
          return false
        }
        if (activeFilter === 'Bulan Ini' && (diffDays < -1 || diffDays > 31)) {
          return false
        }
      }

      if (!q) return true
      const haystack = [
        ev.id,
        ev.job_id,
        ev.wedding_title,
        ev.bride_groom,
        ev.venue,
        ev.event_date,
        ev.readiness_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [allScheduledEvents, activeFilter, anchorDate, searchQuery])

  const filteredPendingJobs = useMemo(() => {
    const q = String(searchQuery || '')
      .trim()
      .toLowerCase()
    if (!q) return pendingJobsRaw
    return pendingJobsRaw.filter((job) => {
      const haystack = [
        job.id,
        job.wedding_title,
        job.bride_groom,
        job.venue,
        job.package_name,
        job.event_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [pendingJobsRaw, searchQuery])

  // Kalkulasi metrik dinamis dari database
  const dailyKitchenCap = useMemo(
    () => parseCapacityNumber(profile.kitchen_capacity),
    [profile.kitchen_capacity]
  )

  const totalPortions = useMemo(
    () =>
      filteredEvents.reduce(
        (sum, ev) => sum + (Number(ev.portions_or_units) || 0),
        0
      ),
    [filteredEvents]
  )

  const peakSingleDayPortions = useMemo(() => {
    const byDate = {}
    filteredEvents.forEach((ev) => {
      byDate[ev.event_date] =
        (byDate[ev.event_date] || 0) + (Number(ev.portions_or_units) || 0)
    })
    const vals = Object.values(byDate)
    return vals.length > 0 ? Math.max(...vals) : 0
  }, [filteredEvents])

  const kitchenUtilizationPct = useMemo(() => {
    const activeDays = Math.max(1, filteredEvents.length)
    const totalWindowCapacity = dailyKitchenCap * activeDays
    if (totalWindowCapacity <= 0) return 0
    return Math.min(100, Math.round((totalPortions / totalWindowCapacity) * 100))
  }, [totalPortions, dailyKitchenCap, filteredEvents.length])

  const peakDailyUtilizationPct = useMemo(() => {
    if (dailyKitchenCap <= 0) return 0
    return Math.min(
      100,
      Math.round((peakSingleDayPortions / dailyKitchenCap) * 100)
    )
  }, [peakSingleDayPortions, dailyKitchenCap])

  const readinessMapByJob = useMemo(() => {
    const map = {}
    activeReadiness.forEach((r) => {
      if (r.job_id) map[r.job_id] = r
    })
    return map
  }, [activeReadiness])

  const avgReadinessPct = useMemo(() => {
    if (filteredEvents.length === 0) return 0
    const sum = filteredEvents.reduce((acc, ev) => {
      const r = readinessMapByJob[ev.job_id]
      const pct =
        r?.progress_percent ??
        (typeof ev.readiness_percent === 'number' ? ev.readiness_percent : 0)
      return acc + pct
    }, 0)
    return Math.round(sum / filteredEvents.length)
  }, [filteredEvents, readinessMapByJob])

  const fullyReadyEventsCount = useMemo(() => {
    return filteredEvents.filter((ev) => {
      const r = readinessMapByJob[ev.job_id]
      const pct = r?.progress_percent ?? ev.readiness_percent ?? 0
      return pct >= 100
    }).length
  }, [filteredEvents, readinessMapByJob])

  const payoutSummary = useMemo(() => {
    const pendingList = recentPayouts.filter(
      (p) => p.status === 'tertunda' || p.status === 'diproses'
    )
    const settledList = recentPayouts.filter((p) => p.status === 'dicairkan')
    const pendingAmount = pendingList.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    )
    const settledAmount = settledList.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    )
    const totalAmount = pendingAmount + settledAmount
    const settledPct =
      totalAmount > 0 ? Math.round((settledAmount / totalAmount) * 100) : 0

    return {
      pendingCount: pendingList.length,
      settledCount: settledList.length,
      totalCount: recentPayouts.length,
      pendingAmount,
      settledAmount,
      totalAmount,
      settledPct,
    }
  }, [recentPayouts])

  const pendingContractValue = useMemo(
    () =>
      filteredPendingJobs.reduce(
        (sum, j) => sum + (Number(j.payout_amount) || 0),
        0
      ),
    [filteredPendingJobs]
  )

  const jobDecisionCounts = useMemo(() => {
    const accepted = allJobs.filter((j) => j.status === 'diterima').length
    const rejected = allJobs.filter((j) => j.status === 'ditolak').length
    return { accepted, rejected }
  }, [allJobs])

  // Kalkulasi real-time Timeline Operasional Loading & Produksi dari loading_schedules DB
  const liveOperationalTimeline = useMemo(() => {
    const scheduleValues = Object.values(loadingSchedules)
    const allSlots = []
    scheduleValues.forEach((sched) => {
      if (Array.isArray(sched?.slots)) {
        sched.slots.forEach((slot) => {
          allSlots.push({
            ...slot,
            eventId: sched.event_id,
            weddingTitle: sched.wedding_title,
          })
        })
      }
    })

    const bands = [
      {
        id: 'band-prep',
        time: '04:30 - 07:00',
        title: 'Persiapan Dapur & Loading Logistik Awal',
        match: (t) => t >= '04:00' && t < '07:00',
        color: '#2563eb',
      },
      {
        id: 'band-dispatch',
        time: '07:00 - 09:00',
        title: 'Inspeksi Suhu, Segel Pangan & Dispatch Armada',
        match: (t) => t >= '07:00' && t < '09:00',
        color: '#ff5900',
      },
      {
        id: 'band-setup',
        time: '09:00 - 11:30',
        title: 'Unloading Dock Ballroom & Setup Buffet VIP',
        match: (t) => t >= '09:00' && t < '11:30',
        color: '#16a34a',
      },
      {
        id: 'band-service',
        time: '11:30 - 14:30',
        title: 'Jamuan Utama Resepsi & Replenishment Chafing Dish',
        match: (t) => t >= '11:30' && t < '14:30',
        color: '#8b5cf6',
      },
      {
        id: 'band-clearup',
        time: '14:30 - 22:00',
        title: 'Clear-up Peralatan & Serah Terima BAST WO',
        match: (t) => t >= '14:30',
        color: '#0ea5e9',
      },
    ]

    return bands.map((band) => {
      const matched = allSlots.filter((s) =>
        band.match(String(s.time || '08:00').slice(0, 5))
      )
      const total = matched.length
      const completed = matched.filter((s) => Boolean(s.completed)).length
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0
      return {
        ...band,
        totalSlots: total,
        completedSlots: completed,
        percent: pct,
      }
    })
  }, [loadingSchedules])

  // Kalkulasi real-time 6 Kapsul Kapasitas & Kepatuhan Operasional dari Database
  const liveCapacityCapsules = useMemo(() => {
    // 1. Kesiapan Produksi
    let totalReadinessSteps = 0
    let doneReadinessSteps = 0
    activeReadiness.forEach((r) => {
      if (Array.isArray(r.steps)) {
        totalReadinessSteps += r.steps.length
        doneReadinessSteps += r.steps.filter((s) => s.completed).length
      }
    })
    const readinessStepsPct =
      totalReadinessSteps > 0
        ? Math.round((doneReadinessSteps / totalReadinessSteps) * 100)
        : avgReadinessPct

    // 2. Kelulusan QC Menu Manifest
    let totalManifestItems = 0
    let passedManifestItems = 0
    Object.values(menuManifests).forEach((m) => {
      if (Array.isArray(m?.items)) {
        totalManifestItems += m.items.length
        passedManifestItems += m.items.filter((i) => i.qc_checked).length
      }
    })
    const qcPassPct =
      totalManifestItems > 0
        ? Math.round((passedManifestItems / totalManifestItems) * 100)
        : 0

    // 3. Penyelesaian Slot Loading Dock
    let totalLoadingSlots = 0
    let doneLoadingSlots = 0
    Object.values(loadingSchedules).forEach((s) => {
      if (Array.isArray(s?.slots)) {
        totalLoadingSlots += s.slots.length
        doneLoadingSlots += s.slots.filter((sl) => sl.completed).length
      }
    })
    const loadingPct =
      totalLoadingSlots > 0
        ? Math.round((doneLoadingSlots / totalLoadingSlots) * 100)
        : 0

    // 4. Kepatuhan SOP
    const totalSop = sopChecklist.length
    const ackSop = sopChecklist.filter((s) => s.acknowledged).length
    const sopPct = totalSop > 0 ? Math.round((ackSop / totalSop) * 100) : 100

    return [
      {
        id: 'cap-kitchen',
        label: 'Utilisasi Dapur',
        amount: `${peakSingleDayPortions.toLocaleString('id-ID')} / ${dailyKitchenCap.toLocaleString('id-ID')} Px`,
        pct: peakDailyUtilizationPct,
        isHighlight: peakDailyUtilizationPct >= 50,
        targetTab: 'profile',
      },
      {
        id: 'cap-readiness',
        label: 'Tahap Kesiapan',
        amount: `${doneReadinessSteps}/${totalReadinessSteps || 12} Langkah`,
        pct: readinessStepsPct,
        isHighlight: false,
        targetTab: 'readiness',
      },
      {
        id: 'cap-qc',
        label: 'Lolos QC Menu',
        amount: `${passedManifestItems}/${totalManifestItems} Menu`,
        pct: qcPassPct,
        isHighlight: qcPassPct >= 80,
        targetTab: 'menu_manifest',
      },
      {
        id: 'cap-loading',
        label: 'Slot Loading',
        amount: `${doneLoadingSlots}/${totalLoadingSlots} Tahap`,
        pct: loadingPct,
        isHighlight: false,
        targetTab: 'loading_schedule',
      },
      {
        id: 'cap-payout',
        label: 'Pencairan Termin',
        amount: `${payoutSummary.settledCount}/${payoutSummary.totalCount} Lunas`,
        pct: payoutSummary.settledPct,
        isHighlight: false,
        targetTab: 'payout',
      },
      {
        id: 'cap-sop',
        label: 'Kepatuhan SOP',
        amount: `${ackSop}/${totalSop} Klausul`,
        pct: sopPct,
        isHighlight: false,
        targetTab: 'sop_standards',
      },
    ]
  }, [
    activeReadiness,
    avgReadinessPct,
    menuManifests,
    loadingSchedules,
    sopChecklist,
    peakSingleDayPortions,
    dailyKitchenCap,
    peakDailyUtilizationPct,
    payoutSummary,
  ])

  // Matriks Kalender 30 Hari dari Database (events + date_blocks + pending jobs)
  const calendarHeatmapDays = useMemo(() => {
    const days = []
    const start = new Date(anchorDate)
    for (let i = 0; i < 30; i++) {
      const current = new Date(start)
      current.setDate(start.getDate() + i)
      const iso = formatDateIso(current)

      const scheduledEv = allScheduledEvents.find((e) => e.event_date === iso)
      const pendingJob = pendingJobsRaw.find((j) => j.event_date === iso)
      const blockEntry = dateBlocks.find((b) => b.date === iso && b.is_blocked)

      let level = 0
      let statusLabel = 'Tersedia (Slot Terbuka)'
      let detailTitle = 'Belum ada jadwal acara atau blokir dapur'
      let portions = 0

      if (scheduledEv) {
        level = 3
        statusLabel = 'Terkunci Acara Resmi WO'
        detailTitle = `${scheduledEv.wedding_title} • ${scheduledEv.venue}`
        portions = Number(scheduledEv.portions_or_units || 0)
      } else if (blockEntry && !blockEntry.is_wo_event) {
        level = 2
        statusLabel = 'Diblokir Mitra (Luar WO)'
        detailTitle = blockEntry.reason || 'Full booked pesanan mandiri mitra'
      } else if (pendingJob) {
        level = 1
        statusLabel = 'Permintaan Booking Baru (Menunggu)'
        detailTitle = `${pendingJob.wedding_title} • ${pendingJob.venue}`
        portions = Number(pendingJob.portions || 0)
      }

      days.push({
        iso,
        dayNum: String(current.getDate()).padStart(2, '0'),
        monthShort: current.toLocaleDateString('id-ID', { month: 'short' }),
        level,
        statusLabel,
        detailTitle,
        portions,
        scheduledEv,
        pendingJob,
        blockEntry,
      })
    }
    return days
  }, [anchorDate, allScheduledEvents, pendingJobsRaw, dateBlocks])

  const activeInspectedDay = useMemo(() => {
    if (selectedHeatmapDate) {
      const found = calendarHeatmapDays.find(
        (d) => d.iso === selectedHeatmapDate
      )
      if (found) return found
    }
    return (
      calendarHeatmapDays.find((d) => d.level > 0) || calendarHeatmapDays[0]
    )
  }, [calendarHeatmapDays, selectedHeatmapDate])

  async function handleManualSync() {
    setIsSyncing(true)
    try {
      await reloadDashboard()
      showToast(
        'Data dashboard berhasil disinkronkan dari database Supabase.',
        'success'
      )
    } catch {
      showToast('Gagal menyinkronkan data dari server.', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleDirectAcceptJob(job) {
    setProcessingJobId(job.id)
    try {
      await vendorService.actionJob(
        job.id,
        'terima',
        'Disetujui langsung oleh mitra dari Overview Dashboard.'
      )
      await reloadDashboard()
      showToast(
        `Pesanan "${job.wedding_title}" berhasil diterima dan dikunci ke Kalender & Kesiapan Produksi.`,
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Gagal menerima pesanan.', 'error')
    } finally {
      setProcessingJobId(null)
    }
  }

  async function handleConfirmRejectJob(e) {
    e.preventDefault()
    if (!rejectingJob) return
    const cleanReason = rejectReason.trim()
    if (!cleanReason) {
      showToast('Alasan penolakan wajib diisi untuk koordinasi WO.', 'error')
      return
    }
    setProcessingJobId(rejectingJob.id)
    try {
      await vendorService.actionJob(rejectingJob.id, 'tolak', cleanReason)
      await reloadDashboard()
      showToast(
        `Pesanan "${rejectingJob.wedding_title}" telah ditolak dengan catatan resmi.`,
        'success'
      )
      setRejectingJob(null)
      setRejectReason('')
    } catch (err) {
      showToast(err.message || 'Gagal menolak pesanan.', 'error')
    } finally {
      setProcessingJobId(null)
    }
  }

  const lastSyncedRaw = dashboardData?.last_synced_at
  const syncTimeFormatted = useMemo(() => {
    if (!lastSyncedRaw) return 'Aktif'
    const dt = new Date(lastSyncedRaw)
    if (Number.isNaN(dt.getTime())) return 'Aktif'
    return dt.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [lastSyncedRaw])

  return (
    <div className="vendor-page-container vendor-dashboard-stage">
      {/* Title Header Section */}
      <div className="vendor-title-row smarthr-title-row">
        <div className="vendor-title-left smarthr-title-left">
          <div className="vendor-breadcrumb smarthr-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span>Portal Mitra</span>
            <span className="smarthr-crumb-sep">&gt;</span>
            <span className="smarthr-crumb-active">Overview Operasional</span>
          </div>
          <h1 className="vendor-main-title smarthr-main-title">
            Dashboard Operasional {profile.name || 'Vendor Mitra'}
          </h1>
          <p className="vendor-header-subtitle">
            Kendali real-time jadwal penugasan WO, kesiapan produksi dapur, manifest QC, dan pencairan termin mitra.
          </p>
        </div>

        <div className="vendor-title-badges">
          <button
            type="button"
            className="vendor-status-chip chip-green"
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{ cursor: 'pointer' }}
            title="Klik untuk menyinkronkan ulang seluruh tabel dari Supabase PostgreSQL"
          >
            <span className="chip-indicator green-dot" />
            <span>
              {isSyncing
                ? 'Menyinkronkan DB...'
                : `DB Sync: ${syncTimeFormatted} WIB`}
            </span>
          </button>

          <button
            type="button"
            className="vendor-status-chip chip-amber"
            onClick={() => setActiveTab('jobs')}
            title="Klik untuk membuka tab Manajemen Pekerjaan"
          >
            <span className="chip-indicator amber-dot" />
            <span>
              Booking Baru: <strong>{pendingJobsRaw.length} Menunggu</strong>
            </span>
          </button>
        </div>
      </div>

      {/* Dedicated Filter & Timeframe Toolbar */}
      <div className="vendor-overview-toolbar">
        <div className="vendor-filter-pill-group">
          {['Pekan Ini', 'Bulan Ini', 'Semua Jadwal'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`vendor-toolbar-pill ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
          {searchQuery && (
            <button
              type="button"
              className="vendor-toolbar-pill active"
              onClick={() => setSearchQuery('')}
              title="Hapus filter pencarian"
            >
              Filter: &ldquo;{searchQuery}&rdquo; ✕
            </button>
          )}
        </div>

        <div className="vendor-toolbar-meta">
          <span className="meta-info-text">
            Entitas: <strong>{profile.legal_name || profile.name || '-'}</strong> • Kategori:{' '}
            <strong>{profile.category || '-'}</strong> • ID:{' '}
            <code>{profile.id || '-'}</code>
          </span>
        </div>
      </div>

      {/* 4 Dynamic KPI Cards */}
      <div className="smarthr-kpi-grid">
        <div
          className="smarthr-kpi-card"
          onClick={() => setActiveTab('readiness')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('readiness')
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">
              Acara Terjadwal ({activeFilter})
            </span>
            <div className="smarthr-kpi-icon-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val">{filteredEvents.length} Acara</span>
            <span className="smarthr-kpi-trend trend-up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {avgReadinessPct}% Kesiapan
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">
              {fullyReadyEventsCount} siap penuh •{' '}
              {Math.max(0, filteredEvents.length - fullyReadyEventsCount)} dalam produksi
            </span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 18 Q 15 8, 28 14 T 50 6 T 68 10"
                  stroke="#16a34a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div
          className="smarthr-kpi-card"
          onClick={() => setActiveTab('jobs')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('jobs')
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Notifikasi Booking Baru</span>
            <div className="smarthr-kpi-icon-bubble ember-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val" style={{ color: '#ff5900' }}>
              {filteredPendingJobs.length} Request
            </span>
            <span className="smarthr-kpi-trend trend-amber">
              <span className="live-amber-dot" />{' '}
              {filteredPendingJobs.length > 0 ? 'Wajib Respons' : 'Terkendali'}
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">
              Nilai: {formatRupiah(pendingContractValue)} ({jobDecisionCounts.accepted} diterima)
            </span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 12 Q 18 20, 35 10 T 68 4"
                  stroke="#ff5900"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div
          className="smarthr-kpi-card"
          onClick={() => setActiveTab('menu_manifest')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('menu_manifest')
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Total Porsi Terjadwal</span>
            <div className="smarthr-kpi-icon-bubble blue-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val">
              {totalPortions.toLocaleString('id-ID')} Porsi
            </span>
            <span className="smarthr-kpi-trend trend-up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {kitchenUtilizationPct}% Kapasitas
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">
              Puncak harian: {peakSingleDayPortions.toLocaleString('id-ID')} /{' '}
              {dailyKitchenCap.toLocaleString('id-ID')} porsi
            </span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 20 Q 20 6, 40 14 T 68 8"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div
          className="smarthr-kpi-card"
          onClick={() => setActiveTab('payout')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('payout')
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="smarthr-kpi-top">
            <span className="smarthr-kpi-label">Tagihan Payout Aktif</span>
            <div className="smarthr-kpi-icon-bubble purple-bubble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
          </div>
          <div className="smarthr-kpi-value-row">
            <span className="smarthr-kpi-val">
              {formatRupiah(payoutSummary.pendingAmount)}
            </span>
            <span className="smarthr-kpi-trend trend-up">
              {payoutSummary.pendingCount} Invoice
            </span>
          </div>
          <div className="smarthr-kpi-bottom-row">
            <span className="smarthr-kpi-sub">
              Telah cair: {formatRupiah(payoutSummary.settledAmount)} ({payoutSummary.settledCount} lunas)
            </span>
            <div className="smarthr-kpi-spark">
              <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
                <path
                  d="M2 16 Q 18 12, 38 18 T 68 6"
                  stroke="#8b5cf6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Panel: Scheduled Events + Live Loading/Production Timeline */}
      <div className="smarthr-dual-panel-grid">
        <div className="smarthr-card ringkasan-acara-panel">
          <div className="smarthr-card-header">
            <div className="card-header-left">
              <h2 className="smarthr-card-title">
                Jadwal Acara &amp; Kesiapan Produksi ({filteredEvents.length})
              </h2>
              <span className="badge-readonly-tag">Tersinkron DB</span>
            </div>
            <button
              type="button"
              className="smarthr-link-btn"
              onClick={() => setActiveTab('calendar')}
            >
              Lihat di Kalender &gt;
            </button>
          </div>

          <div className="ringkasan-acara-list">
            {filteredEvents.length === 0 ? (
              <div className="overview-empty-box">
                Tidak ada acara terjadwal untuk filter <strong>{activeFilter}</strong>
                {searchQuery ? ` dengan kata kunci "${searchQuery}"` : ''}.
              </div>
            ) : (
              filteredEvents.map((ev, index) => {
                const badge = getDayBadgeParts(ev.event_date)
                const readinessObj = readinessMapByJob[ev.job_id]
                const progressPct =
                  readinessObj?.progress_percent ??
                  ev.readiness_percent ??
                  25
                const currentStatus =
                  readinessObj?.current_status ||
                  ev.readiness_status ||
                  'Bahan Mentah Siap'

                const schedObj =
                  loadingSchedules[ev.id] || loadingSchedules[ev.job_id]
                const totalSlots = schedObj?.slots?.length || 0
                const doneSlots =
                  schedObj?.slots?.filter((s) => s.completed).length || 0

                const manifestObj =
                  menuManifests[ev.id] || menuManifests[ev.job_id]
                const totalMenu = manifestObj?.items?.length || 0
                const doneMenu =
                  manifestObj?.items?.filter((m) => m.qc_checked).length || 0

                const fallbackPic =
                  fieldPics[index % Math.max(1, fieldPics.length)]
                const assignedCoordinator =
                  schedObj?.driver_lead ||
                  (fallbackPic
                    ? `${fallbackPic.name} (${fallbackPic.phone})`
                    : `${profile.pic_name || 'Koordinator Lapangan'} (${profile.phone || '-'})`)

                return (
                  <div
                    key={ev.id}
                    className={`acara-item-card ${badge.isToday ? 'acara-today' : ''}`}
                  >
                    <div className="acara-date-badge">
                      <span className="acara-day">{badge.day}</span>
                      <span className="acara-month">{badge.month}</span>
                      {badge.isToday ? (
                        <span className="acara-pill-today">Hari Ini</span>
                      ) : (
                        <span className="acara-day-name">{badge.dayName}</span>
                      )}
                    </div>
                    <div className="acara-info-col">
                      <div className="acara-title-row">
                        <strong className="acara-couple-name">
                          {ev.couple_short || ev.wedding_title}
                        </strong>
                        <span className="acara-wo-badge">
                          Kesiapan {progressPct}%
                        </span>
                      </div>
                      <div className="acara-meta-row">
                        <span className="overview-meta-inline">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {ev.venue}
                        </span>
                        <span className="overview-meta-inline">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {ev.time_slot}
                        </span>
                        <span className="overview-meta-inline">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          {Number(ev.portions_or_units).toLocaleString('id-ID')} Porsi ({ev.portion_unit_label})
                        </span>
                      </div>
                      <div className="acara-footer-row">
                        <span className="acara-pic">
                          Koordinator: {assignedCoordinator}
                        </span>
                        <div className="overview-event-actions">
                          <button
                            type="button"
                            className="overview-mini-link-btn"
                            onClick={() => setActiveTab('readiness')}
                            title="Perbarui tahapan kesiapan produksi"
                          >
                            {currentStatus}
                          </button>
                          {totalSlots > 0 && (
                            <button
                              type="button"
                              className="overview-mini-link-btn"
                              onClick={() => setActiveTab('loading_schedule')}
                              title="Buka jadwal loading dock"
                            >
                              Loading {doneSlots}/{totalSlots}
                            </button>
                          )}
                          {totalMenu > 0 && (
                            <button
                              type="button"
                              className="overview-mini-link-btn"
                              onClick={() => setActiveTab('menu_manifest')}
                              title="Buka manifest menu & QC"
                            >
                              QC {doneMenu}/{totalMenu}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="smarthr-card peak-hours-card">
          <div className="smarthr-card-header">
            <div>
              <h2 className="smarthr-card-title">
                Progres Tahapan Loading &amp; Operasional Dapur
              </h2>
              <p className="card-sub-desc">
                Realisasi penyelesaian slot operasional berdasarkan tabel loading_schedules
              </p>
            </div>
            <button
              type="button"
              className="smarthr-link-btn"
              onClick={() => setActiveTab('loading_schedule')}
            >
              Kelola Slot &gt;
            </button>
          </div>

          <div className="peak-hours-content">
            <div className="peak-hours-graph-col">
              {liveOperationalTimeline.map((item) => (
                <div
                  key={item.id}
                  className="peak-hour-item-card"
                  onClick={() => setActiveTab('loading_schedule')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveTab('loading_schedule')
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  title={`Klik untuk membuka detail slot ${item.time} (${item.title})`}
                >
                  <div className="peak-hour-header-row">
                    <div className="peak-hour-meta">
                      <span className="peak-hour-time-badge">{item.time}</span>
                      <span className="peak-hour-title-text">{item.title}</span>
                    </div>
                    <div className="peak-hour-status-badge">
                      <span className="peak-hour-count">{item.completedSlots}/{item.totalSlots} Slot</span>
                      <span
                        className="peak-hour-pct-pill"
                        style={{ color: item.color, backgroundColor: `${item.color}15` }}
                      >
                        {item.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="peak-hour-bar-track">
                    <div
                      className="peak-hour-bar-fill"
                      style={{
                        width: `${Math.max(4, item.percent)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Live Capacity Capsules + 30-Day Real Calendar Heatmap */}
      <div className="smarthr-middle-grid">
        <div className="smarthr-card storage-capsule-card">
          <div className="smarthr-card-header">
            <div>
              <h2 className="smarthr-card-title">
                Indikator Kapasitas &amp; Kepatuhan Operasional
              </h2>
              <p className="card-sub-desc">
                Kalkulasi langsung dari kesiapan dapur, QC menu, loading dock, dan termin payout
              </p>
            </div>
          </div>

          <div className="storage-capsules-container">
            {liveCapacityCapsules.map((cap) => (
              <div
                key={cap.id}
                className="capsule-col"
                onClick={() => setActiveTab(cap.targetTab)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveTab(cap.targetTab)
                  }
                }}
                style={{ cursor: 'pointer' }}
                title={`Klik untuk membuka rincian ${cap.label}`}
              >
                <span className="capsule-top-amount">{cap.amount}</span>
                <div
                  className={`capsule-tube ${
                    cap.isHighlight ? 'capsule-tube-highlight' : ''
                  }`}
                >
                  <div
                    className="capsule-tube-fill"
                    style={{ height: `${Math.max(8, cap.pct)}%` }}
                  />
                </div>
                <span className="capsule-label">
                  {cap.label} ({cap.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="smarthr-card heatmap-error-card">
          <div className="smarthr-card-header">
            <div>
              <h2 className="smarthr-card-title">
                Matriks Kalender Operasional (30 Hari)
              </h2>
              <p className="card-sub-desc">
                Status tanggal aktual dari vendor_events, vendor_jobs, dan vendor_date_blocks
              </p>
            </div>
            <div className="heatmap-legend-pills">
              <span className="legend-chip-low">Tersedia</span>
              <span className="legend-chip-mid">Menunggu / Blokir</span>
              <span className="legend-chip-high">Acara WO</span>
            </div>
          </div>

          <div className="overview-calendar-matrix-grid">
            {calendarHeatmapDays.map((day) => {
              const isSelected = activeInspectedDay?.iso === day.iso
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={`overview-cal-day-cell level-${day.level} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedHeatmapDate(day.iso)}
                  title={`${formatShortDateID(day.iso)}: ${day.statusLabel}`}
                >
                  <span className="cal-cell-num">{day.dayNum}</span>
                  <span className="cal-cell-month">{day.monthShort}</span>
                </button>
              )
            })}
          </div>

          {activeInspectedDay && (
            <div className="overview-cal-inspector">
              <div className="overview-cal-inspector-info">
                <div className="overview-cal-inspector-title">
                  <strong>{formatShortDateID(activeInspectedDay.iso)}</strong>
                  <span
                    className={`overview-cal-status-pill level-${activeInspectedDay.level}`}
                  >
                    {activeInspectedDay.statusLabel}
                  </span>
                </div>
                <div className="overview-cal-inspector-sub">
                  {activeInspectedDay.detailTitle}
                  {activeInspectedDay.portions > 0
                    ? ` (${activeInspectedDay.portions.toLocaleString('id-ID')} Porsi)`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                className="smarthr-table-action-btn"
                onClick={() =>
                  setActiveTab(
                    activeInspectedDay.level === 1 ? 'jobs' : 'calendar'
                  )
                }
              >
                {activeInspectedDay.level === 1
                  ? 'Buka di Jobs'
                  : 'Kelola di Kalender'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Booking Requests Table */}
      <div className="smarthr-card inc-logs-card">
        <div className="smarthr-card-header">
          <div className="card-header-left">
            <h2 className="smarthr-card-title">
              Notifikasi Booking Baru (Menunggu Respons Mitra)
            </h2>
            <span className="badge-pending-count">
              {filteredPendingJobs.length} Request Menunggu Keputusan
            </span>
          </div>
          <button
            type="button"
            className="smarthr-btn-orange-solid"
            onClick={() => setActiveTab('jobs')}
          >
            Buka Tab Manajemen Pekerjaan (Jobs) &gt;
          </button>
        </div>

        {rejectingJob && (
          <form
            className="overview-reject-inline-bar"
            onSubmit={handleConfirmRejectJob}
          >
            <div className="overview-reject-inline-left">
              <strong>
                Konfirmasi Tolak Pesanan: {rejectingJob.wedding_title}
              </strong>
              <span>
                Masukkan alasan penolakan agar Admin Operasional WO dapat mengalihkan ke mitra cadangan:
              </span>
            </div>
            <div className="overview-reject-inline-controls">
              <input
                type="text"
                className="op-form-input"
                placeholder="Contoh: Kapasitas dapur penuh pada tanggal tersebut..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
              <button
                type="submit"
                className="op-btn-secondary op-btn-danger-outline"
                disabled={processingJobId === rejectingJob.id}
              >
                {processingJobId === rejectingJob.id
                  ? 'Memproses...'
                  : 'Konfirmasi Tolak'}
              </button>
              <button
                type="button"
                className="op-btn-secondary"
                onClick={() => {
                  setRejectingJob(null)
                  setRejectReason('')
                }}
              >
                Batal
              </button>
            </div>
          </form>
        )}

        <div className="smarthr-table-wrapper">
          <table className="smarthr-incidents-table">
            <thead>
              <tr>
                <th>Pasangan Pengantin</th>
                <th>Tanggal Acara</th>
                <th>Lokasi Ballroom</th>
                <th>Jumlah Porsi</th>
                <th>Paket Layanan</th>
                <th>Estimasi Nilai</th>
                <th>Eksekusi Langsung</th>
              </tr>
            </thead>
            <tbody>
              {filteredPendingJobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-td">
                    Semua permintaan booking baru telah direspons oleh mitra ({jobDecisionCounts.accepted} diterima, {jobDecisionCounts.rejected} ditolak).
                  </td>
                </tr>
              ) : (
                filteredPendingJobs.map((job) => {
                  const isBusy = processingJobId === job.id
                  return (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.couple_short || job.wedding_title}</strong>
                        <div className="table-sub-detail">
                          ID: {job.id} • {job.bride_groom || 'Klien SerasiWO'}
                        </div>
                      </td>
                      <td>
                        <strong>{formatShortDateID(job.event_date)}</strong>
                        <div className="table-sub-detail">{job.time_slot}</div>
                      </td>
                      <td>{job.venue}</td>
                      <td>
                        <strong>
                          {Number(job.portions).toLocaleString('id-ID')} Porsi
                        </strong>
                        <div className="table-sub-detail">
                          {job.portion_unit_label || 'Porsi Buffet'}
                        </div>
                      </td>
                      <td>{job.package_name}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          {formatRupiah(job.payout_amount)}
                        </strong>
                      </td>
                      <td>
                        <div className="overview-job-action-group">
                          <button
                            type="button"
                            className="overview-btn-accept"
                            disabled={isBusy}
                            onClick={() => handleDirectAcceptJob(job)}
                          >
                            {isBusy ? 'Memproses...' : 'Terima Pesanan'}
                          </button>
                          <button
                            type="button"
                            className="overview-btn-reject"
                            disabled={isBusy}
                            onClick={() => {
                              setRejectingJob(job)
                              setRejectReason('')
                            }}
                          >
                            Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
