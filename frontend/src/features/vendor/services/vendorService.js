import {
  createInitialVendorStore,
  VENDOR_FIELD_PICS,
  VENDOR_LOADING_SCHEDULES,
  VENDOR_MENU_MANIFESTS,
  VENDOR_SOP_CHECKLIST,
} from '../data/vendorMockData'

const API_BASE = 'http://localhost:8080/api'
const STORAGE_KEY = 'serasiwo_vendor_store_v3'

function computeVendorMetrics(state) {
  const acceptedJobs = state.jobs.filter((j) => j.status === 'diterima')
  const pendingJobs = state.jobs.filter((j) => j.status === 'menunggu')
  const pendingPayouts = state.payouts.filter(
    (p) => p.status === 'tertunda' || p.status === 'diproses'
  )
  const settledPayouts = state.payouts.filter((p) => p.status === 'dicairkan')

  return {
    weekly_events_count: state.events_this_week.length,
    new_booking_alerts: pendingJobs.length,
    total_portions_active: state.events_this_week.reduce(
      (sum, ev) => sum + (Number(ev.portions_or_units) || 0),
      0
    ),
    pending_payout_amount: pendingPayouts.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    ),
    pending_payout_count: pendingPayouts.length,
    settled_payout_amount: settledPayouts.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    ),
    accepted_jobs_count: acceptedJobs.length,
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Re-initialize store on corrupt JSON
  }
  const initial = createInitialVendorStore()
  saveLocalState(initial)
  return initial
}

function saveLocalState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota exceptions
  }
}

function normalizeWoEvents(rawEvents = []) {
  return rawEvents.map((ev) => ({
    id: ev.id || ev.job_id || `ev-${ev.event_date}`,
    job_id: ev.job_id || ev.id,
    event_date: ev.event_date,
    title:
      ev.title ||
      `${ev.couple_short || ev.wedding_title} (${(ev.portions_or_units || ev.portions || 0).toLocaleString('id-ID')} Px)`,
    wedding_title: ev.wedding_title || ev.title || 'Acara Pernikahan SerasiWO',
    bride_groom: ev.bride_groom || '',
    time_slot: ev.time_slot || '10:00 - 14:00 WIB',
    venue: ev.venue || 'Ballroom Venue SerasiWO',
    portions: ev.portions_or_units || ev.portions || 0,
    unit_label: ev.portion_unit_label || 'Porsi Buffet',
    readiness_status: ev.readiness_status || 'Dikonfirmasi',
    note: ev.note || '',
  }))
}

export const vendorService = {
  async getDashboard() {
    try {
      const [dashRes, jobsRes, calRes] = await Promise.allSettled([
        fetch(`${API_BASE}/vendor/dashboard`),
        fetch(`${API_BASE}/vendor/jobs?status=semua`),
        fetch(`${API_BASE}/vendor/calendar`),
      ])

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const json = await dashRes.value.json()
        if (json.success && json.data) {
          const local = loadLocalState()

          let liveJobs = Array.isArray(json.data.jobs) ? json.data.jobs : null
          if (!liveJobs && jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
            const jobsJson = await jobsRes.value.json()
            if (jobsJson.success && Array.isArray(jobsJson.data)) {
              liveJobs = jobsJson.data
            }
          }

          let liveBlocks = Array.isArray(json.data.date_blocks)
            ? json.data.date_blocks
            : null
          if (!liveBlocks && calRes.status === 'fulfilled' && calRes.value.ok) {
            const calJson = await calRes.value.json()
            if (calJson.success && calJson.data) {
              liveBlocks = calJson.data.blocked_dates || []
            }
          }

          const mergedProfile = {
            ...local.vendor_profile,
            ...(json.data.vendor_profile || {}),
          }
          const mergedEvents = Array.isArray(json.data.events_this_week)
            ? json.data.events_this_week
            : local.events_this_week || []
          const mergedJobs = liveJobs || local.jobs || []
          const mergedAlerts = Array.isArray(json.data.new_booking_alerts)
            ? json.data.new_booking_alerts
            : mergedJobs.filter((j) => j.status === 'menunggu')
          const mergedBlocks = liveBlocks || local.date_blocks || []
          const mergedPayouts = Array.isArray(json.data.recent_payouts)
            ? json.data.recent_payouts
            : local.payouts || []
          const mergedReadiness = Array.isArray(json.data.active_readiness)
            ? json.data.active_readiness
            : local.readiness || []
          const mergedLoading =
            json.data.loading_schedules ||
            local.loading_schedules ||
            VENDOR_LOADING_SCHEDULES
          const mergedManifests =
            json.data.menu_manifests ||
            local.menu_manifests ||
            VENDOR_MENU_MANIFESTS

          const updatedLocal = {
            ...local,
            vendor_profile: mergedProfile,
            events_this_week: mergedEvents,
            jobs: mergedJobs,
            date_blocks: mergedBlocks,
            payouts: mergedPayouts,
            readiness: mergedReadiness,
            loading_schedules: mergedLoading,
            menu_manifests: mergedManifests,
          }
          saveLocalState(updatedLocal)

          return {
            ...updatedLocal,
            ...json.data,
            vendor_profile: mergedProfile,
            events_this_week: mergedEvents,
            new_booking_alerts: mergedAlerts,
            jobs: mergedJobs,
            date_blocks: mergedBlocks,
            recent_payouts: mergedPayouts,
            active_readiness: mergedReadiness,
            loading_schedules: mergedLoading,
            menu_manifests: mergedManifests,
            field_pics: local.field_pics || VENDOR_FIELD_PICS,
            sop_checklist: local.sop_checklist || VENDOR_SOP_CHECKLIST,
            data_source: 'supabase_postgres',
            last_synced_at: json.data.last_synced_at || new Date().toISOString(),
          }
        }
      }
    } catch {
      // Fallback to local replica
    }
    const state = loadLocalState()
    return {
      vendor_profile: state.vendor_profile,
      metrics: computeVendorMetrics(state),
      events_this_week: state.events_this_week,
      new_booking_alerts: state.jobs.filter((j) => j.status === 'menunggu'),
      jobs: state.jobs,
      date_blocks: state.date_blocks,
      recent_payouts: state.payouts,
      active_readiness: state.readiness,
      loading_schedules: state.loading_schedules || VENDOR_LOADING_SCHEDULES,
      menu_manifests: state.menu_manifests || VENDOR_MENU_MANIFESTS,
      field_pics: state.field_pics || VENDOR_FIELD_PICS,
      sop_checklist: state.sop_checklist || VENDOR_SOP_CHECKLIST,
      data_source: 'local_storage',
      last_synced_at: new Date().toISOString(),
    }
  },

  async getCalendar() {
    try {
      const res = await fetch(`${API_BASE}/vendor/calendar`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const normalized = {
            blocked_dates: json.data.blocked_dates || [],
            wo_events: normalizeWoEvents(json.data.wo_events || []),
            source: 'backend_db',
          }
          const state = loadLocalState()
          state.date_blocks = normalized.blocked_dates
          saveLocalState(state)
          return normalized
        }
      }
    } catch {
      // Fallback to local replica
    }
    const state = loadLocalState()
    const acceptedJobEvents = state.jobs
      .filter((j) => j.status === 'diterima')
      .map((j) => ({
        id: j.event_id || j.id,
        job_id: j.id,
        event_date: j.event_date,
        title: `${j.couple_short || j.wedding_title} (${j.portions.toLocaleString('id-ID')} Px)`,
        wedding_title: j.wedding_title,
        bride_groom: j.bride_groom,
        time_slot: j.time_slot,
        venue: j.venue,
        portions: j.portions,
        unit_label: j.portion_unit_label,
        readiness_status: 'Terjadwal Resmi',
        note: j.menu_or_notes,
      }))

    return {
      blocked_dates: state.date_blocks,
      wo_events: normalizeWoEvents(acceptedJobEvents),
      source: 'local_storage',
    }
  },

  async toggleDateBlock(date, isBlocked, reason) {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/calendar/toggle-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, is_blocked: isBlocked, reason }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memperbarui status tanggal')
      } else {
        const state = loadLocalState()
        const idx = state.date_blocks.findIndex((b) => b.date === date)
        if (idx >= 0) {
          state.date_blocks[idx] = json.data
        } else {
          state.date_blocks.push(json.data)
        }
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    const hasWoEvent = state.jobs.some(
      (j) => j.status === 'diterima' && j.event_date === date
    )
    if (hasWoEvent) {
      throw new Error(
        `Tanggal ${date} sudah terkunci untuk acara resmi SerasiWO dan tidak dapat diblokir manual.`
      )
    }

    const existingIdx = state.date_blocks.findIndex((b) => b.date === date)
    if (existingIdx >= 0) {
      state.date_blocks[existingIdx].is_blocked = isBlocked
      if (reason !== undefined) state.date_blocks[existingIdx].reason = reason
    } else {
      state.date_blocks.push({
        id: `blk-${Date.now()}`,
        date,
        is_blocked: isBlocked,
        reason: reason || 'Full booked pesanan mandiri di luar WO',
        is_wo_event: false,
      })
    }
    saveLocalState(state)
    return { date, is_blocked: isBlocked, reason }
  },

  async getJobs(status = 'semua') {
    try {
      const res = await fetch(`${API_BASE}/vendor/jobs?status=${status}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          if (status === 'semua' || !status) {
            const state = loadLocalState()
            state.jobs = json.data
            saveLocalState(state)
          }
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }

    const state = loadLocalState()
    if (status && status !== 'semua') {
      return state.jobs.filter((j) => j.status === status)
    }
    return state.jobs
  },

  async actionJob(jobId, action, reason = '') {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/jobs/${jobId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memproses keputusan pekerjaan')
      } else if (json.data) {
        const state = loadLocalState()
        const idx = state.jobs.findIndex((j) => j.id === jobId)
        if (idx >= 0) {
          state.jobs[idx] = json.data
        } else {
          state.jobs.push(json.data)
        }
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    const job = state.jobs.find((j) => j.id === jobId)
    if (job) {
      job.status = action === 'terima' ? 'diterima' : 'ditolak'
      job.responded_at = new Date().toISOString()
      job.decision_note =
        reason || (action === 'terima' ? 'Pesanan diterima mitra.' : 'Pesanan ditolak.')
      saveLocalState(state)
    }
    return job
  },

  async getReadiness() {
    try {
      const res = await fetch(`${API_BASE}/vendor/readiness`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const state = loadLocalState()
          state.readiness = json.data
          saveLocalState(state)
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }
    return loadLocalState().readiness
  },

  async updateReadinessStep(jobId, stepId, completed, proofNote = '') {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/readiness/${jobId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: stepId, completed, proof_note: proofNote }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memperbarui status kesiapan')
      } else if (json.data) {
        const state = loadLocalState()
        const idx = state.readiness.findIndex((item) => item.job_id === jobId)
        if (idx >= 0) {
          state.readiness[idx] = json.data
        } else {
          state.readiness.push(json.data)
        }
        const linkedEvent = state.events_this_week.find((ev) => ev.job_id === jobId)
        if (linkedEvent) {
          linkedEvent.readiness_status = json.data.current_status
          linkedEvent.readiness_percent = json.data.progress_percent
        }
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    const readinessItem = state.readiness.find((item) => item.job_id === jobId)
    if (readinessItem) {
      if (stepId === 'all_complete') {
        readinessItem.steps.forEach((s) => {
          s.completed = true
          s.completed_at = s.completed_at || new Date().toISOString()
          if (proofNote) s.proof_note = proofNote
        })
      } else if (stepId === 'reset_all') {
        readinessItem.steps.forEach((s) => {
          s.completed = false
          s.completed_at = null
          s.proof_note = ''
        })
      } else {
        const targetIdx = readinessItem.steps.findIndex((s) => s.step_id === stepId)
        if (targetIdx >= 0) {
          if (completed) {
            for (let p = 0; p < targetIdx; p++) {
              if (!readinessItem.steps[p].completed) {
                throw new Error(
                  `Tahapan '${readinessItem.steps[p].title}' (Langkah ${p + 1}) wajib diselesaikan terlebih dahulu.`
                )
              }
            }
            readinessItem.steps[targetIdx].completed = true
            readinessItem.steps[targetIdx].completed_at = new Date().toISOString()
            if (proofNote) readinessItem.steps[targetIdx].proof_note = proofNote
          } else {
            for (let i = targetIdx; i < readinessItem.steps.length; i++) {
              readinessItem.steps[i].completed = false
              readinessItem.steps[i].completed_at = null
            }
          }
        }
      }
      const doneCount = readinessItem.steps.filter((s) => s.completed).length
      readinessItem.progress_percent = Math.round(
        (doneCount * 100) / readinessItem.steps.length
      )

      const statusLabels = [
        'Menunggu Persiapan',
        'Bahan Mentah Siap',
        'Loading & Pengangkutan',
        'Standby di Venue',
        'Selesai & Serah Terima',
      ]
      readinessItem.current_status = statusLabels[doneCount] || statusLabels[0]

      const linkedEvent = state.events_this_week.find((ev) => ev.job_id === jobId)
      if (linkedEvent) {
        linkedEvent.readiness_status = readinessItem.current_status
        linkedEvent.readiness_percent = readinessItem.progress_percent
      }

      saveLocalState(state)
      return readinessItem
    }
    return null
  },

  async getPayouts() {
    try {
      const res = await fetch(`${API_BASE}/vendor/payouts`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const state = loadLocalState()
          state.payouts = json.data
          saveLocalState(state)
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }
    return loadLocalState().payouts
  },

  async createPayout(payload) {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal mengunggah berkas tagihan')
      } else if (json.data) {
        const state = loadLocalState()
        state.payouts.unshift(json.data)
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    const newPayout = {
      id: `pay-${Date.now()}`,
      invoice_number: payload.invoice_number,
      job_id: payload.job_id || 'job-general',
      wedding_title: payload.wedding_title || 'Tagihan Layanan Mitra SerasiWO',
      event_date: payload.event_date || new Date().toISOString().split('T')[0],
      amount: parseFloat(payload.amount) || 0,
      bank_name: payload.bank_name || state.vendor_profile.bank_name,
      account_holder: payload.account_holder || state.vendor_profile.account_holder,
      account_number: payload.account_number || state.vendor_profile.account_number,
      invoice_doc_url:
        payload.invoice_doc_url || 'https://serasiwo.storage/invoices/sample.pdf',
      status: 'tertunda',
      status_label: 'Tertunda (Menunggu Verifikasi WO)',
      submitted_at: new Date().toISOString(),
      notes: payload.notes || '',
    }
    state.payouts.unshift(newPayout)
    saveLocalState(state)
    return newPayout
  },

  async actionPayout(payoutId, action, notes = '') {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/payouts/${payoutId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memperbarui status tagihan')
      } else {
        const state = loadLocalState()
        if (action === 'batalkan') {
          state.payouts = state.payouts.filter((p) => p.id !== payoutId)
        } else if (json.data) {
          const idx = state.payouts.findIndex((p) => p.id === payoutId)
          if (idx >= 0) {
            state.payouts[idx] = json.data
          }
        }
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    const idx = state.payouts.findIndex((p) => p.id === payoutId)
    if (idx >= 0) {
      if (action === 'batalkan') {
        const [removed] = state.payouts.splice(idx, 1)
        saveLocalState(state)
        return removed
      }
      if (action === 'verifikasi' || action === 'proses') {
        state.payouts[idx].status = 'diproses'
        state.payouts[idx].status_label = 'Sedang Diproses Keuangan WO'
      } else if (action === 'cairkan') {
        state.payouts[idx].status = 'dicairkan'
        state.payouts[idx].status_label = 'Dicairkan (Lunas)'
        state.payouts[idx].disbursed_at = new Date().toISOString()
      }
      if (notes) {
        state.payouts[idx].notes = notes
      }
      saveLocalState(state)
      return state.payouts[idx]
    }
    return null
  },

  async getLoadingSchedules() {
    try {
      const res = await fetch(`${API_BASE}/vendor/loading-schedules`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const state = loadLocalState()
          state.loading_schedules = json.data
          saveLocalState(state)
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }
    const state = loadLocalState()
    return state.loading_schedules || VENDOR_LOADING_SCHEDULES
  },

  async toggleLoadingSlot(eventId, slotId, options = {}) {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/loading-schedules/${eventId}/slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: slotId,
          completed: options.completed,
          note: options.note || '',
          fleet_assigned: options.fleet_assigned || '',
          driver_lead: options.driver_lead || '',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memperbarui jadwal loading')
      } else if (json.data) {
        const state = loadLocalState()
        if (!state.loading_schedules) {
          state.loading_schedules = JSON.parse(JSON.stringify(VENDOR_LOADING_SCHEDULES))
        }
        state.loading_schedules[eventId] = json.data
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    if (!state.loading_schedules) {
      state.loading_schedules = JSON.parse(JSON.stringify(VENDOR_LOADING_SCHEDULES))
    }
    const schedule = state.loading_schedules[eventId]
    if (schedule) {
      if (slotId === 'update_fleet') {
        if (options.fleet_assigned) schedule.fleet_assigned = options.fleet_assigned
        if (options.driver_lead) schedule.driver_lead = options.driver_lead
      } else if (slotId === 'all_complete') {
        schedule.slots.forEach((s) => {
          s.completed = true
          s.completed_at = s.completed_at || 'Hari ini'
        })
      } else if (slotId === 'reset_all') {
        schedule.slots.forEach((s) => {
          s.completed = false
          s.completed_at = ''
          s.note = ''
        })
      } else {
        const slot = schedule.slots.find((s) => s.id === slotId)
        if (slot) {
          slot.completed =
            options.completed !== undefined ? options.completed : !slot.completed
          if (options.note !== undefined) slot.note = options.note
        }
      }
      saveLocalState(state)
    }
    return state.loading_schedules[eventId]
  },

  async getMenuManifests() {
    try {
      const res = await fetch(`${API_BASE}/vendor/menu-manifests`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const state = loadLocalState()
          state.menu_manifests = json.data
          saveLocalState(state)
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }
    const state = loadLocalState()
    return state.menu_manifests || VENDOR_MENU_MANIFESTS
  },

  async updateMenuManifest(eventId, payload = {}) {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/menu-manifests/${eventId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memperbarui manifest hidangan')
      } else if (json.data) {
        const state = loadLocalState()
        if (!state.menu_manifests) {
          state.menu_manifests = JSON.parse(JSON.stringify(VENDOR_MENU_MANIFESTS))
        }
        state.menu_manifests[eventId] = json.data
        saveLocalState(state)
        return json.data
      }
    } catch {
      // Fallback to local replica when backend server is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    if (!state.menu_manifests) {
      state.menu_manifests = JSON.parse(JSON.stringify(VENDOR_MENU_MANIFESTS))
    }
    const manifest = state.menu_manifests[eventId]
    if (manifest) {
      const action = payload.action || 'toggle_qc'
      const nowTime =
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'

      if (action === 'update_logistics') {
        if (payload.vehicle_plate) manifest.vehicle_plate = payload.vehicle_plate
        if (payload.driver_phone) manifest.driver_phone = payload.driver_phone
        if (payload.departure_time) manifest.departure_time = payload.departure_time
      } else if (action === 'all_complete') {
        manifest.items.forEach((item) => {
          item.qc_checked = true
          item.qc_checked_at = item.qc_checked_at || nowTime
        })
      } else if (action === 'reset_all') {
        manifest.items.forEach((item) => {
          item.qc_checked = false
          item.qc_checked_at = ''
        })
      } else if (action === 'add_item') {
        manifest.items.push({
          id: `m-${Date.now()}`,
          category: payload.category || 'Buffet Utama',
          name: payload.name || 'Hidangan Tambahan',
          qty: payload.qty || `${manifest.total_portions} Porsi`,
          serving_temp: payload.serving_temp || 'Panas (>= 65°C)',
          qc_checked: false,
          qc_checked_at: '',
          notes: payload.notes || '',
        })
      } else if (action === 'delete_item') {
        manifest.items = manifest.items.filter((i) => i.id !== payload.item_id)
      } else {
        const item = manifest.items.find((i) => i.id === payload.item_id)
        if (item) {
          if (action === 'toggle_qc') {
            item.qc_checked =
              payload.qc_checked !== undefined ? payload.qc_checked : !item.qc_checked
            item.qc_checked_at = item.qc_checked ? nowTime : ''
          }
          if (payload.notes !== undefined) item.notes = payload.notes
          if (payload.serving_temp) item.serving_temp = payload.serving_temp
          if (payload.qty) item.qty = payload.qty
        }
      }
      saveLocalState(state)
    }
    return state.menu_manifests[eventId]
  },

  async toggleManifestItemQC(eventId, itemId, options = {}) {
    return this.updateMenuManifest(eventId, {
      action: options.action || 'toggle_qc',
      item_id: itemId,
      ...options,
    })
  },

  async toggleSopAcknowledgement(sopId) {
    const state = loadLocalState()
    if (!state.sop_checklist) {
      state.sop_checklist = JSON.parse(JSON.stringify(VENDOR_SOP_CHECKLIST))
    }
    const item = state.sop_checklist.find((s) => s.id === sopId)
    if (item) {
      item.acknowledged = !item.acknowledged
      saveLocalState(state)
    }
    return state.sop_checklist
  },

  async getVendorProfile() {
    try {
      const res = await fetch(`${API_BASE}/vendor/profile`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const state = loadLocalState()
          state.vendor_profile = {
            ...state.vendor_profile,
            ...json.data,
          }
          saveLocalState(state)
          return state.vendor_profile
        }
      }
    } catch {
      // Fallback to local replica
    }
    const state = loadLocalState()
    return state.vendor_profile
  },

  async updateVendorProfile(updatedFields) {
    let apiError = null
    try {
      const res = await fetch(`${API_BASE}/vendor/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        apiError = new Error(json.message || 'Gagal memperbarui profil vendor')
      } else if (json.data) {
        const state = loadLocalState()
        state.vendor_profile = {
          ...state.vendor_profile,
          ...json.data,
        }
        saveLocalState(state)
        return state.vendor_profile
      }
    } catch {
      // Fallback to local replica if backend is unreachable
    }

    if (apiError) {
      throw apiError
    }

    const state = loadLocalState()
    state.vendor_profile = {
      ...state.vendor_profile,
      ...updatedFields,
    }
    saveLocalState(state)
    return state.vendor_profile
  },
}
