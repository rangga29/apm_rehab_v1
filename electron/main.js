import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { exec } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// ESM: define __dirname from import.meta
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env for main process
const envPath = path.join(__dirname, '../.env')
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
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win = null

// Printer configurations
const PRINTER_CONFIG = {
  receipt: {
    name: process.env.RECEIPT_PRINTER || 'EPSON TM-T82 Receipt',
    width: 58, // 58mm thermal paper
    silent: true
  },
  sticker: {
    name: process.env.STICKER_PRINTER || 'ZDesigner ZD230-203dpi ZPL',
    width: 50, // 50mm label
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

ipcMain.handle('print-receipt', async (event, content) => {
  const copies = Math.max(1, Math.min(parseInt(content._receiptCopies) || 1, 10))
  delete content._receiptCopies
  console.log('[PRINT-RECEIPT] Starting, copies:', copies)

  const options = {
    silent: true,
    printBackground: true,
    deviceName: PRINTER_CONFIG.receipt.name
  }

  const receiptHTML = generateReceiptHTML(content)
  const errors = []

  for (let i = 1; i <= copies; i++) {
    console.log('[PRINT-RECEIPT] Copy', i, '/', copies)
    try {
      await new Promise((resolve, reject) => {
        const printWindow = new BrowserWindow({
          show: false,
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
      console.log('[PRINT-RECEIPT] Copy', i, 'OK')
    } catch (err) {
      console.error('[PRINT-RECEIPT] Copy', i, 'failed:', err.message)
      errors.push(err)
    }
    // Small delay between copies
    if (i < copies) await new Promise(r => setTimeout(r, 500))
  }

  if (errors.length === copies) {
    throw new Error('Gagal mencetak struk')
  }
  console.log('[PRINT-RECEIPT] Done')
  return { success: true }
})

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
    try { fs.unlinkSync(tmpFile) } catch (_) {}
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
    try { fs.unlinkSync(copyFile) } catch (_) {}
    if (exitCode !== 0 || !/copied/i.test(stdout.trim())) {
      throw new Error(`Gagal cetak stiker copy ${i}`)
    }
    console.log('[PRINT-STICKER] Copy', i, 'OK')
    // Small delay between copies
    if (i < 3) await new Promise(r => setTimeout(r, 300))
  }

  try { fs.unlinkSync(tmpFile) } catch (_) {}

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

// HTML Generators for printing
function generateReceiptHTML(data) {
  // Helper get field (support both PascalCase from API and camelCase)
  const g = (p, c) => data[p] || data[c] || '-'

  // Format tanggal Indonesia
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-'
    try {
      const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      if (dateStr.includes('-') && dateStr.length === 10) {
        const [yyyy, mm, dd] = dateStr.split('-')
        return `${parseInt(dd)} ${bulan[parseInt(mm) - 1]} ${yyyy}`
      }
      return dateStr
    } catch { return dateStr }
  }

  const opNo = g('RegistrationNo', 'registrationNo')
  const opaNo = g('AppointmentNo', 'appointmentNo')
  const noRM = g('MedicalNo', 'medicalNo')
  const nama = g('PatientName', 'patientName')
  const tglLahir = formatDate(g('DateOfBirth', 'dateOfBirth'))
  const poli = g('ServiceUnitName', 'clinicName')
  const dokter = g('ParamedicName', 'doctorName')
  const penjamin = g('BusinessPartnerName', '-')
  const sesi = g('Session', 'session')
  const noAntrian = g('QueueNo', 'queueNo')
  const waktu = g('AppointmentTime', 'appointmentTime')
  const ruang = g('Room', 'room')
  const tglRegistrasi = formatDate(g('RegistrationDate', 'date'))
  const jamRegistrasi = g('RegistrationTime', 'time')
  const kategori = g('customerType', 'CustomerType', '-')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: 58mm;
      padding: 4mm;
    }
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .header h1 { font-size: 14px; margin-bottom: 2px; }
    .header p { font-size: 10px; }
    .section { margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; }
    .label { font-weight: bold; }
    .big-code {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      border: 2px solid #000;
      padding: 6px;
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      border-top: 1px dashed #000;
      padding-top: 4px;
      margin-top: 8px;
      font-size: 9px;
    }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BUKTI PENDAFTARAN</h1>
    <p>APM REHABILITASI MEDIK</p>
  </div>

  <div class="section">
    <div class="row"><span class="label">No. Registrasi:</span><span>${opNo}</span></div>
    <div class="row"><span class="label">No. Janji Temu:</span><span>${opaNo}</span></div>
    <div class="row"><span class="label">No. RM:</span><span>${noRM}</span></div>
    <div class="row"><span class="label">Nama Pasien:</span><span>${nama}</span></div>
    <div class="row"><span class="label">Tgl. Lahir:</span><span>${tglLahir}</span></div>
    <div class="row"><span class="label">Kategori:</span><span>${kategori}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="row"><span class="label">Poliklinik:</span><span>${poli}</span></div>
    <div class="row"><span class="label">Dokter:</span><span>${dokter}</span></div>
    <div class="row"><span class="label">Penjamin Bayar:</span><span>${penjamin}</span></div>
    <div class="row"><span class="label">Sesi / No. Antrian:</span><span>Sesi ${sesi} / ${noAntrian}</span></div>
    <div class="row"><span class="label">Waktu:</span><span>${waktu}</span></div>
    <div class="row"><span class="label">Ruangan:</span><span>${ruang}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="row"><span class="label">Tgl. Registrasi:</span><span>${tglRegistrasi}</span></div>
    <div class="row"><span class="label">Jam Registrasi:</span><span>${jamRegistrasi}</span></div>
  </div>

  <div class="footer">
    <p>Simpan struk ini sebagai bukti pendaftaran</p>
  </div>
</body>
</html>
  `
}

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
