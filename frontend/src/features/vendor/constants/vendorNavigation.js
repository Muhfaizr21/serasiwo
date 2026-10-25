export const VENDOR_TAB_ROUTES = {
  overview: '/dashboard/vendor',
  calendar: '/dashboard/vendor/calendar',
  jobs: '/dashboard/vendor/jobs',
  readiness: '/dashboard/vendor/readiness',
  payout: '/dashboard/vendor/payout',
  loading_schedule: '/dashboard/vendor/loading-schedule',
  menu_manifest: '/dashboard/vendor/menu-manifest',
  field_pic: '/dashboard/vendor/field-pic',
  sop: '/dashboard/vendor/sop',
  profile: '/dashboard/vendor/profile',
  bank_account: '/dashboard/vendor/bank-account',
}

export function resolveVendorTabFromPath(pathname) {
  const normalized = pathname.replace(/\/+$/, '')
  if (normalized === '/dashboard/vendor' || normalized === '/dashboard/vendor/overview') {
    return 'overview'
  }
  const matchedEntry = Object.entries(VENDOR_TAB_ROUTES).find(
    ([, routePath]) => routePath === normalized
  )
  return matchedEntry ? matchedEntry[0] : 'overview'
}

export function resolveVendorPathFromTab(tabId) {
  return VENDOR_TAB_ROUTES[tabId] || VENDOR_TAB_ROUTES.overview
}

export const VENDOR_PRIMARY_MENU = [
  { id: 'overview', label: 'Dashboard Vendor' },
  { id: 'calendar', label: 'Kalender Ketersediaan' },
  { id: 'jobs', label: 'Manajemen Pekerjaan' },
  { id: 'readiness', label: 'Status Kesiapan' },
  { id: 'payout', label: 'Penagihan & Payout' },
]

export const VENDOR_OPERATIONAL_MENU = [
  { id: 'loading_schedule', label: 'Jadwal Loading Dapur', icon: 'clock' },
  { id: 'menu_manifest', label: 'Surat Jalan & Rincian Menu', icon: 'file' },
  { id: 'field_pic', label: 'PIC Koordinator Lapangan', icon: 'phone' },
  { id: 'sop', label: 'SOP & Standar Pelayanan WO', icon: 'shield' },
]

export const VENDOR_SETTINGS_MENU = [
  { id: 'profile', label: 'Profil Katering & Dapur', icon: 'user' },
  { id: 'bank_account', label: 'Rekening Bank Pencairan', icon: 'card' },
]
