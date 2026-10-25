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

export const vendorService = {
  async getDashboard() {
    try {
      const res = await fetch(`${API_BASE}/vendor/dashboard`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          return json.data
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
      last_synced_at: new Date().toISOString(),
    }
  },

  async getCalendar() {
    try {
      const res = await fetch(`${API_BASE}/vendor/calendar`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          return json.data
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
        event_date: j.event_date,
        title: `${j.couple_short || j.wedding_title} (${j.portions.toLocaleString('id-ID')} Px)`,
        venue: j.venue,
      }))

    return {
      blocked_dates: state.date_blocks,
      wo_events: acceptedJobEvents,
    }
  },

  async toggleDateBlock(date, isBlocked, reason) {
    try {
      const res = await fetch(`${API_BASE}/vendor/calendar/toggle-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, is_blocked: isBlocked, reason }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) return json.data
      }
    } catch {
      // Fallback to local replica
    }

    const state = loadLocalState()
    const existingIdx = state.date_blocks.findIndex((b) => b.date === date)
    if (existingIdx >= 0) {
      state.date_blocks[existingIdx].is_blocked = isBlocked
      if (reason) state.date_blocks[existingIdx].reason = reason
    } else {
      state.date_blocks.push({
        id: `blk-${Date.now()}`,
        date,
        is_blocked: isBlocked,
        reason,
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
        if (json.success && json.data) {
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
    try {
      const res = await fetch(`${API_BASE}/vendor/jobs/${jobId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) return json.data
      }
    } catch {
      // Fallback to local replica
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
        if (json.success && json.data) {
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }
    return loadLocalState().readiness
  },

  async updateReadinessStep(jobId, stepId, completed, proofNote = '') {
    try {
      const res = await fetch(`${API_BASE}/vendor/readiness/${jobId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: stepId, completed, proof_note: proofNote }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) return json.data
      }
    } catch {
      // Fallback to local replica
    }

    const state = loadLocalState()
    const readinessItem = state.readiness.find((item) => item.job_id === jobId)
    if (readinessItem) {
      const step = readinessItem.steps.find((s) => s.step_id === stepId)
      if (step) {
        step.completed = completed
        if (proofNote) step.proof_note = proofNote
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
        if (json.success && json.data) {
          return json.data
        }
      }
    } catch {
      // Fallback to local replica
    }
    return loadLocalState().payouts
  },

  async createPayout(payload) {
    try {
      const res = await fetch(`${API_BASE}/vendor/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) return json.data
      }
    } catch {
      // Fallback to local replica
    }

    const state = loadLocalState()
    const newPayout = {
      id: `pay-${Date.now()}`,
      invoice_number: payload.invoice_number,
      job_id: payload.job_id || 'job-general',
      wedding_title: payload.wedding_title || 'Tagihan Layanan Mitra SerasiWO',
      event_date: new Date().toISOString().split('T')[0],
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

  async toggleLoadingSlot(eventId, slotId) {
    const state = loadLocalState()
    if (!state.loading_schedules) {
      state.loading_schedules = JSON.parse(JSON.stringify(VENDOR_LOADING_SCHEDULES))
    }
    const schedule = state.loading_schedules[eventId]
    if (schedule) {
      const slot = schedule.slots.find((s) => s.id === slotId)
      if (slot) {
        slot.completed = !slot.completed
        saveLocalState(state)
      }
    }
    return state.loading_schedules[eventId]
  },

  async toggleManifestItemQC(eventId, itemId) {
    const state = loadLocalState()
    if (!state.menu_manifests) {
      state.menu_manifests = JSON.parse(JSON.stringify(VENDOR_MENU_MANIFESTS))
    }
    const manifest = state.menu_manifests[eventId]
    if (manifest) {
      const item = manifest.items.find((i) => i.id === itemId)
      if (item) {
        item.qc_checked = !item.qc_checked
        saveLocalState(state)
      }
    }
    return state.menu_manifests[eventId]
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

  async updateVendorProfile(updatedFields) {
    const state = loadLocalState()
    state.vendor_profile = {
      ...state.vendor_profile,
      ...updatedFields,
    }
    saveLocalState(state)
    return state.vendor_profile
  },
}
