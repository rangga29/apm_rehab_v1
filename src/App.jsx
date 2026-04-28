import { useState, useEffect, useRef } from 'react'

// Helper format tanggal Indonesia
const formatDateIndonesia = (dateStr) => {
  if (!dateStr || dateStr === '-' || dateStr === '') return '-'
  try {
    // Format: YYYYMMDD atau YYYY-MM-DD
    let year, month, day

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        // Cek apakah format DD-Mon-YYYY (29-Sep-2022)
        if (parts[0].length <= 2 && parts[2].length === 4 && parts[1].length === 3) {
          const bulanMap = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Mei': 5, 'Jun': 6, 'Jul': 7, 'Agt': 8, 'Sep': 9, 'Okt': 10, 'Nov': 11, 'Des': 12 }
          day = parts[0]
          month = String(bulanMap[parts[1]] || parts[1]).padStart(2, '0')
          year = parts[2]
        } else if (parts[0].length === 4) {
          // Format YYYY-MM-DD
          [year, month, day] = parts
        } else {
          return dateStr
        }
      } else {
        return dateStr
      }
    } else if (dateStr.includes('/')) {
      // Format YYYY/MM/DD
      [year, month, day] = dateStr.split('/')
    } else if (dateStr.length === 8) {
      // Format YYYYMMDD
      year = dateStr.substring(0, 4)
      month = dateStr.substring(4, 6)
      day = dateStr.substring(6, 8)
    } else {
      return dateStr // Return as is if format doesn't match
    }

    if (!year || !month || !day) return dateStr
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return dateStr

    const bulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    const monthIndex = parseInt(month) - 1
    if (monthIndex < 0 || monthIndex > 11) return dateStr
    return `${parseInt(day)} ${bulan[monthIndex]} ${year}`
  } catch {
    return dateStr
  }
}

// Helper format tipe pasien
const formatPatientType = (type) => {
  if (!type) return '-'
  if (type.toUpperCase() === 'PRIBADI') return 'Umum'
  return type
}

// Helper cek apakah sudah bisa registrasi (30 menit sebelum jadwal)
const canRegister = (appointmentTime) => {
  if (!appointmentTime || appointmentTime === '-') return { canRegister: true, minTime: null }

  try {
    const now = new Date()
    const [hours, minutes] = appointmentTime.split(':').map(Number)
    const appointmentDate = new Date()
    appointmentDate.setHours(hours, minutes, 0, 0)

    const minRegisterTime = new Date(appointmentDate.getTime() - 30 * 60 * 1000)

    return {
      canRegister: now >= minRegisterTime,
      minTime: minRegisterTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    }
  } catch {
    return { canRegister: true, minTime: null }
  }
}

// Komponen Confirm Screen
function ConfirmScreen({ registrationData, appointmentCode, testMode, onConfirm, onCancel, blockByTime, blockNonUmum }) {
  const { canRegister: canRegTime, minTime } = canRegister(registrationData.appointmentTime)

  // Cek apakah pasien umum lama
  // isNewPatient: 'Lama' atau '0' (dari API bisa keduanya)
  // customerType: 'Pribadi' atau 'PRIBADI' (case insensitive dari API)
  const isPasienUmumLama =
    (registrationData.isNewPatient === 'Lama' || registrationData.isNewPatient === '0' || registrationData.isNewPatient === false) &&
    (registrationData.customerType?.toUpperCase() === 'PRIBADI')

  // Blokir aktif jika:
  // 1. Blokir waktu AKTIF dan belum bisa registrasi
  // 2. Blokir non-umum AKTIF dan BUKAN pasien umum lama
  const canReg = (!blockByTime || canRegTime) && (!blockNonUmum || isPasienUmumLama)
  const blockReason = []

  if (blockByTime && !canRegTime) {
    blockReason.push(`Belum Bisa Registrasi. Silakan Registrasi Mulai Jam ${minTime}`)
  }
  if (blockNonUmum && !isPasienUmumLama) {
    blockReason.push('Halaman Ini Hanya Untuk Pasien Umum Lama')
  }

  return (
    <div className="confirm-screen confirm-screen-wide">
      {testMode && (
        <div className="test-mode-badge">TEST MODE</div>
      )}
      <h2>DATA JANJI TEMU</h2>
      <p className="confirm-subtitle">Pastikan data di bawah sudah benar</p>

      <div className="data-columns">
        {/* Kolom Kiri */}
        <div className="data-column">
          <div className="detail-row">
            <span className="label">No. Janji Temu (OPA):</span>
            <span className="value highlight">{appointmentCode}</span>
          </div>
          <div className="detail-row">
            <span className="label">No. RM:</span>
            <span className="value">{registrationData.medicalNo}</span>
          </div>
          <div className="detail-row">
            <span className="label">Tanggal Lahir:</span>
            <span className="value">{formatDateIndonesia(registrationData.dateOfBirth)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Poliklinik:</span>
            <span className="value">{registrationData.clinicName}</span>
          </div>
          <div className="detail-row">
            <span className="label">Dokter:</span>
            <span className="value">{registrationData.doctorName}</span>
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="data-column">
          <div className="detail-row">
            <span className="label">Sesi / No. Antrian:</span>
            <span className="value">Sesi {registrationData.session} / {registrationData.queueNo}</span>
          </div>
          <div className="detail-row">
            <span className="label">Nama Pasien:</span>
            <span className="value">{registrationData.patientName}</span>
          </div>
          <div className="detail-row">
            <span className="label">No. Handphone:</span>
            <span className="value">{registrationData.mobileNo}</span>
          </div>
          <div className="detail-row">
            <span className="label">Ruangan:</span>
            <span className="value">{registrationData.room}</span>
          </div>
          <div className="detail-row">
            <span className="label">Waktu:</span>
            <span className="value">{registrationData.appointmentTime}</span>
          </div>
        </div>
      </div>

      {!canReg && blockReason.length > 0 && (
        <div className="registrasi-warning">
          {blockReason.map((reason, i) => (
            <p key={i}>{reason}</p>
          ))}
        </div>
      )}

      <div className="confirm-actions">
        <button
          className="confirm-button"
          onClick={onConfirm}
          disabled={!canReg}
        >
          Registrasi
        </button>
        <button className="cancel-button" onClick={onCancel}>
          Batal
        </button>
      </div>
    </div>
  )
}

import QRScanner from './components/QRScanner'
import ManualInput from './components/ManualInput'
import VideoAds from './components/VideoAds'
import SettingsPanel from './components/SettingsPanel'
import MonitorPanel from './components/MonitorPanel'
import TopMenu from './components/TopMenu'
import api from './services/api'
import printService from './services/print'
import './App.css'

function App() {
  const [platform, setPlatform] = useState('Loading...')
  const [version, setVersion] = useState('')
  const [mode, setMode] = useState('home') // home, scanner, manual, loading, confirm, success, error, advertisement
  const [appointmentCode, setAppointmentCode] = useState('')
  const [registrationData, setRegistrationData] = useState(null)
  const [error, setError] = useState('')
  const [idleTime, setIdleTime] = useState(0)
  const [loadingText, setLoadingText] = useState('MEMVALIDASI JANJI TEMU')

  // Context menu state
  const [showSettings, setShowSettings] = useState(false)
  const [showMonitor, setShowMonitor] = useState(false)
  const [ads, setAds] = useState([])

  // Blokir state
  const [blockByTime, setBlockByTime] = useState(true) // Default: blokir waktu aktif
  const [blockNonUmum, setBlockNonUmum] = useState(true) // Default: blokir non-pasien umum aktif

  // Printing state (auto-print on success)
  const [printing, setPrinting] = useState(false)
  const autoPrintTriggered = useRef(false)

  // Get idle timeout from environment variable (default: 1800 seconds = 30 minutes)
  const IDLE_TIMEOUT = parseInt(import.meta.env.VITE_IDLE_TIMEOUT || '1800', 10)

  // Get Electron info on mount
  useEffect(() => {
    if (window.electronAPI) {
      setPlatform(window.electronAPI.getPlatform())
      setVersion(`Electron ${window.electronAPI.getVersion().electron}`)
    }
  }, [])

  // Idle detection for advertisement mode
  useEffect(() => {
    if (mode === 'home' || mode === 'scanner' || mode === 'manual') {
      const resetIdle = () => setIdleTime(0)

      const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
      events.forEach(event => {
        window.addEventListener(event, resetIdle)
      })

      const idleTimer = setInterval(() => {
        setIdleTime(prev => {
          if (prev >= IDLE_TIMEOUT) {
            setMode('advertisement')
            return 0
          }
          return prev + 1
        })
      }, 1000)

      return () => {
        clearInterval(idleTimer)
        events.forEach(event => {
          window.removeEventListener(event, resetIdle)
        })
      }
    }
  }, [mode])

  // Auto-print when entering success screen
  useEffect(() => {
    if (mode === 'success' && registrationData && !autoPrintTriggered.current && !printing) {
      autoPrintTriggered.current = true
      setPrinting(true)
      printService.printAll(registrationData)
        .catch(err => console.error('Auto-print error:', err))
        .finally(() => {
          setPrinting(false)
        })
    }
  }, [mode, registrationData, printing])

  // Check if running in test mode (tanpa API) - can be toggled at runtime
  const [testMode, setTestMode] = useState(import.meta.env.VITE_TEST_MODE === 'true')

  const handleQRScan = async (code) => {
    if (testMode) {
      // Test mode: tampilkan hasil scan saja
      setRegistrationData({
        success: true,
        patientName: 'Test Patient',
        appointmentCode: code,
        queueNo: '001',
        medicalNo: '123456',
        customerType: 'PASIEN LAMA',
        clinicName: 'REHABILITASI MEDIK',
        session: '1',
        appointmentTime: '08:00',
        room: 'Ruang 1',
        doctorName: 'Dr. Test',
        dateOfBirth: '01-01-1990',
        _testMode: true
      })
      setAppointmentCode(code)
      setMode('confirm')
    } else {
      await validateAppointmentCode(code)
    }
  }

  const handleManualSubmit = async (code) => {
    if (testMode) {
      // Test mode: tampilkan hasil scan saja
      setRegistrationData({
        success: true,
        patientName: 'Test Patient',
        appointmentCode: code,
        queueNo: '001',
        medicalNo: '123456',
        customerType: 'PASIEN LAMA',
        clinicName: 'REHABILITASI MEDIK',
        session: '1',
        appointmentTime: '08:00',
        room: 'Ruang 1',
        doctorName: 'Dr. Test',
        dateOfBirth: '01-01-1990',
        _testMode: true
      })
      setAppointmentCode(code)
      setMode('confirm')
    } else {
      await validateAppointmentCode(code)
    }
  }

  const validateAppointmentCode = async (code) => {
    setMode('loading')
    setLoadingText('MEMVALIDASI JANJI TEMU')
    setAppointmentCode(code)
    setError('')

    try {
      // Extract hanya kode numeric (jika user input full appointment number)
      // Format: "OPA/20260331/00042" atau hanya "00042"
      let cleanCode = code.toUpperCase().trim()
      if (cleanCode.includes('/')) {
        const parts = cleanCode.split('/')
        cleanCode = parts[parts.length - 1] // Ambil bagian terakhir
      }

      // Gunakan external RS API via Electron IPC (bypasses CORS)
      const result = await window.electronAPI.validateAppointmentExternal(cleanCode)

      // DEBUG: Log nilai asli dari API
      console.log('DEBUG - isNewPatient:', result.isNewPatient, '| customerType:', result.customerType)

      if (result.success) {
        // Simpan data appointment, belum generate registration code
        setRegistrationData({
          success: true,
          ...result,
        })
        setAppointmentCode(result.appointmentNo)
        setMode('confirm')
      } else {
        setError('Kode janji temu tidak ditemukan atau sudah tidak berlaku.')
        setMode('error')
      }
    } catch (err) {
      console.error('Validation error:', err)

      let msg = err.message || ''

      // Buang prefix teknis dari Electron IPC
      if (msg.includes('Error invoking remote method')) {
        // Ambil bagian setelah "Error:" terakhir
        const parts = msg.split('Error:')
        msg = parts[parts.length - 1].trim()
      }

      // Tentukan jenis error berdasarkan isi pesan
      if (msg.includes('not found') || msg.includes('tidak ditemukan') || msg.includes('tidak berlaku')) {
        setError(msg)
      } else if (msg.includes('ECONNREFUSED') || msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('ENOTFOUND')) {
        setError('Koneksi gagal. Pastikan komputer terhubung ke jaringan RS.')
      } else if (msg.includes('permission') || msg.includes('access') || msg.includes('izin')) {
        setError('Tidak memiliki akses ke sistem. Hubungi administrator.')
      } else if (msg) {
        // Jika pesan error sudah berbahasa Indonesia / user-friendly, tampilkan langsung
        setError(msg)
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }

      setMode('error')
    }
  }

  const handleConfirmRegistration = async () => {
    if (!registrationData) return

    // Test mode: skip API call
    if (testMode) {
      setMode('loading')
      setLoadingText('MELAKUKAN REGISTRASI')
      setTimeout(() => {
        const now = new Date()
        setRegistrationData({
          ...registrationData,
          registrationCode: 'REG-TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          registrationSuccess: true,
          date: now.toLocaleDateString('id-ID'),
          time: now.toLocaleTimeString('id-ID'),
        })
        setMode('success')
      }, 1500)
      return
    }

    setMode('loading')
    setLoadingText('MELAKUKAN REGISTRASI')

    try {
      // Panggil API registrasi
      const result = await window.electronAPI.registerAppointmentExternal({
        appointmentNo: appointmentCode,
        medicalNo: registrationData.medicalNo
      })

      if (result.success) {
        // Registrasi berhasil, simpan data response
        const now = new Date()
        setRegistrationData({
          ...registrationData,
          ...result.data,
          registrationSuccess: true,
          date: now.toLocaleDateString('id-ID'),
          time: now.toLocaleTimeString('id-ID'),
        })
        setMode('success')
      } else {
        // Registrasi gagal
        setError(result.error || 'Registrasi gagal. Silakan coba lagi.')
        setMode('error')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('Terjadi kesalahan saat registrasi. Silakan coba lagi.')
      setMode('error')
    }
  }

  const handlePrint = async () => {
    if (!registrationData || printing) return

    try {
      setPrinting(true)
      await printService.printAll(registrationData)
    } catch (err) {
      console.error('Print error:', err)
    } finally {
      setPrinting(false)
    }
  }

  const handleNewRegistration = () => {
    setAppointmentCode('')
    setRegistrationData(null)
    setError('')
    setMode('home')
    setPrinting(false)
    autoPrintTriggered.current = false
  }

  const exitAdvertisement = () => {
    setMode('home')
    setIdleTime(0)
  }

  // Context menu handlers
  const handleOpenSettings = () => {
    console.log('🎬 Opening Settings Panel')
    setShowSettings(true)
  }

  const handleOpenMonitor = () => {
    console.log('🖥️ Opening Monitor Panel')
    setShowMonitor(true)
  }

  const handleReset = () => {
    // Langsung reset tanpa konfirmasi
    setMode('home')
    setIdleTime(0)
    setAppointmentCode('')
    setRegistrationData(null)
    setError('')
  }

  const handleExit = () => {
    // Langsung exit tanpa password, warning, atau konfirmasi
    if (window.electronAPI) {
      window.electronAPI.close()
    }
  }

  const handleSettingsSave = (selectedVideos) => {
    setAds(selectedVideos.map(v => `/ads/${v}`))
  }

  return (
    <>
      {/* Top Menu Bar */}
      <TopMenu
        onOpenSettings={handleOpenSettings}
        onOpenMonitor={handleOpenMonitor}
        onReset={handleReset}
        onExit={handleExit}
        showSettings={showSettings}
        showMonitor={showMonitor}
        onCloseSettings={() => setShowSettings(false)}
        onCloseMonitor={() => setShowMonitor(false)}
        testMode={testMode}
        setTestMode={setTestMode}
        blockByTime={blockByTime}
        setBlockByTime={setBlockByTime}
        blockNonUmum={blockNonUmum}
        setBlockNonUmum={setBlockNonUmum}
      />

      <div className="kiosk-container">

      {/* Home Screen */}
      {mode === 'home' && (
        <div className="home-screen">
          <div className="logo-section">
            <h1>APM REHABILITASI MEDIK</h1>
            <p>APM KHUSUS UNTUK PASIEN UMUM</p>
          </div>

          <div className="mode-selection">
            <button
              className="mode-button primary"
              onClick={() => setMode('scanner')}
            >
              <img src="./icons/qr-scan.svg" alt="QR Scanner" className="button-icon" />
              <div className="button-text">Pindai QR Code</div>
              <div className="button-subtext">Gunakan Kamera Untuk Memindai QR Code</div>
            </button>

            <button
              className="mode-button secondary"
              onClick={() => setMode('manual')}
            >
              <img src="./icons/keyboard.svg" alt="Keyboard" className="button-icon" />
              <div className="button-text">Input Manual</div>
              <div className="button-subtext">Masukkan Kode Janji Temu</div>
            </button>
          </div>

          <div className="system-info">
            <p>Sistem: {platform} | {version}</p>
          </div>
        </div>
      )}

      {/* QR Scanner Mode */}
      {mode === 'scanner' && (
        <div className="scanner-screen">
          <h2>PINDAI QR CODE JANJI TEMU</h2>

          <QRScanner
            onScanSuccess={handleQRScan}
            onError={(err) => setError(err)}
            onGoHome={() => setMode('home')}
          />

          <p className="scanner-note">
            QR Code Terdapat Pada Bukti Pendaftaran Dari Registrasi Online
          </p>

          <button
            className="back-button"
            onClick={() => setMode('home')}
          >
            Kembali
          </button>
        </div>
      )}

      {/* Manual Input Mode */}
      {mode === 'manual' && (
        <div className="manual-screen">
          <ManualInput
            onSubmit={handleManualSubmit}
            onCancel={() => setMode('home')}
          />
        </div>
      )}

      {/* Loading Screen */}
      {mode === 'loading' && (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <h2>{loadingText}</h2>
          <p>Mohon tunggu...</p>
        </div>
      )}

      {/* Confirm Data Screen */}
      {mode === 'confirm' && registrationData && (
        <ConfirmScreen
          registrationData={registrationData}
          appointmentCode={appointmentCode}
          testMode={testMode}
          onConfirm={handleConfirmRegistration}
          onCancel={() => setMode('home')}
          blockByTime={blockByTime}
          blockNonUmum={blockNonUmum}
        />
      )}

      {/* Success Screen */}
      {mode === 'success' && registrationData && (
        <div className="success-screen success-screen-wide">
          {testMode && (
            <div className="test-mode-badge">TEST MODE</div>
          )}
          <img src="./icons/check.svg" alt="Success" className="success-icon" />
          <h2>REGISTRASI BERHASIL!</h2>

          {printing && (
            <div className="printing-indicator">
              <div className="printing-spinner" />
              <span>MENCETAK DOKUMEN...</span>
            </div>
          )}

          <div className="data-columns">
            {/* Kolom Kiri */}
            <div className="data-column">
              <div className="detail-row">
                <span className="label">No. Registrasi (OPR):</span>
                <span className="value highlight">{registrationData.RegistrationNo || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">No. RM:</span>
                <span className="value">{registrationData.MedicalNo || registrationData.medicalNo || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Tanggal Lahir:</span>
                <span className="value">{formatDateIndonesia(registrationData.DateOfBirth || registrationData.dateOfBirth)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Poliklinik:</span>
                <span className="value">{registrationData.ServiceUnitName || registrationData.clinicName || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Dokter:</span>
                <span className="value">{registrationData.ParamedicName || registrationData.doctorName || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Penjamin Bayar:</span>
                <span className="value">{registrationData.BusinessPartnerName || '-'}</span>
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className="data-column">
              <div className="detail-row">
                <span className="label">Sesi / No. Antrian:</span>
                <span className="value">Sesi {registrationData.Session || registrationData.session || '-'} / {registrationData.QueueNo || registrationData.queueNo || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Nama Pasien:</span>
                <span className="value">{registrationData.PatientName || registrationData.patientName || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">No. Handphone:</span>
                <span className="value">{registrationData.mobileNo || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Ruangan:</span>
                <span className="value">{registrationData.Room || registrationData.room || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Tanggal / Jam Registrasi:</span>
                <span className="value">{formatDateIndonesia(registrationData.RegistrationDate)} / {registrationData.RegistrationTime || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Kategori:</span>
                <span className="value">{registrationData.customerType || '-'}</span>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <button className="print-button" onClick={handlePrint}>
              Cetak Dokumen
            </button>
            <button className="new-registration-button" onClick={handleNewRegistration}>
              Registrasi Baru
            </button>
          </div>
        </div>
      )}

      {/* Error Screen */}
      {mode === 'error' && (
        <div className="error-screen">
          <img src="./icons/warning.svg" alt="Error" className="error-icon" />
          <h2>{error.includes('Registrasi') ? 'REGISTRASI GAGAL' : 'JANJI TEMU TIDAK DITEMUKAN'}</h2>
          <p className="error-message">{error}</p>

          <div className="error-actions">
            <button className="home-button" onClick={() => setMode('home')}>
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      )}

      {/* Advertisement Mode */}
      {mode === 'advertisement' && (
        <VideoAds onExit={exitAdvertisement} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}

      {/* Monitor Panel */}
      {showMonitor && (
        <MonitorPanel
          onClose={() => setShowMonitor(false)}
        />
      )}
      </div>
    </>
  )
}

export default App
