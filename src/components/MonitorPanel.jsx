import { useState, useEffect } from 'react'
import './MonitorPanel.css'

function MonitorPanel({ onClose }) {
  const [displays, setDisplays] = useState([])
  const [currentDisplayId, setCurrentDisplayId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState(null)

  // Load available displays
  useEffect(() => {
    const loadDisplays = async () => {
      console.log('🖥️ [MonitorPanel] Starting monitor detection...')
      console.log('🖥️ [MonitorPanel] window.electronAPI available:', !!window.electronAPI)

      try {
        // Check if running in Electron
        if (!window.electronAPI) {
          console.error('❌ [MonitorPanel] window.electronAPI not found')
          setError('Fitur ini hanya berfungsi di aplikasi Desktop')
          setLoading(false)
          return
        }

        if (!window.electronAPI.getDisplays) {
          console.error('❌ [MonitorPanel] getDisplays API not found in electronAPI')
          console.log('🔍 [MonitorPanel] Available APIs:', Object.keys(window.electronAPI))
          setError('API monitor tidak tersedia')
          setLoading(false)
          return
        }

        console.log('✅ [MonitorPanel] Calling getDisplays()...')
        // Get all displays
        const result = await window.electronAPI.getDisplays()
        console.log('📺 [MonitorPanel] getDisplays() result:', result)

        if (Array.isArray(result)) {
          setDisplays(result)
          console.log(`✅ [MonitorPanel] Found ${result.length} displays`)
          result.forEach((d, i) => {
            console.log(`  - Monitor ${i + 1}: ${d.name} (${d.size?.width}x${d.size?.height})`)
          })
        } else {
          console.error('❌ [MonitorPanel] Result is not an array:', typeof result, result)
          setError('Format data monitor tidak valid')
        }

        // Get current display
        if (window.electronAPI?.getCurrentDisplay) {
          console.log('🔍 [MonitorPanel] Getting current display...')
          try {
            const currentResult = await window.electronAPI.getCurrentDisplay()
            console.log('📺 [MonitorPanel] getCurrentDisplay() result:', currentResult)
            if (currentResult?.success && currentResult?.display) {
              setCurrentDisplayId(currentResult.display.id)
              console.log(`✅ [MonitorPanel] Current display ID: ${currentResult.display.id}`)
            }
          } catch (err) {
            console.warn('⚠️ [MonitorPanel] Could not get current display:', err)
          }
        } else {
          console.warn('⚠️ [MonitorPanel] getCurrentDisplay API not available')
        }
      } catch (err) {
        console.error('❌ [MonitorPanel] Error loading displays:', err)
        setError('Gagal memuat daftar monitor')
      } finally {
        setLoading(false)
        console.log('🏁 [MonitorPanel] Monitor detection completed')
      }
    }

    loadDisplays()
  }, [])

  const handleSelectDisplay = async (displayId) => {
    if (moving) return

    console.log(`🖱️ [MonitorPanel] User clicked monitor ${displayId}`)
    setMoving(true)
    setError(null)

    try {
      if (window.electronAPI?.moveToDisplay) {
        console.log(`📡 [MonitorPanel] Calling moveToDisplay(${displayId})...`)
        const result = await window.electronAPI.moveToDisplay(displayId)
        console.log('📺 [MonitorPanel] moveToDisplay() result:', result)

        if (result.success) {
          const displayName = displays[displayId]?.name || `Monitor ${displayId + 1}`
          const displaySize = displays[displayId]?.size
          const sizeInfo = displaySize ? `${displaySize.width}x${displaySize.height}` : ''

          console.log(`✅ [MonitorPanel] Successfully moved to ${displayName}`)
          alert(`Jendela dipindahkan ke:\n${displayName}\n${sizeInfo}`)
          setCurrentDisplayId(displayId)
          onClose()
        } else {
          console.error('❌ [MonitorPanel] Failed to move:', result.error)
          setError(result.error || 'Gagal memindahkan jendela')
        }
      } else {
        console.error('❌ [MonitorPanel] moveToDisplay API not available')
        setError('Fitur tidak tersedia')
      }
    } catch (err) {
      console.error('❌ [MonitorPanel] Error moving display:', err)
      setError('Gagal memindahkan: ' + err.message)
    } finally {
      setMoving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-panel-overlay" onClick={onClose}>
        <div className="settings-panel" onClick={e => e.stopPropagation()}>
          <div className="settings-header">
            <h2>Select Monitor</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          <div className="settings-body">
            <div className="loading-message">Memuat daftar monitor...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Select Monitor</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          {error && (
            <div className="error-message" style={{background: '#fed7d7', color: '#c53030', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>
              {error}
            </div>
          )}

          <div className="settings-info">
            <p>Pilih monitor untuk menampilkan aplikasi kiosk:</p>
            <p className="settings-hint">
              Total monitor: <strong>{displays.length}</strong>
            </p>
          </div>

          <div className="monitor-list">
            {displays.length === 0 ? (
              <div className="no-monitors">
                <p>Tidak ada monitor terdeteksi</p>
              </div>
            ) : (
              displays.map((display) => {
                const isCurrent = currentDisplayId === display.id
                return (
                  <div
                    key={display.id}
                    className={`monitor-item ${isCurrent ? 'current' : ''}`}
                    onClick={() => !moving && handleSelectDisplay(display.id)}
                  >
                    <div className="monitor-icon">
                      {isCurrent ? '✓' : '🖥️'}
                    </div>
                    <div className="monitor-info">
                      <div className="monitor-name">
                        {display.name}
                        {display.isPrimary && <span className="primary-badge">Primary</span>}
                      </div>
                      <div className="monitor-details">
                        Resolusi: {display.size?.width || 0} x {display.size?.height || 0}
                      </div>
                      {isCurrent && (
                        <div className="monitor-status">Aktif</div>
                      )}
                    </div>
                    <button
                      className="monitor-select-button"
                      disabled={moving || isCurrent}
                    >
                      {moving ? '...' : isCurrent ? 'Aktif' : 'Pilih'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="footer-button cancel" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default MonitorPanel
