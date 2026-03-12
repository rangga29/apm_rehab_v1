import { useState, useEffect } from 'react'
import QRScanner from './components/QRScanner'
import ManualInput from './components/ManualInput'
import VideoAds from './components/VideoAds'
import ContextMenu from './components/ContextMenu'
import SettingsPanel from './components/SettingsPanel'
import MonitorPanel from './components/MonitorPanel'
import api from './services/api'
import printService from './services/print'
import './App.css'

function App() {
  const [platform, setPlatform] = useState('Loading...')
  const [version, setVersion] = useState('')
  const [mode, setMode] = useState('home') // home, scanner, manual, loading, success, error, advertisement
  const [appointmentCode, setAppointmentCode] = useState('')
  const [registrationData, setRegistrationData] = useState(null)
  const [error, setError] = useState('')
  const [idleTime, setIdleTime] = useState(0)

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showMonitor, setShowMonitor] = useState(false)
  const [ads, setAds] = useState([])

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

  const handleQRScan = async (code) => {
    await validateAppointmentCode(code)
  }

  const handleManualSubmit = async (code) => {
    await validateAppointmentCode(code)
  }

  const validateAppointmentCode = async (code) => {
    setMode('loading')
    setAppointmentCode(code)
    setError('')

    try {
      const result = await api.validateAppointmentCode(code)

      if (result.success) {
        setRegistrationData(result)
        setMode('success')
      } else {
        setError('Unable to process appointment. Please try again.')
        setMode('error')
      }
    } catch (err) {
      console.error('Validation error:', err)
      setError(err.message || 'Invalid appointment code. Please try again.')
      setMode('error')
    }
  }

  const handlePrint = async () => {
    if (!registrationData) return

    try {
      // Show printing state
      setMode('loading')

      // Print both receipt and sticker
      await printService.printAll(registrationData)

      // Return to home after successful print
      setTimeout(() => {
        handleNewRegistration()
      }, 2000)
    } catch (error) {
      console.error('Print error:', error)
      setError(`Printing failed: ${error.message}`)
      setMode('error')
    }
  }

  const handleNewRegistration = () => {
    setAppointmentCode('')
    setRegistrationData(null)
    setError('')
    setMode('home')
  }

  const exitAdvertisement = () => {
    setMode('home')
    setIdleTime(0)
  }

  // Context menu handlers
  const handleContextMenu = (e) => {
    e.preventDefault()
    console.log('🖱️ Right clicked at:', e.clientX, e.clientY)
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    })
  }

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
    <div className="kiosk-container" onContextMenu={handleContextMenu}>
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
              <div className="button-icon">📷</div>
              <div className="button-text">Pindai QR Code</div>
              <div className="button-subtext">Gunakan kamera untuk memindai</div>
            </button>

            <button
              className="mode-button secondary"
              onClick={() => setMode('manual')}
            >
              <div className="button-icon">⌨️</div>
              <div className="button-text">Input Manual</div>
              <div className="button-subtext">Masukkan kode janji temu</div>
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
          <button
            className="back-button"
            onClick={() => setMode('home')}
          >
            ← Kembali
          </button>

          <h2>Pindai QR Code Janji Temu</h2>

          <QRScanner
            onScanSuccess={handleQRScan}
            onError={(err) => setError(err)}
          />

          <button
            className="manual-fallback"
            onClick={() => setMode('manual')}
          >
            Kamera tidak berfungsi? Input manual
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
          <h2>Memvalidasi Janji Temu...</h2>
          <p>Mohon tunggu saat kami memverifikasi kode Anda</p>
        </div>
      )}

      {/* Success Screen */}
      {mode === 'success' && registrationData && (
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h2>Registrasi Berhasil!</h2>

          <div className="registration-details">
            <div className="detail-row">
              <span className="label">Nama Pasien:</span>
              <span className="value">{registrationData.patientName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Kode Registrasi:</span>
              <span className="value highlight">{registrationData.registrationCode}</span>
            </div>
            <div className="detail-row">
              <span className="label">Departemen:</span>
              <span className="value">{registrationData.department}</span>
            </div>
            <div className="detail-row">
              <span className="label">Tanggal:</span>
              <span className="value">{registrationData.date}</span>
            </div>
            <div className="detail-row">
              <span className="label">Waktu:</span>
              <span className="value">{registrationData.time}</span>
            </div>
          </div>

          <div className="success-actions">
            <button className="print-button" onClick={handlePrint}>
              🖨️ Cetak Dokumen
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
          <div className="error-icon">⚠️</div>
          <h2>Registrasi Gagal</h2>
          <p className="error-message">{error}</p>

          <div className="error-actions">
            <button className="retry-button" onClick={() => setMode('scanner')}>
              Coba Lagi
            </button>
            <button className="home-button" onClick={() => setMode('home')}>
              Ke Halaman Utama
            </button>
          </div>
        </div>
      )}

      {/* Advertisement Mode */}
      {mode === 'advertisement' && (
        <VideoAds onExit={exitAdvertisement} />
      )}

      {/* Context Menu - Available on all screens */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenSettings={handleOpenSettings}
          onOpenMonitor={handleOpenMonitor}
          onReset={handleReset}
          onExit={() => {
            setContextMenu(null)
            handleExit()
          }}
        />
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
  )
}

export default App
