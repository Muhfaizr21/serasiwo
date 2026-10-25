import { formatRupiah, formatShortDateID } from './vendorFormatters'

function escapePdfText(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ')
}

/**
 * Menghasilkan dokumen PDF 1.4 asli (vektor + tipografi) untuk Kwitansi & Faktur Tagihan Mitra
 * tanpa memerlukan library eksternal. Dapat dibuka langsung di macOS Preview, Safari, Chrome, dan Adobe Acrobat.
 */
export function downloadPayoutReceiptPdf(p) {
  const statusUpper = (p.status_label || p.status || 'TERTUNDA').toUpperCase()
  const isPaid = p.status === 'dicairkan'
  const submittedStr = formatShortDateID(p.submitted_at)
  const disbursedStr = p.disbursed_at
    ? formatShortDateID(p.disbursed_at)
    : 'Menunggu Jadwal Batch Keuangan WO'
  const amountFormatted = formatRupiah(p.amount)

  const ops = []

  // 1. Background & Header Banner (Dark Slate + Ember Accent Bar)
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 720 515 80 re f')
  ops.push('1 0.35 0 rg')
  ops.push('40 716 515 4 re f')

  // Header Title Text
  ops.push('BT')
  ops.push('/F2 16 Tf')
  ops.push('1 1 1 rg')
  ops.push('58 768 Td')
  ops.push(`(${escapePdfText('SERASI WEDDING ORGANIZER (SERASIWO)')}) Tj`)
  ops.push('/F1 10 Tf')
  ops.push('0.82 0.84 0.88 rg')
  ops.push('0 -18 Td')
  ops.push(
    `(${escapePdfText('Kwitansi Resmi & Bukti Pengajuan Tagihan Mitra Katering')}) Tj`
  )
  ops.push('0 -14 Td')
  ops.push(
    `(${escapePdfText('Database Terverifikasi: Supabase PostgreSQL Production')}) Tj`
  )
  ops.push('ET')

  // Status Stamp Box in Header Right
  if (isPaid) {
    ops.push('0.13 0.77 0.37 rg')
  } else {
    ops.push('0.96 0.62 0.04 rg')
  }
  ops.push('415 748 122 28 re f')
  ops.push('BT')
  ops.push('/F2 10 Tf')
  ops.push('1 1 1 rg')
  ops.push('426 758 Td')
  ops.push(`(${escapePdfText(isPaid ? 'LUNAS / DICAIRKAN' : 'DALAM VERIFIKASI')}) Tj`)
  ops.push('ET')

  // 2. Metadata Box (Invoice Info)
  ops.push('0.97 0.97 0.98 rg')
  ops.push('40 595 515 105 re f')
  ops.push('0.88 0.89 0.91 RG')
  ops.push('1 w')
  ops.push('40 595 515 105 re S')

  const drawLabelValue = (xLabel, xVal, y, label, val, boldVal = false) => {
    ops.push('BT')
    ops.push('/F1 9.5 Tf')
    ops.push('0.42 0.45 0.50 rg')
    ops.push(`${xLabel} ${y} Td`)
    ops.push(`(${escapePdfText(label)}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push(`${boldVal ? '/F2' : '/F1'} 10 Tf`)
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`${xVal} ${y} Td`)
    ops.push(`(${escapePdfText(val)}) Tj`)
    ops.push('ET')
  }

  drawLabelValue(56, 175, 678, 'Nomor Invoice', `: ${p.invoice_number}`, true)
  drawLabelValue(56, 175, 658, 'ID Transaksi DB', `: ${p.id}`)
  drawLabelValue(56, 175, 638, 'Kode Pekerjaan', `: ${p.job_id || 'job-general'}`)
  drawLabelValue(56, 175, 618, 'Tanggal Pengajuan', `: ${submittedStr}`)

  drawLabelValue(310, 415, 678, 'Status Tagihan', `: ${statusUpper}`, true)
  drawLabelValue(310, 415, 658, 'Tanggal Acara', `: ${p.event_date || '-'}`)
  drawLabelValue(310, 415, 638, 'Tanggal Cair', `: ${disbursedStr}`)
  drawLabelValue(310, 415, 618, 'Mitra Vendor', ': CV Berkah Rasa Nusantara')

  // 3. Section: Rincian Pekerjaan & Tagihan
  ops.push('BT')
  ops.push('/F2 11 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 570 Td')
  ops.push(`(${escapePdfText('RINCIAN TAGIHAN LAYANAN & REKENING PENCAIRAN')}) Tj`)
  ops.push('ET')

  // Table Header
  ops.push('0.93 0.94 0.96 rg')
  ops.push('40 536 515 24 re f')
  ops.push('0.84 0.86 0.89 RG')
  ops.push('40 536 515 24 re S')

  ops.push('BT')
  ops.push('/F2 9.5 Tf')
  ops.push('0.20 0.23 0.28 rg')
  ops.push('52 545 Td')
  ops.push(`(${escapePdfText('DESKRIPSI PEKERJAAN / ACARA PERNIKAHAN')}) Tj`)
  ops.push('360 0 Td')
  ops.push(`(${escapePdfText('NOMINAL BERSIH (IDR)')}) Tj`)
  ops.push('ET')

  // Table Row
  ops.push('1 1 1 rg')
  ops.push('40 486 515 50 re f')
  ops.push('0.84 0.86 0.89 RG')
  ops.push('40 486 515 50 re S')

  ops.push('BT')
  ops.push('/F2 11 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('52 516 Td')
  ops.push(`(${escapePdfText(p.wedding_title)}) Tj`)
  ops.push('/F1 9 Tf')
  ops.push('0.42 0.45 0.50 rg')
  ops.push('0 -16 Td')
  ops.push(
    `(${escapePdfText(`Lampiran Berkas: ${p.invoice_doc_url || '-'}`)}) Tj`
  )
  ops.push('ET')

  ops.push('BT')
  ops.push('/F2 13 Tf')
  ops.push('0.85 0.28 0.02 rg')
  ops.push('412 510 Td')
  ops.push(`(${escapePdfText(amountFormatted)}) Tj`)
  ops.push('ET')

  // 4. Bank & Notes Box
  ops.push('0.98 0.98 0.99 rg')
  ops.push('40 375 515 95 re f')
  ops.push('0.86 0.88 0.91 RG')
  ops.push('40 375 515 95 re S')

  drawLabelValue(56, 195, 448, 'Bank Tujuan Transfer', `: ${p.bank_name}`, true)
  drawLabelValue(56, 195, 428, 'Nomor Rekening Tujuan', `: ${p.account_number}`, true)
  drawLabelValue(56, 195, 408, 'Nama Pemilik Rekening', `: ${p.account_holder}`)
  drawLabelValue(
    56,
    195,
    388,
    'Catatan Verifikasi WO',
    `: ${(p.notes || 'Telah diverifikasi sesuai kontrak kerja mitra.').slice(0, 68)}`
  )

  // 5. Footer Signature & Verification Stamp
  ops.push('0.88 0.89 0.91 RG')
  ops.push('40 345 m 555 345 l S')

  ops.push('BT')
  ops.push('/F1 8.5 Tf')
  ops.push('0.45 0.48 0.52 rg')
  ops.push('40 326 Td')
  ops.push(
    `(${escapePdfText('Dokumen kwitansi elektronik ini diterbitkan secara sah oleh Sistem Operasional & Otorisasi SerasiWO.')}) Tj`
  )
  ops.push('0 -13 Td')
  ops.push(
    `(${escapePdfText(`Dicetak pada: ${new Date().toLocaleString('id-ID')} WIB | Referensi Database: ${p.id}`)}) Tj`
  )
  ops.push('ET')

  const contentStream = ops.join('\n')
  const streamBytesLength = new TextEncoder().encode(contentStream).length

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  let pdfString = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdfString.length)
    pdfString += obj
  }

  const xrefOffset = pdfString.length
  pdfString += `xref\n0 ${objects.length + 1}\n`
  pdfString += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0')
    pdfString += `${padded} 00000 n \n`
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdfString], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    `Kwitansi_${p.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Menghasilkan dokumen PDF 1.4 resmi untuk Surat Izin Masuk Loading Dock (SIM-D)
 */
export function downloadLoadingPassPdf(schedule, activeEvent) {
  const weddingTitle = activeEvent?.wedding_title || 'Acara Pernikahan SerasiWO'
  const eventDate = activeEvent?.event_date || '-'
  const timeSlot = activeEvent?.time_slot || '10:00 - 14:00 WIB'
  const venue = activeEvent?.venue || 'Ballroom Venue SerasiWO'
  const portions = activeEvent?.portions_or_units || activeEvent?.portions || 0

  const ops = []

  // Header Banner
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 720 515 80 re f')
  ops.push('1 0.35 0 rg')
  ops.push('40 716 515 4 re f')

  ops.push('BT')
  ops.push('/F2 15 Tf')
  ops.push('1 1 1 rg')
  ops.push('56 768 Td')
  ops.push(`(${escapePdfText('SURAT IZIN MASUK LOADING DOCK (SIM-D)')}) Tj`)
  ops.push('/F1 10 Tf')
  ops.push('0.82 0.84 0.88 rg')
  ops.push('0 -18 Td')
  ops.push(
    `(${escapePdfText('Otorisasi Logistik Dapur & Armada Katering - Serasi Wedding Organizer')}) Tj`
  )
  ops.push('0 -14 Td')
  ops.push(
    `(${escapePdfText(`Acara: ${weddingTitle} | Venue: ${venue}`)}) Tj`
  )
  ops.push('ET')

  // Security Pass Badge
  ops.push('0.13 0.77 0.37 rg')
  ops.push('395 748 145 28 re f')
  ops.push('BT')
  ops.push('/F2 9.5 Tf')
  ops.push('1 1 1 rg')
  ops.push('405 758 Td')
  ops.push(`(${escapePdfText(`PASS: ${schedule.security_pass_code}`)}) Tj`)
  ops.push('ET')

  // Technical Specification Box
  ops.push('0.97 0.97 0.98 rg')
  ops.push('40 585 515 115 re f')
  ops.push('0.88 0.89 0.91 RG')
  ops.push('1 w')
  ops.push('40 585 515 115 re S')

  const drawField = (xL, xV, y, label, val, bold = false) => {
    ops.push('BT')
    ops.push('/F1 9 Tf')
    ops.push('0.42 0.45 0.50 rg')
    ops.push(`${xL} ${y} Td`)
    ops.push(`(${escapePdfText(label)}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push(`${bold ? '/F2' : '/F1'} 9.5 Tf`)
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`${xV} ${y} Td`)
    ops.push(`(${escapePdfText(String(val || '-').slice(0, 52))}) Tj`)
    ops.push('ET')
  }

  drawField(54, 175, 680, 'Kode Security Pass', `: ${schedule.security_pass_code}`, true)
  drawField(54, 175, 660, 'Gerbang Loading Dock', `: ${schedule.dock_gate}`, true)
  drawField(54, 175, 640, 'Batas Tinggi Armada', `: ${schedule.max_vehicle_height}`)
  drawField(54, 175, 620, 'Area Staging & Pantri', `: ${schedule.staging_area}`)
  drawField(54, 175, 600, 'Armada Terjadwal', `: ${schedule.fleet_assigned}`, true)

  drawField(335, 425, 680, 'Tanggal Acara', `: ${eventDate}`, true)
  drawField(335, 425, 660, 'Jam Resepsi', `: ${timeSlot}`)
  drawField(335, 425, 640, 'Kapasitas Jamuan', `: ${portions} Porsi`)
  drawField(335, 425, 620, 'Kekuatan Kru', `: ${schedule.crew_count} Personel`)
  drawField(335, 425, 600, 'Pimpinan Sopir', `: ${schedule.driver_lead}`)

  // Rundown Table Heading
  ops.push('BT')
  ops.push('/F2 11 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 562 Td')
  ops.push(`(${escapePdfText('RUNDOWN TEKNIS BONGKAR MUAT & INSTALASI PRASMANAN')}) Tj`)
  ops.push('ET')

  // Table Header
  ops.push('0.93 0.94 0.96 rg')
  ops.push('40 532 515 22 re f')
  ops.push('0.84 0.86 0.89 RG')
  ops.push('40 532 515 22 re S')

  ops.push('BT')
  ops.push('/F2 8.5 Tf')
  ops.push('0.20 0.23 0.28 rg')
  ops.push('48 540 Td')
  ops.push('(JAM TARGET) Tj')
  ops.push('72 0 Td')
  ops.push('(TAHAPAN & AKTIVITAS LAPANGAN) Tj')
  ops.push('245 0 Td')
  ops.push('(PIC PENGAWAS) Tj')
  ops.push('105 0 Td')
  ops.push('(STATUS) Tj')
  ops.push('ET')

  let currentY = 532
  const slots = schedule.slots || []
  slots.forEach((sl) => {
    const rowH = 38
    currentY -= rowH
    ops.push('1 1 1 rg')
    ops.push(`40 ${currentY} 515 ${rowH} re f`)
    ops.push('0.86 0.88 0.91 RG')
    ops.push(`40 ${currentY} 515 ${rowH} re S`)

    ops.push('BT')
    ops.push('/F2 9 Tf')
    ops.push('0.85 0.28 0.02 rg')
    ops.push(`48 ${currentY + 22} Td`)
    ops.push(`(${escapePdfText(sl.time)}) Tj`)
    ops.push('/F1 7.5 Tf')
    ops.push('0.45 0.48 0.52 rg')
    ops.push('0 -11 Td')
    ops.push(`(${escapePdfText(sl.phase)}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 9 Tf')
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`120 ${currentY + 22} Td`)
    ops.push(`(${escapePdfText(String(sl.title).slice(0, 44))}) Tj`)
    ops.push('/F1 7.5 Tf')
    ops.push('0.42 0.45 0.50 rg')
    ops.push('0 -11 Td')
    ops.push(
      `(${escapePdfText(String(sl.note || sl.detail || '').slice(0, 52))}) Tj`
    )
    ops.push('ET')

    ops.push('BT')
    ops.push('/F1 8 Tf')
    ops.push('0.20 0.23 0.28 rg')
    ops.push(`365 ${currentY + 16} Td`)
    ops.push(`(${escapePdfText(String(sl.pic).slice(0, 22))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8.5 Tf')
    if (sl.completed) {
      ops.push('0.09 0.64 0.29 rg')
      ops.push(`470 ${currentY + 16} Td`)
      ops.push(`(${escapePdfText(`SELESAI ${sl.completed_at || ''}`.trim())}) Tj`)
    } else {
      ops.push('0.71 0.33 0.04 rg')
      ops.push(`470 ${currentY + 16} Td`)
      ops.push('(MENUNGGU) Tj')
    }
    ops.push('ET')
  })

  ops.push('BT')
  ops.push('/F1 8.5 Tf')
  ops.push('0.45 0.48 0.52 rg')
  ops.push(`40 ${currentY - 26} Td`)
  ops.push(
    `(${escapePdfText('Tunjukkan dokumen SIM-D ini kepada petugas keamanan loading dock gedung saat kedatangan armada.')}) Tj`
  )
  ops.push('ET')

  const contentStream = ops.join('\n')
  const streamBytesLength = new TextEncoder().encode(contentStream).length

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  let pdfString = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdfString.length)
    pdfString += obj
  }

  const xrefOffset = pdfString.length
  pdfString += `xref\n0 ${objects.length + 1}\n`
  pdfString += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0')
    pdfString += `${padded} 00000 n \n`
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdfString], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    `SIM_D_${String(schedule.security_pass_code || 'LOADING').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Menghasilkan dokumen PDF 1.4 resmi untuk Surat Jalan & Manifest Hidangan Katering (HACCP & QC)
 */
export function downloadMenuManifestPdf(manifest, activeEvent) {
  const weddingTitle = activeEvent?.wedding_title || 'Acara Pernikahan SerasiWO'
  const eventDate = activeEvent?.event_date || '-'
  const timeSlot = activeEvent?.time_slot || '10:00 - 14:00 WIB'
  const venue = activeEvent?.venue || 'Ballroom Venue SerasiWO'
  const items = manifest?.items || []
  const qcCheckedCount = items.filter((item) => item.qc_checked).length
  const isAllVerified = items.length > 0 && qcCheckedCount === items.length

  const ops = []

  // Header Banner
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 720 515 80 re f')
  ops.push('0.72 0.24 0 rg')
  ops.push('40 716 515 4 re f')

  ops.push('BT')
  ops.push('/F2 14.5 Tf')
  ops.push('1 1 1 rg')
  ops.push('54 768 Td')
  ops.push(`(${escapePdfText('SURAT JALAN & MANIFEST HIDANGAN RESMI (HACCP)')}) Tj`)
  ops.push('/F1 9.5 Tf')
  ops.push('0.82 0.84 0.88 rg')
  ops.push('0 -17 Td')
  ops.push(
    `(${escapePdfText('Dokumen Kendali Mutu Pangan, Rantai Suhu, & Serah Terima Katering SerasiWO')}) Tj`
  )
  ops.push('0 -14 Td')
  ops.push(
    `(${escapePdfText(`Acara: ${weddingTitle} | Venue: ${venue}`)}) Tj`
  )
  ops.push('ET')

  // Status Stamp Badge
  if (isAllVerified) {
    ops.push('0.08 0.50 0.24 rg')
  } else {
    ops.push('0.72 0.24 0 rg')
  }
  ops.push('395 748 145 28 re f')
  ops.push('BT')
  ops.push('/F2 9 Tf')
  ops.push('1 1 1 rg')
  ops.push('405 758 Td')
  ops.push(
    `(${escapePdfText(
      isAllVerified
        ? `LOLOS QC 100% (${qcCheckedCount}/${items.length})`
        : `QC PARSIAL (${qcCheckedCount}/${items.length})`
    )}) Tj`
  )
  ops.push('ET')

  // Metadata Box
  ops.push('0.97 0.97 0.98 rg')
  ops.push('40 585 515 115 re f')
  ops.push('0.86 0.88 0.91 RG')
  ops.push('1 w')
  ops.push('40 585 515 115 re S')

  const drawField = (xL, xV, y, label, val, bold = false) => {
    ops.push('BT')
    ops.push('/F1 8.5 Tf')
    ops.push('0.36 0.38 0.41 rg')
    ops.push(`${xL} ${y} Td`)
    ops.push(`(${escapePdfText(label)}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push(`${bold ? '/F2' : '/F1'} 9 Tf`)
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`${xV} ${y} Td`)
    ops.push(`(${escapePdfText(String(val || '-').slice(0, 48))}) Tj`)
    ops.push('ET')
  }

  drawField(52, 165, 680, 'No. Surat Jalan', `: ${manifest?.manifest_number || '-'}`, true)
  drawField(52, 165, 660, 'Paket Katering', `: ${manifest?.package_name || '-'}`, true)
  drawField(
    52,
    165,
    640,
    'Kuota Porsi',
    `: ${manifest?.total_portions || 0} Pax (VIP ${manifest?.vip_portions || 0} / Kru ${manifest?.crew_portions || 0})`
  )
  drawField(52, 165, 620, 'Armada Chiller', `: ${manifest?.vehicle_plate || '-'}`, true)
  drawField(52, 165, 600, 'Keberangkatan', `: ${manifest?.departure_time || '-'}`)

  drawField(335, 422, 680, 'Tanggal Acara', `: ${eventDate}`, true)
  drawField(335, 422, 660, 'Jam Jamuan', `: ${timeSlot}`)
  drawField(335, 422, 640, 'Sopir & Kontak', `: ${manifest?.driver_phone || '-'}`)
  drawField(335, 422, 620, 'Total Item Menu', `: ${items.length} Komponen Hidangan`)
  drawField(335, 422, 600, 'Mitra Katering', ': Berkah Rasa Premium Catering')

  // Table Heading
  ops.push('BT')
  ops.push('/F2 10.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 564 Td')
  ops.push(`(${escapePdfText('DAFTAR KOMPOSISI HIDANGAN, KUANTITAS PORSI, & UJI SUHU (QC)')}) Tj`)
  ops.push('ET')

  // Table Header Row
  ops.push('0.93 0.94 0.96 rg')
  ops.push('40 536 515 20 re f')
  ops.push('0.84 0.86 0.89 RG')
  ops.push('40 536 515 20 re S')

  ops.push('BT')
  ops.push('/F2 8 Tf')
  ops.push('0.20 0.23 0.28 rg')
  ops.push('46 543 Td')
  ops.push('(KATEGORI) Tj')
  ops.push('74 0 Td')
  ops.push('(NAMA HIDANGAN & CATATAN PERALATAN) Tj')
  ops.push('200 0 Td')
  ops.push('(KUANTITAS) Tj')
  ops.push('72 0 Td')
  ops.push('(STANDAR SUHU) Tj')
  ops.push('84 0 Td')
  ops.push('(STATUS QC) Tj')
  ops.push('ET')

  let currentY = 536
  items.slice(0, 11).forEach((item) => {
    const rowH = 34
    currentY -= rowH
    ops.push('1 1 1 rg')
    ops.push(`40 ${currentY} 515 ${rowH} re f`)
    ops.push('0.86 0.88 0.91 RG')
    ops.push(`40 ${currentY} 515 ${rowH} re S`)

    ops.push('BT')
    ops.push('/F2 8 Tf')
    ops.push('0.72 0.24 0 rg')
    ops.push(`46 ${currentY + 19} Td`)
    ops.push(`(${escapePdfText(String(item.category || '-').slice(0, 15))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8.5 Tf')
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`120 ${currentY + 20} Td`)
    ops.push(`(${escapePdfText(String(item.name || '-').slice(0, 38))}) Tj`)
    ops.push('/F1 7.5 Tf')
    ops.push('0.36 0.38 0.41 rg')
    ops.push('0 -11 Td')
    ops.push(`(${escapePdfText(String(item.notes || '-').slice(0, 46))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8 Tf')
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`320 ${currentY + 15} Td`)
    ops.push(`(${escapePdfText(String(item.qty || '-').slice(0, 14))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F1 7.5 Tf')
    ops.push('0.20 0.23 0.28 rg')
    ops.push(`392 ${currentY + 15} Td`)
    ops.push(`(${escapePdfText(String(item.serving_temp || '-').slice(0, 16))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8 Tf')
    if (item.qc_checked) {
      ops.push('0.08 0.50 0.24 rg')
      ops.push(`476 ${currentY + 15} Td`)
      ops.push(`(${escapePdfText(`LOLOS ${item.qc_checked_at || ''}`.trim().slice(0, 14))}) Tj`)
    } else {
      ops.push('0.71 0.33 0.04 rg')
      ops.push(`476 ${currentY + 15} Td`)
      ops.push('(BELUM QC) Tj')
    }
    ops.push('ET')
  })

  // Signature Block
  const sigY = Math.max(currentY - 58, 60)
  ops.push('0.88 0.89 0.91 RG')
  ops.push(`40 ${sigY + 38} m 555 ${sigY + 38} l S`)

  ops.push('BT')
  ops.push('/F2 8.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push(`48 ${sigY + 22} Td`)
  ops.push('(Diserahkan Oleh: Kepala Dapur / QC Vendor) Tj')
  ops.push('260 0 Td')
  ops.push('(Diterima Oleh: Koordinator Lapangan SerasiWO) Tj')
  ops.push('/F1 8 Tf')
  ops.push('0.36 0.38 0.41 rg')
  ops.push(`-260 -16 Td`)
  ops.push(
    `(${escapePdfText(`Dicetak: ${new Date().toLocaleString('id-ID')} WIB | No: ${manifest?.manifest_number || '-'}`)}) Tj`
  )
  ops.push('ET')

  const contentStream = ops.join('\n')
  const streamBytesLength = new TextEncoder().encode(contentStream).length

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  let pdfString = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdfString.length)
    pdfString += obj
  }

  const xrefOffset = pdfString.length
  pdfString += `xref\n0 ${objects.length + 1}\n`
  pdfString += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0')
    pdfString += `${padded} 00000 n \n`
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdfString], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    `Surat_Jalan_Manifest_${String(manifest?.manifest_number || 'KATERING').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadVendorProfilePdf(profile) {
  const brandName = profile?.name || 'Berkah Rasa Premium Catering'
  const legalName = profile?.legal_name || 'CV Berkah Rasa Nusantara'
  const category = profile?.category || 'Katering Pernikahan & Jamuan VIP'
  const picName = profile?.pic_name || 'Hendra Kusuma'
  const picRole = profile?.pic_role || 'Direktur Operasional'
  const phone = profile?.phone || '+62 812-3456-7890'
  const email = profile?.email || 'vendor@serasiwo.com'
  const rating = profile?.rating || 4.9
  const completedJobs = profile?.completed_jobs || 52
  const activeJobs = profile?.active_jobs || 3
  const npwp = profile?.npwp_number || '02.841.992.1-043.000'
  const nib = profile?.nib_number || '9120300881421'
  const halalCert = profile?.halal_cert || 'ID3111000028911021 (MUI & BPJPH Aktif)'
  const hygieneCert = profile?.hygiene_cert || 'Dinkes DKI Jakarta Golongan B (Valid)'
  const kitchenCap = profile?.kitchen_capacity || 'Hingga 5.000 Porsi / Hari'
  const fleetInfo = profile?.fleet_info || '4 Unit Truk Box Isuzu Chiller'
  const crewTotal = profile?.service_crew_total || '65 Personel Tersertifikasi Higiene'
  const kitchenAddr = profile?.kitchen_address || 'Jl. Danau Sunter Utara No. 42, Jakarta Utara'
  const bankName = profile?.bank_name || 'Bank Central Asia (BCA)'
  const bankBranch = profile?.bank_branch || 'KCU Sunter Mall'
  const accountNo = profile?.account_number || '521-0988-123'
  const accountHolder = profile?.account_holder || 'CV Berkah Rasa Nusantara'

  const ops = []

  // Top Ember Header Accent Bar
  ops.push('0.72 0.24 0 rg')
  ops.push('40 792 515 8 re f')

  // Header Typography
  ops.push('BT')
  ops.push('/F2 17 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 764 Td')
  ops.push('(DOKUMEN VERIFIKASI & COMPANY PROFILE MITRA KATERING) Tj')
  ops.push('/F1 9.5 Tf')
  ops.push('0.36 0.38 0.41 rg')
  ops.push('0 -16 Td')
  ops.push('(SERASIWO ENTERPRISE WEDDING ORGANIZER | DIREKTORAT KEPATUHAN VENDOR) Tj')
  ops.push('0 -13 Td')
  ops.push(`(${escapePdfText(`Entitas Resmi: ${legalName} (${brandName})`)}) Tj`)
  ops.push('ET')

  // Verified Status Stamp Badge
  ops.push('0.08 0.50 0.24 rg')
  ops.push('405 748 150 28 re f')
  ops.push('BT')
  ops.push('/F2 9 Tf')
  ops.push('1 1 1 rg')
  ops.push('416 758 Td')
  ops.push('(MITRA TERVERIFIKASI AKTIF) Tj')
  ops.push('ET')

  // Executive Summary Box
  ops.push('0.97 0.97 0.98 rg')
  ops.push('40 605 515 110 re f')
  ops.push('0.86 0.88 0.91 RG')
  ops.push('1 w')
  ops.push('40 605 515 110 re S')

  const drawField = (xL, xV, y, label, val, bold = false) => {
    ops.push('BT')
    ops.push('/F1 8.5 Tf')
    ops.push('0.36 0.38 0.41 rg')
    ops.push(`${xL} ${y} Td`)
    ops.push(`(${escapePdfText(label)}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push(`${bold ? '/F2' : '/F1'} 9 Tf`)
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`${xV} ${y} Td`)
    ops.push(`(${escapePdfText(String(val || '-').slice(0, 50))}) Tj`)
    ops.push('ET')
  }

  drawField(52, 165, 694, 'Nama Badan Usaha', `: ${legalName}`, true)
  drawField(52, 165, 674, 'Nama Brand Katering', `: ${brandName}`, true)
  drawField(52, 165, 654, 'Kategori Layanan', `: ${category}`)
  drawField(52, 165, 634, 'Penanggung Jawab', `: ${picName} (${picRole})`, true)
  drawField(52, 165, 614, 'Kontak Operasional', `: ${phone} | ${email}`)

  drawField(340, 430, 694, 'ID Rekanan', `: ${profile?.id || 'vnd-berkah-rasa'}`, true)
  drawField(340, 430, 674, 'Rating Mutu WO', `: ${rating} / 5.0 Bintang`, true)
  drawField(340, 430, 654, 'Acara Selesai', `: ${completedJobs} Acara Sukses`)
  drawField(340, 430, 634, 'Jadwal Aktif', `: ${activeJobs} Acara Berjalan`)
  drawField(340, 430, 614, 'Status Audit', ': Lulus Kepatuhan SOP')

  // Section 1: Legalitas & Sertifikasi Mutu Pangan
  ops.push('BT')
  ops.push('/F2 10.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 580 Td')
  ops.push('(1. SPESIFIKASI LEGALITAS, SERTIFIKASI HALAL, & KAPASITAS DAPUR SENTRAL) Tj')
  ops.push('ET')

  const specRows = [
    ['Nomor Pokok Wajib Pajak (NPWP)', npwp, 'Terdaftar DJP'],
    ['Nomor Induk Berusaha (NIB OSS)', nib, 'Aktif Terverifikasi'],
    ['Sertifikat Halal MUI & BPJPH', halalCert, 'Valid & Aktif'],
    ['Sertifikat Laik Higiene Jasaboga', hygieneCert, 'Golongan B Lulus'],
    ['Kapasitas Produksi Dapur Sentral', kitchenCap, 'Siap Operasional'],
    ['Armada Distribusi Berpendingin', fleetInfo, 'Suhu Terkalibrasi'],
    ['Kekuatan Personel & Kru Servis', crewTotal, 'Bersertifikat APD'],
    ['Alamat Dapur Sentral & Logistik', kitchenAddr, 'Lokasi Terverifikasi'],
    ['Rekening Settlement Resmi', `${bankName} - ${accountNo} (${accountHolder})`, bankBranch],
  ]

  // Table Header
  ops.push('0.93 0.94 0.96 rg')
  ops.push('40 550 515 20 re f')
  ops.push('0.84 0.86 0.89 RG')
  ops.push('40 550 515 20 re S')

  ops.push('BT')
  ops.push('/F2 8 Tf')
  ops.push('0.20 0.23 0.28 rg')
  ops.push('48 557 Td')
  ops.push('(PARAMETER SPESIFIKASI & DOKUMEN) Tj')
  ops.push('175 0 Td')
  ops.push('(NILAI TERDAFTAR DALAM SISTEM SERASIWO) Tj')
  ops.push('215 0 Td')
  ops.push('(STATUS AUDIT) Tj')
  ops.push('ET')

  let currentY = 550
  specRows.forEach((row) => {
    const rowH = 34
    currentY -= rowH
    ops.push('1 1 1 rg')
    ops.push(`40 ${currentY} 515 ${rowH} re f`)
    ops.push('0.86 0.88 0.91 RG')
    ops.push(`40 ${currentY} 515 ${rowH} re S`)

    ops.push('BT')
    ops.push('/F2 8.5 Tf')
    ops.push('0.20 0.23 0.28 rg')
    ops.push(`48 ${currentY + 14} Td`)
    ops.push(`(${escapePdfText(String(row[0]).slice(0, 34))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8.5 Tf')
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`223 ${currentY + 14} Td`)
    ops.push(`(${escapePdfText(String(row[1]).slice(0, 44))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8 Tf')
    ops.push('0.08 0.50 0.24 rg')
    ops.push(`438 ${currentY + 14} Td`)
    ops.push(`(${escapePdfText(String(row[2]).slice(0, 22))}) Tj`)
    ops.push('ET')
  })

  // Signature Footer
  const sigY = Math.max(currentY - 70, 65)
  ops.push('0.88 0.89 0.91 RG')
  ops.push(`40 ${sigY + 42} m 555 ${sigY + 42} l S`)

  ops.push('BT')
  ops.push('/F2 8.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push(`48 ${sigY + 24} Td`)
  ops.push(`(${escapePdfText(`Dikonfirmasi Oleh: ${picName} (${picRole})`)}) Tj`)
  ops.push('255 0 Td')
  ops.push('(Disahkan Oleh: Direktorat Vendor Management SerasiWO) Tj')
  ops.push('/F1 8 Tf')
  ops.push('0.36 0.38 0.41 rg')
  ops.push('-255 -16 Td')
  ops.push(
    `(${escapePdfText(`Dicetak Otomatis dari Portal SerasiWO pada ${new Date().toLocaleString('id-ID')} WIB`)}) Tj`
  )
  ops.push('ET')

  const contentStream = ops.join('\n')
  const streamBytesLength = new TextEncoder().encode(contentStream).length

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  let pdfString = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdfString.length)
    pdfString += obj
  }

  const xrefOffset = pdfString.length
  pdfString += `xref\n0 ${objects.length + 1}\n`
  pdfString += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0')
    pdfString += `${padded} 00000 n \n`
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdfString], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    `Company_Profile_Sertifikasi_${String(legalName).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Menghasilkan dokumen PDF 1.4 resmi untuk Surat Konfirmasi Rekening Giro Korporat & Rekap Settlement
 */
export function downloadBankVerificationPdf(profile, payouts = []) {
  const legalName = profile?.legal_name || 'CV Berkah Rasa Nusantara'
  const brandName = profile?.name || 'Berkah Rasa Premium Catering'
  const bankName = profile?.bank_name || 'Bank Central Asia (BCA)'
  const bankBranch = profile?.bank_branch || 'KCU Sunter Mall'
  const accountNo = profile?.account_number || '521-0988-123'
  const accountRaw = profile?.account_number_raw || '521098812300'
  const accountHolder = profile?.account_holder || 'CV Berkah Rasa Nusantara'
  const schedule = profile?.settlement_schedule || 'Rabu & Jumat (14:00 WIB)'
  const npwp = profile?.npwp_number || '02.841.992.1-043.000'
  const picName = profile?.pic_name || 'Hendra Kusuma'
  const picRole = profile?.pic_role || 'Direktur Operasional'

  const settledList = payouts.filter((p) => p.status === 'dicairkan')
  const pendingList = payouts.filter(
    (p) => p.status === 'tertunda' || p.status === 'diproses'
  )
  const settledTotal = settledList.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  )
  const pendingTotal = pendingList.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  )

  const ops = []

  // Top Header Accent Bar
  ops.push('0.72 0.24 0 rg')
  ops.push('40 792 515 8 re f')

  // Document Title
  ops.push('BT')
  ops.push('/F2 16.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 764 Td')
  ops.push('(SURAT KONFIRMASI REKENING GIRO & OTORISASI SETTLEMENT) Tj')
  ops.push('/F1 9.5 Tf')
  ops.push('0.36 0.38 0.41 rg')
  ops.push('0 -16 Td')
  ops.push('(SERASIWO CORPORATE TREASURY | DIREKTORAT KEUANGAN & PENCAIRAN VENDOR) Tj')
  ops.push('0 -13 Td')
  ops.push(
    `(${escapePdfText(`Entitas Penerima Dana: ${legalName} (${brandName})`)}) Tj`
  )
  ops.push('ET')

  // Verified Stamp
  ops.push('0.08 0.50 0.24 rg')
  ops.push('400 748 155 28 re f')
  ops.push('BT')
  ops.push('/F2 8.5 Tf')
  ops.push('1 1 1 rg')
  ops.push('410 758 Td')
  ops.push('(REKENING GIRO TERVERIFIKASI) Tj')
  ops.push('ET')

  // Bank Account Summary Box
  ops.push('0.97 0.97 0.98 rg')
  ops.push('40 595 515 120 re f')
  ops.push('0.86 0.88 0.91 RG')
  ops.push('1 w')
  ops.push('40 595 515 120 re S')

  const drawField = (xL, xV, y, label, val, bold = false) => {
    ops.push('BT')
    ops.push('/F1 8.5 Tf')
    ops.push('0.36 0.38 0.41 rg')
    ops.push(`${xL} ${y} Td`)
    ops.push(`(${escapePdfText(label)}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push(`${bold ? '/F2' : '/F1'} 9 Tf`)
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`${xV} ${y} Td`)
    ops.push(`(${escapePdfText(String(val || '-').slice(0, 48))}) Tj`)
    ops.push('ET')
  }

  drawField(52, 175, 694, 'Nama Bank Tujuan', `: ${bankName}`, true)
  drawField(52, 175, 674, 'Kantor Cabang Pembuka', `: ${bankBranch}`, true)
  drawField(
    52,
    175,
    654,
    'Nomor Rekening Giro',
    `: ${accountNo} (Raw: ${accountRaw})`,
    true
  )
  drawField(52, 175, 634, 'Nama Pemilik Rekening', `: ${accountHolder}`, true)
  drawField(52, 175, 614, 'NPWP Pemotongan PPh 23', `: ${npwp} (Tarif 2%)`)

  drawField(345, 435, 694, 'Kode Bank / SWIFT', ': 014 / CENAIDJA', true)
  drawField(345, 435, 674, 'Metode Kliring', ': BI-FAST & RTGS Korporat')
  drawField(345, 435, 654, 'Jadwal Settlement', `: ${schedule}`)
  drawField(
    345,
    435,
    634,
    'Total Dicairkan',
    `: ${formatRupiah(settledTotal)}`,
    true
  )
  drawField(
    345,
    435,
    614,
    'Antrean Pencairan',
    `: ${formatRupiah(pendingTotal)}`
  )

  // Ledger Section Heading
  ops.push('BT')
  ops.push('/F2 10.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push('40 570 Td')
  ops.push(
    '(REKAPITULASI MUTASI & PENCAIRAN TERMIN KE REKENING TERDAFTAR) Tj'
  )
  ops.push('ET')

  // Table Header
  ops.push('0.93 0.94 0.96 rg')
  ops.push('40 540 515 20 re f')
  ops.push('0.84 0.86 0.89 RG')
  ops.push('40 540 515 20 re S')

  ops.push('BT')
  ops.push('/F2 8 Tf')
  ops.push('0.20 0.23 0.28 rg')
  ops.push('48 547 Td')
  ops.push('(NO. INVOICE) Tj')
  ops.push('95 0 Td')
  ops.push('(ACARA PERNIKAHAN & TERMIN) Tj')
  ops.push('185 0 Td')
  ops.push('(NOMINAL TAGIHAN) Tj')
  ops.push('105 0 Td')
  ops.push('(STATUS SETTLEMENT) Tj')
  ops.push('ET')

  let currentY = 540
  payouts.slice(0, 8).forEach((p) => {
    const rowH = 34
    currentY -= rowH
    ops.push('1 1 1 rg')
    ops.push(`40 ${currentY} 515 ${rowH} re f`)
    ops.push('0.86 0.88 0.91 RG')
    ops.push(`40 ${currentY} 515 ${rowH} re S`)

    ops.push('BT')
    ops.push('/F2 8 Tf')
    ops.push('0.72 0.24 0 rg')
    ops.push(`48 ${currentY + 14} Td`)
    ops.push(`(${escapePdfText(String(p.invoice_number || '-').slice(0, 18))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8.5 Tf')
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`143 ${currentY + 19} Td`)
    ops.push(`(${escapePdfText(String(p.wedding_title || '-').slice(0, 34))}) Tj`)
    ops.push('/F1 7.5 Tf')
    ops.push('0.36 0.38 0.41 rg')
    ops.push('0 -11 Td')
    ops.push(
      `(${escapePdfText(`Tgl Acara: ${formatShortDateID(p.event_date)} | Bank: ${p.bank_name || bankName}`.slice(0, 42))}) Tj`
    )
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8.5 Tf')
    ops.push('0.09 0.09 0.11 rg')
    ops.push(`328 ${currentY + 14} Td`)
    ops.push(`(${escapePdfText(formatRupiah(p.amount || 0))}) Tj`)
    ops.push('ET')

    ops.push('BT')
    ops.push('/F2 8 Tf')
    if (p.status === 'dicairkan') {
      ops.push('0.08 0.50 0.24 rg')
      ops.push(`433 ${currentY + 14} Td`)
      ops.push('(DICAIRKAN / LUNAS) Tj')
    } else {
      ops.push('0.71 0.33 0.04 rg')
      ops.push(`433 ${currentY + 14} Td`)
      ops.push(`(${escapePdfText(String(p.status_label || 'DIPROSES WO').toUpperCase().slice(0, 18))}) Tj`)
    }
    ops.push('ET')
  })

  // Signature Footer
  const sigY = Math.max(currentY - 70, 65)
  ops.push('0.88 0.89 0.91 RG')
  ops.push(`40 ${sigY + 42} m 555 ${sigY + 42} l S`)

  ops.push('BT')
  ops.push('/F2 8.5 Tf')
  ops.push('0.09 0.09 0.11 rg')
  ops.push(`48 ${sigY + 24} Td`)
  ops.push(`(${escapePdfText(`Pemilik Rekening: ${picName} (${picRole})`)}) Tj`)
  ops.push('255 0 Td')
  ops.push('(Diverifikasi Oleh: Treasury & Finance SerasiWO) Tj')
  ops.push('/F1 8 Tf')
  ops.push('0.36 0.38 0.41 rg')
  ops.push('-255 -16 Td')
  ops.push(
    `(${escapePdfText(`Dicetak dari Portal Treasury SerasiWO pada ${new Date().toLocaleString('id-ID')} WIB`)}) Tj`
  )
  ops.push('ET')

  const contentStream = ops.join('\n')
  const streamBytesLength = new TextEncoder().encode(contentStream).length

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  let pdfString = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdfString.length)
    pdfString += obj
  }

  const xrefOffset = pdfString.length
  pdfString += `xref\n0 ${objects.length + 1}\n`
  pdfString += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0')
    pdfString += `${padded} 00000 n \n`
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdfString], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    `Konfirmasi_Rekening_Giro_${String(accountRaw).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
