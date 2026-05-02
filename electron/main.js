import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { exec, execSync } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// ESM: define __dirname from import.meta
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get executable directory (works in both dev and production)
const getAppPath = () => {
  if (app.isPackaged) {
    // In production, use the executable directory
    return path.dirname(app.getPath('exe'))
  }
  // In development, use project root
  return process.cwd()
}

// Load .env from executable directory (for win-unpacked)
const appPath = getAppPath()
const envPath = path.join(appPath, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      const value = valueParts.join('=').trim()
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value
      }
    }
  })
  console.log('[Main] .env loaded from:', envPath)
} else {
  console.log('[Main] .env not found at:', envPath, '- using defaults')
}

// The built directory structure
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win = null

// Printer configurations
const PRINTER_CONFIG = {
  receipt: {
    name: process.env.RECEIPT_PRINTER || 'EPSON TM-T82 Receipt',
    ip: process.env.RECEIPT_PRINTER_IP || '192.168.1.100',
    port: parseInt(process.env.RECEIPT_PRINTER_PORT || '9100'),
    width: 80, // 80mm Roll Paper
    silent: true
  },
  sticker: {
    name: process.env.STICKER_PRINTER || 'ZDesigner ZD230-203dpi ZPL',
    width: 50,
    silent: true
  }
}

function createWindow() {
  console.log('Creating window...')
  console.log('DIST:', process.env.DIST)
  console.log('VITE_PUBLIC:', process.env.VITE_PUBLIC)
  console.log('__dirname:', __dirname)
  console.log('isPackaged:', app.isPackaged)

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: true, // Enable window frame for development
    fullscreen: false, // Disable fullscreen for development
    kiosk: false, // Disable kiosk mode for development
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
      // Enable camera access
      enableRemoteModule: false
    }
  })

  console.log('Window created successfully')
  console.log('Window bounds:', win.getBounds())

  // Handle permission requests for camera
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission request:', permission)
    // Allow camera and microphone permissions
    if (permission === 'media' || permission === 'video' || permission === 'audio') {
      callback(true)
      console.log('✅ Permission granted:', permission)
    } else {
      callback(false)
      console.log('❌ Permission denied:', permission)
    }
  })

  // Also handle device permission handler (newer Electron versions)
  win.webContents.session.setDevicePermissionHandler((details) => {
    console.log('Device permission request:', details)
    if (details.deviceType === 'camera' || details.deviceType === 'audio') {
      return true
    }
    return false
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    console.log('Page finished loading')
    win?.webContents.send('main-process-message', (new Date()).toLocaleString())
  })

  // Log page loading errors
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page load failed:', errorCode, errorDescription, validatedURL)
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('Loading dev server:', process.env.VITE_DEV_SERVER_URL)
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // Open devTools in dev mode
    // win.webContents.openDevTools()
  } else {
    // In production, load from dist folder using file:// protocol
    const indexPath = path.join(process.env.DIST, 'index.html')
    console.log('Loading production build:', indexPath)

    win.loadFile(indexPath).then(() => {
      console.log('Production build loaded successfully')
    }).catch((err) => {
      console.error('Failed to load production build:', err)
    })
  }
}

// Helper: get full printer list via desktopCapturer API
async function getPrinterList() {
  try {
    const sources = await desktopCapturer.getSources({ types: ['printer'], thumbnailSize: { width: 0, height: 0 } })
    return sources.map(s => ({
      name: s.name,
      displayName: s.name,
      isDefault: false,
      device: s.name
    }))
  } catch (err) {
    console.error('[getPrinterList] Error:', err)
    return []
  }
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  return getPrinterList()
})

// Format tanggal Indonesia
function formatDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === '') return '-'
  try {
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [yyyy, mm, dd] = dateStr.split('-')
      return `${parseInt(dd)} ${bulan[parseInt(mm) - 1]} ${yyyy}`
    }
    return dateStr
  } catch { return dateStr }
}

// Shared HTML builder for receipt - matches TM-T82 80mm 48-column thermal printer
// Uses <pre> monospace text for reliable alignment on thermal printers
function buildReceiptHTMLString(d) {
  const W = 48   // chars per line — TM-T82 48 Column Mode
  const LW = 18  // label column width

  // Format a label: value line with word-wrap for long values
  const fmtLine = (label, value) => {
    const lbl = label.padEnd(LW)
    const prefix = lbl + ': '
    const pLen = prefix.length  // 20
    const val = String(value || '-')
    const maxFirst = W - pLen   // 28

    if (val.length <= maxFirst) return prefix + val

    // Word-wrap long values with proper indentation
    const result = []
    const indent = ' '.repeat(pLen)
    let cur = prefix
    const parts = val.split(/(\s+)/)

    for (const part of parts) {
      if ((cur + part).length <= W) {
        cur += part
      } else {
        if (cur.trim()) result.push(cur)
        cur = indent + part.trimStart()
      }
    }
    if (cur.trim()) result.push(cur)
    return result.join('\n')
  }

  // Center text within W chars
  const center = (text) => {
    const pad = Math.max(0, Math.floor((W - text.length) / 2))
    return ' '.repeat(pad) + text
  }

  // Pad right to fill W chars (for no. antrian display)
  const padRight = (text, len) => String(text).padEnd(len).substring(0, len)

  // Convert sex to L/P format
  const convertSex = (sex) => {
    if (!sex || sex === '-') return '-'
    const s = String(sex).toUpperCase()
    if (s === 'LAKI-LAKI' || s === 'LAKI LAKI' || s === 'MALE' || s === 'L') return 'L'
    if (s === 'PEREMPUAN' || s === 'PEREMPUAN' || s === 'FEMALE' || s === 'P') return 'P'
    return s.charAt(0)
  }

  // Build all lines - with special formatting for title and queue sections
  // Using HTML tags to simulate larger text
  const lines = [
    `<BIG>BUKTI PENDAFTARAN</BIG>`,
    center(`*${d.barcode_value}*`),
    '',
    `<BIG>No. Antrian ${padRight(d.no_antrian, 6)}   Sesi : ${d.sesi}</BIG>`,
    fmtLine('Tgl/Jam Registrasi', d.tgl_jam_registrasi),
    fmtLine('No. Rekam Medis', d.no_rekam_medis),
    fmtLine('Nama Pasien / JK', `${d.nama_pasien} / (${convertSex(d.jenis_kelamin)})`),
    fmtLine('Tgl. Lahir / Umur', `${d.tgl_lahir} / ${d.umur}`),
    fmtLine('Unit Pelayanan', d.unit_pelayanan),
    fmtLine('Nama Dokter', d.nama_dokter),
    fmtLine('Nama Ruang', d.nama_ruang),
    fmtLine('Kiriman Dari', d.kiriman_dari),
    fmtLine('Penjamin Bayar', d.penjamin_bayar),
    '',
    '[ ] Farmasi  [ ] Laboratorium  [ ] Radiologi',
    '',
    '[ ] Pemakaian  [ ] Lain-Lain ..........',
    '',
    fmtLine('Petugas', 'System'),
    '',
    '* Mohon Bukti Pendaftaran ini jangan hilang',
  ]

  const content = lines.join('\n')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Bukti Pendaftaran</title>
<style>
@page { margin: 0; size: 80mm auto; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  margin: 0;
  padding: 2mm 2mm;
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  font-weight: bold;
  line-height: 1.4;
  width: 80mm;
  background: #fff;
  color: #000;
  -webkit-print-color-adjust: exact;
}
pre {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  text-align: left;
}
BIG {
  font-size: 13px;
  font-weight: bold;
  display: block;
  text-align: center;
  margin: 2px 0;
}
</style>
</head>
<body>
<pre>${content}</pre>
</body>
</html>`
}

// Generate receipt HTML for fallback
function generateReceiptHTML(data) {
  const g = (p, c) => data[p] || data[c] || '-'
  const barcode_value = g('RegistrationNo', 'registrationNo')
  const no_antrian = g('QueueNo', 'queueNo')
  const sesi = g('Session', 'session')
  const tgl_jam_registrasi = `${formatDate(g('RegistrationDate', 'registrationDate'))} / ${g('RegistrationTime', 'registrationTime')}`
  const no_rekam_medis = g('MedicalNo', 'medicalNo')
  const nama_pasien = g('PatientName', 'patientName')
  const jenis_kelamin = g('Sex', 'sex')
  const tgl_lahir = formatDate(g('DateOfBirth', 'dateOfBirth'))
  const umur = g('AgeInYear', 'ageInYear')
  const unit_pelayanan = g('ServiceUnitName', 'clinicName')
  const nama_dokter = g('ParamedicName', 'doctorName')
  const nama_ruang = g('RoomName', 'room')
  const kiriman_dari = '-'
  const penjamin_bayar = g('BusinessPartnerName', '-')

  return buildReceiptHTMLString({
    barcode_value, no_antrian, sesi, tgl_jam_registrasi,
    no_rekam_medis, nama_pasien, jenis_kelamin, tgl_lahir,
    umur, unit_pelayanan, nama_dokter, nama_ruang,
    kiriman_dari, penjamin_bayar
  })
}

// Print using ESCPOS (network or USB) with fallback to HTML
async function printWithESCPOS(printer, data) {
  const ESCPOS = require('escpos')
  const escposPrinter = new ESCPOS.Printer(printer)

  // Line helper - 42 chars width for 80mm paper (Font A)
  // Label column: 18 chars, then " : ", then value
  const line = (label, value) => {
    const labelWidth = 18
    const paddedLabel = label.substring(0, labelWidth).padEnd(labelWidth)
    return `${paddedLabel}: ${String(value)}`
  }

  // CENTER mode - Title
  escposPrinter.font('A').align('CT').size(1, 1)
  escposPrinter.text('BUKTI PENDAFTARAN')

  // Barcode text (centered)
  escposPrinter.size(1, 1).text(`*${data.barcode_value}*`)
  escposPrinter.feed(1)

  // LEFT align for data rows
  escposPrinter.align('LT')
  escposPrinter.size(1, 1)

  // No. Antrian (large) + Sesi on the right
  const antrianStr = String(data.no_antrian).padEnd(6)
  escposPrinter.text(`No. Antrian    ${antrianStr}Sesi : ${data.sesi}`)

  // Data rows with consistent label-value alignment
  escposPrinter.text(line('Tgl/Jam Registrasi', data.tgl_jam_registrasi))
  escposPrinter.text(line('No. Rekam Medis', data.no_rekam_medis))
  escposPrinter.text(line('Nama Pasien / JK', `${data.nama_pasien} / (${data.jenis_kelamin})`))
  escposPrinter.text(line('Tgl. Lahir / Umur', `${data.tgl_lahir} / ${data.umur}`))
  escposPrinter.text(line('Unit Pelayanan', data.unit_pelayanan))
  escposPrinter.text(line('Nama Dokter', data.nama_dokter))
  escposPrinter.text(line('Nama Ruang', data.nama_ruang))
  escposPrinter.text(line('Kiriman Dari', data.kiriman_dari))
  escposPrinter.text(line('Penjamin Bayar', data.penjamin_bayar))

  escposPrinter.feed(1)

  // Checkboxes
  escposPrinter.text('[ ] Farmasi   [ ] Laboratorium [ ] Radiologi')
  escposPrinter.feed(1)
  escposPrinter.text('[ ] Pemakaian [ ] Lain-Lain ..........')

  escposPrinter.feed(1)
  escposPrinter.text(line('Petugas', 'System'))
  escposPrinter.feed(1)

  // Footer
  escposPrinter.align('LT')
  escposPrinter.text('* Mohon Bukti Pendaftaran ini jangan hilang')

  escposPrinter.feed(3)
  escposPrinter.cut()
}

// Print using HTML (fallback method)
async function printWithHTML(data, copies) {
  console.log('[PRINT-RECEIPT] Using HTML print fallback')

  const ESCPOS = require('escpos')
  const receiptHTML = generateReceiptHTML(data)

  const options = {
    silent: true,
    printBackground: true,
    deviceName: PRINTER_CONFIG.receipt.name
  }

  for (let i = 1; i <= copies; i++) {
    console.log('[PRINT-RECEIPT] HTML copy', i, '/', copies)
    await new Promise((resolve, reject) => {
      const printWindow = new BrowserWindow({
        show: false,
        width: 302,
        height: 800,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })

      const timeout = setTimeout(() => {
        printWindow.close()
        reject(new Error('Print timeout'))
      }, 15000)

      printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(receiptHTML))
        .then(() => {
          printWindow.webContents.print(options, (success, errorType) => {
            clearTimeout(timeout)
            printWindow.close()
            if (success) {
              resolve()
            } else {
              reject(new Error(`Print gagal (${errorType})`))
            }
          })
        })
        .catch(err => {
          clearTimeout(timeout)
          printWindow.close()
          reject(err)
        })
    })
    console.log('[PRINT-RECEIPT] HTML copy', i, 'OK')
  }
}

ipcMain.handle('print-receipt', async (event, content) => {
  console.log('[PRINT-RECEIPT] print-receipt called!')
  console.log('[PRINT-RECEIPT] Content keys:', Object.keys(content))

  const copies = Math.max(1, Math.min(parseInt(content._receiptCopies) || 1, 10))
  delete content._receiptCopies

  const getVal = (field) => content[field] || content[field.toLowerCase()] || content[field.toUpperCase()] || '-'

  const barcode_value = getVal('RegistrationNo') || '-'
  const no_antrian = getVal('QueueNo') || '-'
  const sesi = getVal('Session') || '-'
  const regDate = getVal('RegistrationDate') || '-'
  const regTime = getVal('RegistrationTime') || '-'
  const tgl_jam_registrasi = `${formatDate(regDate)} / ${regTime}`
  const medicalNo = getVal('MedicalNo') || '-'
  const patientName = getVal('PatientName') || '-'
  
  let sex = getVal('Sex') || getVal('sex') || '-'
  if (sex !== '-' && sex.length > 1) {
    const s = String(sex).toUpperCase()
    if (s === 'LAKI-LAKI' || s === 'LAKI LAKI' || s === 'MALE') sex = 'L'
    else if (s === 'PEREMPUAN' || s === 'FEMALE') sex = 'P'
  }
  
  const dob = getVal('DateOfBirth') || '-'
  const dobFormatted = formatDate(dob)
  
  let ageStr = getVal('AgeInYear') || '-'
  
  let clinic = getVal('ServiceUnitName') || '-'
  const sessionName = getVal('SessionName') || ''
  if (sessionName && sessionName !== '-') {
    clinic = `${clinic} - ${sessionName}`
  } else if (sesi && sesi !== '-') {
    clinic = `${clinic} - Sesi ${sesi}`
  }
  
  const doctor = getVal('ParamedicName') || getVal('doctorName') || '-'
  const room = getVal('Room') || getVal('room') || getVal('RoomName') || '-'
  const penjamin = getVal('BusinessPartnerName') || '-'

  console.log('[PRINT-RECEIPT] Parsed:', { barcode_value, no_antrian, sesi, patientName, room })

  const { execSync } = require('node:child_process')
  const os = require('node:os')
  const fs = require('node:fs')
  const path = require('node:path')

  const fmtLine = (label, value) => {
    const lbl = label.padEnd(18)
    const val = String(value || '-')
    const line = `${lbl}: ${val}`
    if (line.length > 48) {
      const prefix = `${lbl}: `
      const indent = ' '.repeat(prefix.length)
      return `${line.substring(0, 48)}\n${indent}${line.substring(48)}`
    }
    return line
  }

  const ESC = {
    INIT: Buffer.from([0x1B, 0x40]),
    BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
    SIZE_NORMAL: Buffer.from([0x1B, 0x21, 0x00]),
    SIZE_DOUBLE: Buffer.from([0x1B, 0x21, 0x30]),
    ALIGN_CT: Buffer.from([0x1B, 0x61, 0x01]),
    ALIGN_LT: Buffer.from([0x1B, 0x61, 0x00]),
    FEED: Buffer.from([0x1B, 0x64, 0x03]),
    CUT: Buffer.from([0x1D, 0x56, 0x00]),
  }

  const chunks = []
  chunks.push(ESC.INIT)
  
  chunks.push(ESC.ALIGN_CT, ESC.BOLD_ON, ESC.SIZE_DOUBLE)
  chunks.push(Buffer.from('BUKTI PENDAFTARAN\n', 'utf8'))
  
  chunks.push(ESC.SIZE_NORMAL, ESC.BOLD_OFF)
  chunks.push(Buffer.from(`*${barcode_value}*\n`, 'utf8'))
  
  chunks.push(ESC.ALIGN_LT, ESC.BOLD_ON, ESC.SIZE_DOUBLE)
  chunks.push(Buffer.from(`No. Antrian : ${no_antrian}  Sesi : ${sesi}\n`, 'utf8'))
  
  chunks.push(ESC.SIZE_NORMAL, ESC.BOLD_OFF)
  chunks.push(Buffer.from(fmtLine('Tgl/Jam Registrasi', tgl_jam_registrasi) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('No. Rekam Medis', medicalNo) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Nama Pasien / JK', `${patientName} / (${sex})`) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Tgl. Lahir / Umur', `${dobFormatted} / ${ageStr}`) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Unit Pelayanan', clinic) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Nama Dokter', doctor) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Nama Ruang', room) + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Kiriman Dari', '-') + '\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Penjamin Bayar', penjamin) + '\n', 'utf8'))
  
  chunks.push(Buffer.from('\n[ ] Farmasi  [ ] Laboratorium  [ ] Radiologi\n\n', 'utf8'))
  chunks.push(Buffer.from('[ ] Pemakaian  [ ] Lain-Lain ..........\n\n', 'utf8'))
  chunks.push(Buffer.from(fmtLine('Petugas', 'System') + '\n\n', 'utf8'))
  
  chunks.push(ESC.BOLD_ON)
  chunks.push(Buffer.from('* Mohon Bukti Pendaftaran ini jangan hilang\n', 'utf8'))
  chunks.push(ESC.BOLD_OFF)
  chunks.push(ESC.FEED)
  chunks.push(ESC.CUT)

  const printData = Buffer.concat(chunks)
  const tmpFile = path.join(os.tmpdir(), `print_${Date.now()}.bin`)
  fs.writeFileSync(tmpFile, printData)
  console.log('[PRINT-RECEIPT] Binary file:', tmpFile, 'size:', printData.length)

  // Get printer name for print command
  let printerName = ''
  try {
    const cmd = `powershell -Command "(Get-Printer | Where-Object {\$_.Name -like '*TM-T82*'}).Name | Select-Object -First 1"`
    printerName = execSync(cmd, { timeout: 5000 }).toString().trim()
    console.log('[PRINT-RECEIPT] Found printer:', printerName)
  } catch (e) {
    console.log('[PRINT-RECEIPT] Printer detection failed')
  }

  // Method 1: Use Windows print spooler with printer name
  if (printerName) {
    try {
      console.log('[PRINT-RECEIPT] Trying print spooler with printer:', printerName)
      execSync(`powershell -Command "Start-Process -FilePath '${tmpFile}' -Verb PrintTo -ArgumentList '${printerName}' -WindowStyle Hidden"`, { timeout: 15000, windowsHide: true })
      console.log('[PRINT-RECEIPT] Print spooler OK')
      fs.unlinkSync(tmpFile)
      return { success: true }
    } catch (e) {
      console.log('[PRINT-RECEIPT] Print spooler failed:', e.message)
    }
  }

  // Method 2: Use PowerShell to write to ESDPRT001 port
  try {
    const escapedPath = tmpFile.replace(/\\/g, '\\\\')
    const psCmd = `\$data = [System.IO.File]::ReadAllBytes('${escapedPath}'); \$fs = [System.IO.File]::Create('\\\\.\\\\ESDPRT001'); \$fs.Write(\$data, 0, \$data.Length); \$fs.Close()`
    console.log('[PRINT-RECEIPT] Trying PowerShell to ESDPRT001...')
    execSync(`powershell -Command "${psCmd}"`, { timeout: 15000, windowsHide: true })
    console.log('[PRINT-RECEIPT] PowerShell to ESDPRT001 OK')
    fs.unlinkSync(tmpFile)
    return { success: true }
  } catch (e) {
    console.log('[PRINT-RECEIPT] PowerShell to ESDPRT001 failed:', e.message)
  }

  // Method 3: Try copy command to ESDPRT001
  try {
    console.log('[PRINT-RECEIPT] Trying copy to ESDPRT001...')
    execSync(`cmd /c copy /B "${tmpFile}" "\\\\.\\ESDPRT001"`, { stdio: 'ignore', timeout: 10000, windowsHide: true })
    console.log('[PRINT-RECEIPT] Copy to ESDPRT001 OK')
    fs.unlinkSync(tmpFile)
    return { success: true }
  } catch (e) {
    console.log('[PRINT-RECEIPT] Copy to ESDPRT001 failed:', e.message)
  }

  // Method 4: Try type command
  try {
    console.log('[PRINT-RECEIPT] Trying type command...')
    execSync(`cmd /c type "${tmpFile}" > \\\\.\\ESDPRT001`, { stdio: 'ignore', timeout: 10000, windowsHide: true })
    console.log('[PRINT-RECEIPT] Type command OK')
    fs.unlinkSync(tmpFile)
    return { success: true }
  } catch (e) {
    console.log('[PRINT-RECEIPT] Type command failed:', e.message)
  }

  fs.unlinkSync(tmpFile)
  throw new Error('Tidak dapat mengirim data ke printer. Pastikan printer EPSON TM-T82 terhubung dan dalam mode Print.')
})


// Generate HTML with data passed directly
function generateReceiptHTMLWithData(data) {
  console.log('[PRINT-RECEIPT] generateReceiptHTMLWithData input:', JSON.stringify(data, null, 2))

  // Get field values with multiple fallback options
  const getVal = (field) => {
    return data[field] || data[field.toLowerCase()] || data[field.toUpperCase()] || '-'
  }

  const barcode_value = getVal('RegistrationNo') || getVal('registrationNo') || getVal('registrationno') || '-'
  const no_antrian = getVal('QueueNo') || getVal('queueNo') || getVal('queueno') || '-'
  const sesi = getVal('Session') || getVal('session') || '-'
  const regDate = getVal('RegistrationDate') || getVal('registrationDate') || getVal('registrationdate') || '-'
  const regTime = getVal('RegistrationTime') || getVal('registrationTime') || getVal('registrationtime') || '-'
  const tgl_jam_registrasi = `${formatDate(regDate)} / ${regTime}`
  const medicalNo = getVal('MedicalNo') || getVal('medicalNo') || getVal('medicalno') || '-'
  const patientName = getVal('PatientName') || getVal('patientName') || getVal('patientname') || '-'

  // Get sex/gender - API returns 'L' or 'P' directly
  let sex = getVal('Sex') || getVal('sex') || '-'
  if (sex !== '-' && sex.length > 1) {
    // Convert full gender words to single letter
    const s = sex.toUpperCase()
    if (s === 'LAKI-LAKI' || s === 'LAKI LAKI' || s === 'MALE') sex = 'L'
    else if (s === 'PEREMPUAN' || s === 'FEMALE') sex = 'P'
  }

  // Get date of birth
  const dob = getVal('DateOfBirth') || getVal('dateOfBirth') || getVal('dateofbirth') || '-'

  // Get age in format Yy Mm Dd from registration date
  let ageStr = '-'
  if (dob !== '-' && regDate !== '-') {
    try {
      // Parse dates (format: YYYY-MM-DD or DD-MM-YYYY)
      let dobDate, regDateObj
      if (dob.includes('-') && dob.split('-')[0].length === 4) {
        dobDate = new Date(dob)
      } else if (dob.includes('-')) {
        const [d, m, y] = dob.split('-')
        dobDate = new Date(`${y}-${m}-${d}`)
      }

      if (regDate.includes('-') && regDate.split('-')[0].length === 4) {
        regDateObj = new Date(regDate)
      } else if (regDate.includes('-')) {
        const [d, m, y] = regDate.split('-')
        regDateObj = new Date(`${y}-${m}-${d}`)
      }

      if (dobDate && regDateObj && !isNaN(dobDate) && !isNaN(regDateObj)) {
        const diffTime = Math.abs(regDateObj - dobDate)
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const years = Math.floor(totalDays / 365)
        const months = Math.floor((totalDays % 365) / 30)
        const days = totalDays - (years * 365) - (months * 30)
        ageStr = `${years}y ${months}m ${days}d`
      }
    } catch (e) {
      console.log('[PRINT-RECEIPT] Age calculation error:', e)
      ageStr = getVal('AgeInYear') || getVal('ageInYear') || '-'
    }
  } else {
    ageStr = getVal('AgeInYear') || getVal('ageInYear') || '-'
  }

  // Get service unit name with session - try ServiceUnitName first, then clinicName
  let clinic = getVal('ServiceUnitName') || getVal('serviceUnitName') || getVal('clinicName') || getVal('clinicname') || '-'
  // If session name is available, append it
  const sessionName = getVal('SessionName') || getVal('sessionName') || getVal('SessionDesc') || getVal('sessionDesc') || ''
  if (sessionName && sessionName !== '-') {
    clinic = `${clinic} - ${sessionName}`
  } else if (sesi && sesi !== '-') {
    // Fallback: use session number as "Pagi/Siang/Malam" based on time
    const timePart = regTime || ''
    if (timePart.includes('12:') || timePart.includes('13:') || timePart.includes('14:') || timePart.includes('15:')) {
      clinic = `${clinic} - Sore`
    } else if (timePart.includes('16:') || timePart.includes('17:') || timePart.includes('18:') || timePart.includes('19:') || timePart.includes('20:')) {
      clinic = `${clinic} - Malam`
    } else {
      clinic = `${clinic} - Pagi`
    }
  }

  // Get full doctor name
  let doctor = getVal('ParamedicName') || getVal('paramedicName') || getVal('doctorName') || getVal('doctorname') || '-'
  const doctorTitle = getVal('DoctorTitle') || getVal('doctorTitle') || ''
  if (doctorTitle && doctorTitle !== '-') {
    doctor = `${doctorTitle} ${doctor}`
  }

  const room = getVal('Room') || getVal('room') || getVal('RoomName') || getVal('roomName') || '-'
  const penjamin = getVal('BusinessPartnerName') || getVal('businessPartnerName') || '-'

  console.log('[PRINT-RECEIPT] Parsed values:', { barcode_value, no_antrian, sesi, medicalNo, patientName, sex, ageStr, room })

  return buildReceiptHTMLString({
    barcode_value, no_antrian, sesi, tgl_jam_registrasi,
    no_rekam_medis: medicalNo, nama_pasien: patientName,
    jenis_kelamin: sex, tgl_lahir: formatDate(dob), umur: ageStr,
    unit_pelayanan: clinic, nama_dokter: doctor,
    nama_ruang: room, kiriman_dari: '-', penjamin_bayar: penjamin
  })
}

// Helper: run a command and return { stdout, stderr, exitCode }
function runCmd(cmd, timeout = 15000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '', exitCode: err?.code ?? 0 })
    })
  })
}

ipcMain.handle('print-sticker', async (event, content) => {
  const stickerCopies = Math.max(1, Math.min(parseInt(content._stickerCopies) || 3, 10))
  delete content._stickerCopies
  console.log('[PRINT-STICKER] START, copies:', stickerCopies)

  const g = (p, c) => content[p] || content[c] || '-'
  const nama = g('PatientName', 'patientName')
  const noRM = g('MedicalNo', 'medicalNo')
  const tgLahir = g('DateOfBirth', 'dateOfBirth')

  console.log('[PRINT-STICKER] nama:', nama, '| noRM:', noRM, '| tgLahir:', tgLahir)

  // ── Step 1: Detect share names (short timeout) ──────────────────────
  const { stdout: shareList } = await runCmd(
    'powershell -Command "Get-Printer | ? Shared | Select -Expand ShareName"',
    5000
  )
  const detectedShares = shareList.split('\n').map(s => s.trim()).filter(Boolean)
  console.log('[PRINT-STICKER] Shared printers:', detectedShares)

  // Build priority list: configured → detected → common → USB
  const sharesToTry = [
    process.env.STICKER_PRINTER_SHARE,
    detectedShares[0],
    ...detectedShares,
    'ZD230', 'ZDesigner', 'ZD230USB'
  ].filter((v, i, a) => v && a.indexOf(v) === i) // dedupe, keep order

  // ── Step 2: Write ZPL file ────────────────────────────────────────────
  const zpl =
    `^XA^PW400^LL240^CI28` +
    `^FO05,40^AQN,12,12^FDNo. RM  : ${noRM}^FS` +
    `^FO05,75^AQN,12,12^FDNama     : ${nama.toUpperCase()}^FS` +
    `^FO05,110^AQN,12,12^FDTgl. Lhr  : ${tgLahir}^FS` +
    `^XZ`
  const tmpFile = path.join(os.tmpdir(), `stiker_${Date.now()}.txt`)
  fs.writeFileSync(tmpFile, zpl, 'utf8')
  console.log('[PRINT-STICKER] ZPL file:', tmpFile)

  // ── Step 3: Find working share (once) ────────────────────────────────
  // Try shares first (fast, ~1-2s each)
  let workingShare = null
  for (const share of sharesToTry) {
    console.log('[PRINT-STICKER] Trying share:', share)
    const { exitCode, stdout } = await runCmd(
      `cmd /c copy /B "${tmpFile}" "\\\\localhost\\${share}"`,
      5000
    )
    if (exitCode === 0 && /copied/i.test(stdout.trim())) {
      workingShare = share
      console.log('[PRINT-STICKER] Share OK:', share)
      break
    }
  }

  // If no share worked, try USB ports
  if (!workingShare) {
    for (const port of ['USB001', 'USB002', 'USB003']) {
      const { exitCode, stdout } = await runCmd(
        `cmd /c copy /B "${tmpFile}" "\\\\.\\${port}"`,
        5000
      )
      if (exitCode === 0 && /copied/i.test(stdout.trim())) {
        workingShare = 'USB:' + port
        console.log('[PRINT-STICKER] Port OK:', port)
        break
      }
    }
  }

  if (!workingShare) {
    try { fs.unlinkSync(tmpFile) } catch (_) { }
    throw new Error(
      `Gagal cetak stiker. Pastikan printer ZDesigner ZD230 sudah di-share.\n` +
      `Solusi: Control Panel → Devices and Printers → Right-click ZDesigner ZD230 → ` +
      `Sharing → Share this printer → Nama share: ZD230`
    )
  }

  // ── Step 4: Print copies — one file per copy, sequential ───────────
  for (let i = 1; i <= stickerCopies; i++) {
    const copyFile = path.join(os.tmpdir(), `stiker_${Date.now()}_${i}.txt`)
    fs.writeFileSync(copyFile, zpl, 'utf8')
    const dest = workingShare.startsWith('USB:')
      ? `\\\\.\\${workingShare.slice(4)}`
      : `\\\\localhost\\${workingShare}`
    const { exitCode, stdout } = await runCmd(
      `cmd /c copy /B "${copyFile}" "${dest}"`,
      8000
    )
    try { fs.unlinkSync(copyFile) } catch (_) { }
    if (exitCode !== 0 || !/copied/i.test(stdout.trim())) {
      throw new Error(`Gagal cetak stiker copy ${i}`)
    }
    console.log('[PRINT-STICKER] Copy', i, 'OK')
    // Small delay between copies
    if (i < 3) await new Promise(r => setTimeout(r, 300))
  }

  try { fs.unlinkSync(tmpFile) } catch (_) { }

  console.log('[PRINT-STICKER] All', stickerCopies, 'copies sent via', workingShare)
  return { success: true }
})

ipcMain.handle('request-camera-access', async () => {
  // Camera access is handled in renderer, this is a placeholder
  // for any additional system-level permissions
  return true
})

// Save video configuration
ipcMain.handle('save-videos-config', async (event, videos) => {
  try {
    // Determine path to videos.json
    let videosJsonPath
    if (app.isPackaged) {
      // Production: in the app.asar (app/dist/ads/videos.json)
      videosJsonPath = path.join(process.resourcesPath, 'app', 'dist', 'ads', 'videos.json')
    } else {
      // Development: in the public folder
      videosJsonPath = path.join(__dirname, '../public/ads/videos.json')
    }

    // Write videos.json
    const config = { videos }
    fs.writeFileSync(videosJsonPath, JSON.stringify(config, null, 2), 'utf8')

    console.log('✅ Saved videos config:', videosJsonPath)
    console.log('📹 Videos:', videos)

    return { success: true, path: videosJsonPath }
  } catch (error) {
    console.error('Error saving videos config:', error)
    return { success: false, error: error.message }
  }
})

// Get video configuration
ipcMain.handle('get-videos-config', async () => {
  try {
    let videosJsonPath
    if (app.isPackaged) {
      videosJsonPath = path.join(process.resourcesPath, 'app', 'dist', 'ads', 'videos.json')
    } else {
      videosJsonPath = path.join(__dirname, '../public/ads/videos.json')
    }

    const data = fs.readFileSync(videosJsonPath, 'utf8')
    const config = JSON.parse(data)
    return { success: true, videos: config.videos || [] }
  } catch (error) {
    console.error('Error loading videos config:', error)
    return { success: false, videos: [] }
  }
})

// Get print settings path
function getPrintSettingsPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'dist', 'ads', 'print-settings.json')
    : path.join(__dirname, '../public/ads', 'print-settings.json')
}

// Default print settings
const DEFAULT_PRINT_SETTINGS = {
  printReceipt: true,
  receiptCopies: 1,
  printSticker: true,
  stickerCopies: 3
}

// Get print settings
ipcMain.handle('get-print-settings', async () => {
  try {
    const settingsPath = getPrintSettingsPath()
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      const saved = JSON.parse(data)
      return { ...DEFAULT_PRINT_SETTINGS, ...saved }
    }
    return DEFAULT_PRINT_SETTINGS
  } catch (error) {
    console.error('Error loading print settings:', error)
    return DEFAULT_PRINT_SETTINGS
  }
})

// Save print settings
ipcMain.handle('save-print-settings', async (event, settings) => {
  try {
    const settingsPath = getPrintSettingsPath()
    const merged = { ...DEFAULT_PRINT_SETTINGS, ...settings }
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8')
    console.log('[PRINT-SETTINGS] Saved:', merged)
    return { success: true, settings: merged }
  } catch (error) {
    console.error('Error saving print settings:', error)
    return { success: false, error: error.message }
  }
})

// Get available monitors/displays
ipcMain.handle('get-displays', async () => {
  try {
    const displays = screen.getAllDisplays()
    console.log('🖥️ Found displays:', displays.length)

    return displays.map((display, index) => ({
      id: index,
      name: display.label || `Monitor ${index + 1}`,
      isPrimary: display === screen.getPrimaryDisplay(),
      bounds: display.bounds,
      workArea: display.workArea,
      size: {
        width: display.bounds.width,
        height: display.bounds.height
      },
      position: {
        x: display.bounds.x,
        y: display.bounds.y
      }
    }))
  } catch (error) {
    console.error('Error getting displays:', error)
    return []
  }
})

// External RS API Configuration
const EXTERNAL_API_BASE = process.env.VITE_EXTERNAL_API_BASE_URL || 'https://mobilejkn.rscahyakawaluyan.com/medinfrasAPI'
const EXTERNAL_API_KEY = process.env.VITE_EXTERNAL_API_KEY || 'workshop'
const EXTERNAL_CONSUMER_ID = process.env.VITE_EXTERNAL_CONSUMER_ID || '123456'
const EXTERNAL_SECRET_KEY = process.env.VITE_EXTERNAL_SECRET_KEY || '0034T2'

/**
 * Generate HMAC SHA256 signature for external RS API
 * Node.js version (no CryptoJS needed)
 */
function generateExternalApiHeaders() {
  const timeStamp = Math.floor(Date.now() / 1000)
  const signature = crypto.createHmac('sha256', EXTERNAL_SECRET_KEY)
    .update(String(timeStamp) + EXTERNAL_CONSUMER_ID)
    .digest('base64')

  return {
    'Accept': 'application/json',
    'X-cons-id': EXTERNAL_CONSUMER_ID,
    'X-signature': signature,
    'X-timestamp': String(timeStamp),
  }
}

/**
 * Validate appointment via external RS API
 * Called from main process to avoid CORS restrictions
 */
ipcMain.handle('validate-appointment-external', async (event, code) => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  const appointmentNo = `OPA/${dateStr}/${code}`
  const url = `${EXTERNAL_API_BASE}/${EXTERNAL_API_KEY}/api/appointment/base/list/information/${dateStr}/${dateStr}`
  const headers = generateExternalApiHeaders()

  console.log('[Main Process] Validating appointment:', { code, appointmentNo, url })

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log('[Main Process] API Status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('[Main Process] API Response:', result)

      if (result.Status !== 'SUCCESS') {
        throw new Error(result.Remarks || 'API returned unsuccessful status')
      }

      let dataField = result.Data
      if (typeof dataField === 'string') {
        dataField = JSON.parse(dataField)
      }

      // API returns {"AppointmentHistory": [...]} - extract the array
      const appointmentList = dataField?.AppointmentHistory || (Array.isArray(dataField) ? dataField : [])

      // Find appointment in the list
      const appointment = appointmentList.find(item => item.AppointmentNo === appointmentNo)

      if (!appointment) {
        throw new Error(`Appointment dengan nomor ${appointmentNo} tidak ditemukan`)
      }

      // DEBUG: Log nilai asli dari API
      console.log('[Main Process] DEBUG - IsNewPatient:', appointment.IsNewPatient, '| CustomerType:', appointment.CustomerType)

      return {
        success: true,
        // Basic Info
        appointmentNo: appointment.AppointmentNo || '-',
        patientName: appointment.PatientName || '-',
        medicalNo: appointment.MedicalNo || '-',
        // Clinic & Doctor
        clinicCode: appointment.ServiceUnitCode || '-',
        clinicName: appointment.ServiceUnitName || '-',
        doctorCode: appointment.ParamedicCode || '-',
        doctorName: appointment.ParamedicName || '-',
        // Schedule
        appointmentDate: appointment.StartDate || appointment.AppointmentDate || dateStr,
        appointmentTime: appointment.StartTime || appointment.AppointmentStartTime || '-',
        appointmentEndTime: appointment.EndTime || appointment.AppointmentEndTime || '-',
        session: appointment.Session !== undefined && appointment.Session !== null ? String(appointment.Session) : '-',
        // Queue
        queueNo: appointment.QueueNo || '-',
        queueAhead: appointment.QueueAheadList || '-',
        // Room
        room: appointment.RoomName || '-',
        roomCode: appointment.RoomCode || '-',
        // Visit
        visitType: appointment.VisitTypeName || '-',
        visitDuration: appointment.VisitTypeDuration || '-',
        // Status
        status: appointment.AppointmentStatus || '-',
        customerType: appointment.CustomerType || '-',
        isNewPatient: appointment.IsNewPatient ? 'Baru' : 'Lama',
        // Patient Info
        sex: appointment.Sex || '-',
        dateOfBirth: appointment.DateOfBirth || '-',
        ageInYear: appointment.AgeInYear || '-',
        mobileNo: appointment.MobileNo1 || '-',
        ssn: appointment.SSN || '-',
        email: appointment.EmailAddress || '-',
        address: appointment.Address || '-',
        cityOfBirth: appointment.CityOfBirth || '-',
        // Registration
        registrationNo: appointment.RegistrationNo || '-',
        registrationDate: appointment.RegistrationDate || '-',
        registrationTime: appointment.RegistrationTime || '-',
        registrationStatus: appointment.RegistrationStatus || '-',
        // Meta
        specialtyName: appointment.SpecialtyName || '-',
        createdDate: appointment.CreatedDate || '-',
      }

    } catch (error) {
      console.error(`[Main Process] Attempt ${attempt + 1} failed:`, error.name, error.message)

      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`[Main Process] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
})

/**
 * Register appointment via external RS API
 * POST /api/appointment/insert/apm/registration1
 */
ipcMain.handle('register-appointment-external', async (event, data) => {
  const { appointmentNo, medicalNo } = data

  if (!appointmentNo || !medicalNo) {
    return { success: false, error: 'AppointmentNo dan MedicalNo wajib diisi' }
  }

  const url = `${EXTERNAL_API_BASE}/${EXTERNAL_API_KEY}/api/appointment/insert/apm/registration1`
  const headers = generateExternalApiHeaders()

  console.log('[Main Process] Registering appointment:', { appointmentNo, medicalNo, url })

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        AppointmentNo: appointmentNo,
        MedicalNo: medicalNo
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    console.log('[Main Process] Registration API Status:', response.status)

    const result = await response.json()
    console.log('[Main Process] Registration API Response:', result)

    if (result.Status !== 'SUCCESS') {
      return { success: false, error: result.Remarks || 'Registrasi gagal' }
    }

    // Parse Data if it's a string
    let responseData = result.Data
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData)
      } catch (e) {
        console.warn('[Main Process] Could not parse Data field:', e)
      }
    }

    return {
      success: true,
      data: responseData
    }
  } catch (error) {
    console.error('[Main Process] Registration error:', error.name, error.message)

    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timeout. Coba lagi.' }
    }

    return { success: false, error: error.message }
  }
})

// Move window to specific monitor
ipcMain.handle('move-to-display', async (event, displayId) => {
  try {
    const displays = screen.getAllDisplays()

    if (displayId < 0 || displayId >= displays.length) {
      return { success: false, error: 'Invalid display ID' }
    }

    const targetDisplay = displays[displayId]

    // Calculate window position to center it on the target display
    const windowBounds = win.getBounds()
    const centerX = targetDisplay.bounds.x + (targetDisplay.bounds.width / 2) - (windowBounds.width / 2)
    const centerY = targetDisplay.bounds.y + (targetDisplay.bounds.height / 2) - (windowBounds.height / 2)

    // Move window to target display
    win.setPosition(Math.floor(centerX), Math.floor(centerY))

    // Ensure fullscreen is applied on the new display
    win.setFullScreen(true)

    console.log(`✅ Moved window to display ${displayId}: ${targetDisplay.label || 'Monitor ' + (displayId + 1)}`)

    return { success: true, display: displayId }
  } catch (error) {
    console.error('Error moving window:', error)
    return { success: false, error: error.message }
  }
})

// Get current display info
ipcMain.handle('get-current-display', async () => {
  try {
    const currentDisplay = screen.getDisplayNearestPoint(win.getBounds())
    const allDisplays = screen.getAllDisplays()
    const currentIndex = allDisplays.findIndex(d => d.id === currentDisplay.id)

    return {
      success: true,
      display: {
        id: currentIndex >= 0 ? currentIndex : 0,
        name: currentDisplay.label || `Monitor ${currentIndex + 1}`,
        isPrimary: currentDisplay === screen.getPrimaryDisplay(),
        bounds: currentDisplay.bounds,
        size: {
          width: currentDisplay.bounds.width,
          height: currentDisplay.bounds.height
        }
      }
    }
  } catch (error) {
    console.error('Error getting current display:', error)
    return { success: false, error: error.message }
  }
})

function generateStickerHTML(data) {
  // Helper get field (support both PascalCase from API and camelCase)
  const g = (p, c) => data[p] || data[c] || '-'
  const nama = g('PatientName', 'patientName')
  const noRM = g('MedicalNo', 'medicalNo')

  // ZPL for ZDesigner ZD230 (203 DPI)
  // 50mm width = 400 dots, dot pitch = 0.125mm
  // Layout: 3 copies, each with Nama + No. RM
  const lineHeight = 70  // dots between lines
  const blockHeight = 110 // dots per block (nama + rm)
  const startY = 30      // first block Y position
  const leftMargin = 30  // left X position

  let zpl = ''
  zpl += '^XA\n'
  zpl += '^CI28\n' // Use ISO8859-1

  // Block 1
  zpl += `^FO${leftMargin},${startY}^ADN,36,18^FD${nama}^FS\n`
  zpl += `^FO${leftMargin},${startY + lineHeight}^ADN,28,14^FDNo. RM: ${noRM}^FS\n`

  // Block 2
  const block2Y = startY + blockHeight
  zpl += `^FO${leftMargin},${block2Y}^ADN,36,18^FD${nama}^FS\n`
  zpl += `^FO${leftMargin},${block2Y + lineHeight}^ADN,28,14^FDNo. RM: ${noRM}^FS\n`

  // Block 3
  const block3Y = startY + blockHeight * 2
  zpl += `^FO${leftMargin},${block3Y}^ADN,36,18^FD${nama}^FS\n`
  zpl += `^FO${leftMargin},${block3Y + lineHeight}^ADN,28,14^FDNo. RM: ${noRM}^FS\n`

  zpl += `^PQ1\n`   // Print 1 copy (3 blocks already in the ZPL)
  zpl += '^XZ\n'

  return zpl
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers for window controls
ipcMain.on('window-minimize', () => {
  if (win) {
    win.minimize()
  }
})

ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  if (win) {
    win.close()
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
