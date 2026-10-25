const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(amount) {
  return rupiahFormatter.format(Number(amount) || 0)
}

export function formatShortDateID(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatLongDateID(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function getDayBadgeParts(dateStr) {
  const todayStr = new Date().toISOString().split('T')[0]
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return { day: '--', month: '---', dayName: '-', isToday: false }
  }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase(),
    dayName: date.toLocaleDateString('id-ID', { weekday: 'long' }),
    isToday: dateStr === todayStr,
  }
}
