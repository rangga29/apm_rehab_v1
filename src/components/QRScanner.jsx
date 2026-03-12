import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import './QRScanner.css'

function QRScanner({ onScanSuccess, onError }) {
  const scannerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [scannedText, setScannedText] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [scanAttempts, setScanAttempts] = useState(0)
  const html5QrCodeRef = useRef(null)
  const audioContextRef = useRef(null)
  const isStartingRef = useRef(false)
  const isStoppingRef = useRef(false)

  // Initialize audio context for beep sound
  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800 // Beep frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.warn('Could not play beep sound:', error)
    }
  }

  // Get available cameras on mount
  useEffect(() => {
    const getCameras = async () => {
      try {
        console.log('🔍 Getting cameras...')
        console.log('🌐 User agent:', navigator.userAgent)
        console.log('🔒 HTTPS:', window.location.protocol === 'https:')
        console.log('📱 Electron API:', !!window.electronAPI)

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.error('❌ mediaDevices API not available')
          setCameraError('Browser tidak mendukung akses kamera')
          return
        }

        const devices = await Html5Qrcode.getCameras()
        console.log('📷 Available cameras:', devices)

        if (devices && devices.length > 0) {
          setCameras(devices)
          // Auto-select first camera (usually back camera on mobile)
          const defaultCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
          setSelectedCamera(defaultCamera.id)
          console.log('✅ Selected camera:', defaultCamera.label || `Camera ${defaultCamera.id}`)

          // Wait a bit to ensure DOM is ready, then auto-start scanning
          await new Promise(resolve => setTimeout(resolve, 500))
          await startScanning(defaultCamera.id)
        } else {
          console.warn('⚠️ No cameras found')
          setCameraError('Tidak ada kamera yang ditemukan')
        }
      } catch (error) {
        console.error('❌ Error getting cameras:', error)
        console.error('Error details:', error.message)
        console.error('Error stack:', error.stack)
        setCameraError(`Gagal mengakses kamera: ${error.message || 'Pastikan izin kamera diberikan.'}`)
      }
    }

    getCameras()
  }, [])

  const startScanning = async (cameraId = selectedCamera) => {
    // Prevent multiple simultaneous start attempts
    if (isStartingRef.current) {
      console.log('⚠️ Already starting, skipping...')
      return
    }

    // Wait if currently stopping
    if (isStoppingRef.current) {
      console.log('⚠️ Currently stopping, waiting...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    try {
      isStartingRef.current = true
      setIsTransitioning(true)
      setCameraError(null)
      setScannedText(null)

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader')
      }

      // Clear any previous state
      const html5QrCode = html5QrCodeRef.current

      const config = {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        // Tambahkan konfigurasi untuk lebih baik detection
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      }

      // Html5Qrcode only accepts 1 key in camera config
      const cameraConfig = { deviceId: { exact: cameraId } }

      console.log('🎬 Starting camera:', cameraId)
      console.log('📋 Config:', config)

      setScanAttempts(0)

      await html5QrCode.start(
        cameraConfig,
        config,
        (decodedText) => {
          console.log('📱 QR Code scanned:', decodedText)
          console.log('✅ Scan successful after', scanAttempts, 'attempts')

          // Play beep sound
          playBeep()

          setScannedText(decodedText)
          setIsScanning(true)

          // Show success message briefly before processing
          setTimeout(() => {
            onScanSuccess(decodedText)
            stopScanning()
          }, 500)
        },
        (errorMessage) => {
          // Track scan attempts dan error terakhir untuk debugging
          setScanAttempts(prev => {
            const newCount = prev + 1
            // Log error setiap N attempts untuk mengurangi console spam
            if (newCount % 50 === 0) {
              console.warn('⚠️ Scan attempts:', newCount, '- Last error:', errorMessage)
            }
            return newCount
          })

          // Simpan error terakhir untuk ditampilkan jika perlu
          setLastError(errorMessage)

          // Tampilkan error ke user jika error berat (bukan "no qr code found")
          if (errorMessage && !errorMessage.includes('No barcode or QR code')) {
            console.debug('QR scan error:', errorMessage)
          }
        }
      )

      setIsScanning(true)
      console.log('✅ Camera started successfully')
    } catch (error) {
      console.error('❌ Camera error:', error)
      setCameraError(`Tidak dapat mengakses kamera: ${error.message}`)
      setIsScanning(false)
    } finally {
      isStartingRef.current = false
      setIsTransitioning(false)
    }
  }

  const stopScanning = async () => {
    // Prevent multiple simultaneous stop attempts
    if (isStoppingRef.current || !html5QrCodeRef.current) {
      console.log('⚠️ Already stopping or no scanner, skipping...')
      return
    }

    try {
      isStoppingRef.current = true
      setIsTransitioning(true)

      const html5QrCode = html5QrCodeRef.current
      if (html5QrCode) {
        console.log('🛑 Stopping scanner...')
        await html5QrCode.stop()
        console.log('✅ Scanner stopped')
        setIsScanning(false)
      }
    } catch (error) {
      console.error('❌ Error stopping scanner:', error)
      // Continue even if stop fails - try to reset state
      setIsScanning(false)
    } finally {
      isStoppingRef.current = false
      setIsTransitioning(false)
    }
  }

  const handleCameraChange = async (e) => {
    const newCameraId = e.target.value
    console.log('📷 Camera changed to:', newCameraId)
    setSelectedCamera(newCameraId)

    // Stop current scanning if active
    if (isScanning || isStartingRef.current) {
      console.log('🛑 Stopping current scanner before switching...')
      await stopScanning()

      // Wait a bit to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Start with new camera
    await startScanning(newCameraId)
  }

  const handleRetry = async () => {
    console.log('🔄 Retry button clicked')

    // Clear error and wait a bit
    setCameraError(null)

    // Wait for any pending operations
    if (isStoppingRef.current || isStartingRef.current) {
      console.log('⏳ Waiting for pending operations...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Start scanning again
    await startScanning()
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      const cleanup = async () => {
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop()
            console.log('✅ Scanner cleaned up on unmount')
          } catch (error) {
            console.error('❌ Error cleaning up scanner:', error)
          }
        }
        if (audioContextRef.current) {
          try {
            await audioContextRef.current.close()
          } catch (error) {
            console.error('❌ Error closing audio context:', error)
          }
        }
      }
      cleanup()
    }
  }, [])

  return (
    <div className="qr-scanner-container" ref={scannerRef}>
      <div id="qr-reader" className="qr-reader"></div>

      {/* Scan hint overlay - subtle hint for user */}
      {isScanning && !scannedText && !cameraError && (
        <div className="scan-hint-overlay">
          <p>Arahkan QR Code ke kamera</p>
        </div>
      )}

      {/* Scanning Status Indicator - Hide when text is scanned */}
      {isScanning && !scannedText && !cameraError && (
        <div className="scanning-status">
          <div className="scanning-indicator"></div>
          <p className="scanning-text">🔍 Memindai QR Code...</p>
          {scanAttempts > 0 && scanAttempts % 50 === 0 && (
            <p className="scanning-debug">Scan attempts: {scanAttempts}</p>
          )}
        </div>
      )}

      {/* Camera Selection */}
      {cameras.length > 0 && (
        <div className="camera-selector">
          <label htmlFor="camera-select">📷 Pilih Kamera:</label>
          <select
            id="camera-select"
            value={selectedCamera || ''}
            onChange={handleCameraChange}
            className="camera-dropdown"
            disabled={isTransitioning}
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Kamera ${camera.id}`}
              </option>
            ))}
          </select>
          {isTransitioning && <span className="camera-status">Memproses...</span>}
        </div>
      )}

      {/* Scanned Text Display */}
      {scannedText && (
        <div className="scanned-text-display">
          <div className="scanned-text-label">✅ QR Code Terdeteksi:</div>
          <div className="scanned-text-value">{scannedText}</div>
          <div className="scanned-text-hint">Memproses...</div>
        </div>
      )}

      {/* Status Messages */}
      {!isScanning && !cameraError && cameras.length === 0 && (
        <div className="scanner-overlay">
          <div className="loading-spinner"></div>
          <p className="scan-hint">Mendeteksi kamera...</p>
        </div>
      )}

      {cameraError && (
        <div className="scanner-overlay error">
          <p className="error-message">{cameraError}</p>
          <button
            className="retry-button"
            onClick={handleRetry}
            disabled={isTransitioning}
          >
            {isTransitioning ? 'Memproses...' : 'Coba Lagi'}
          </button>
        </div>
      )}

      {/* Debug Info - Only in dev mode, hide when showing results */}
      {import.meta.env.DEV && lastError && !cameraError && !scannedText && (
        <div className="debug-info">
          <details>
            <summary>🐛 Last Error (Dev)</summary>
            <pre>{lastError}</pre>
          </details>
        </div>
      )}
    </div>
  )
}

export default QRScanner
