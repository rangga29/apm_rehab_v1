import { useState, useEffect } from 'react'
import { videoConfigService } from '../services/videoConfig'
import './SettingsPanel.css'

function SettingsPanel({ onClose, onSave }) {
  const [availableVideos, setAvailableVideos] = useState([])
  const [selectedVideos, setSelectedVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load available videos dan selected videos
  useEffect(() => {
    const loadVideos = async () => {
      try {
        // Load selected videos
        let currentVideos = []

        if (window.electronAPI && window.electronAPI.getVideosConfig) {
          // Use Electron API
          const result = await window.electronAPI.getVideosConfig()
          if (result.success) {
            currentVideos = result.videos
          }
        } else {
          // Fallback: fetch from JSON
          const response = await fetch('./ads/videos.json')
          const config = await response.json()
          currentVideos = config.videos || []
        }

        setSelectedVideos(currentVideos)

        // Scan untuk mencari semua file video yang ada
        const allVideos = []
        for (let i = 1; i <= 20; i++) {
          const fileName = `ad${i}.mp4`
          try {
            await fetch(`./ads/${fileName}`, { method: 'HEAD' })
            allVideos.push(fileName)
          } catch {
            // File tidak ada, stop scanning
            break
          }
        }

        setAvailableVideos(allVideos)
        console.log('📁 Available videos:', allVideos)
        console.log('✅ Selected videos:', currentVideos)
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVideos()
  }, [])

  const handleToggleVideo = (video) => {
    setSelectedVideos(prev => {
      if (prev.includes(video)) {
        return prev.filter(v => v !== video)
      } else {
        return [...prev, video]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Sort video berdasarkan nomor
      const sortedVideos = [...selectedVideos].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''))
        const numB = parseInt(b.replace(/\D/g, ''))
        return numA - numB
      })

      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.saveVideosConfig) {
        // Use Electron API untuk langsung update file
        const result = await window.electronAPI.saveVideosConfig(sortedVideos)

        if (result.success) {
          console.log('✅ Saved to:', result.path)
          console.log('📹 Videos:', sortedVideos)

          alert(`✅ BERHASIL DISIMPAN!\n\n${sortedVideos.length} video dipilih:\n${sortedVideos.join('\n')}\n\nFile videos.json telah diupdate.\nAplikasi akan di-reload otomatis.`)

          if (onSave) {
            onSave(sortedVideos)
          }

          onClose()

          // Reload aplikasi setelah delay
          setTimeout(() => {
            window.location.reload()
          }, 2000)

        } else {
          throw new Error(result.error || 'Gagal menyimpan')
        }

      } else {
        // Fallback untuk development mode (tanpa Electron)
        console.log('ℹ️  Running in browser mode, using download fallback')

        await videoConfigService.saveConfig(sortedVideos)

        alert(`⚠️ MODE BROWSER\n\nFile "videos.json" telah didownload.\n\nLangkah manual:\n1. File akan didownload otomatis\n2. Replace file di: public/ads/videos.json\n3. Refresh aplikasi (tekan F5)\n\nVideo yang dipilih (${sortedVideos.length}):\n${sortedVideos.join('\n')}`)

        onClose()
      }

    } catch (error) {
      console.error('Error saving:', error)
      alert('❌ Gagal menyimpan: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAll = () => {
    setSelectedVideos([...availableVideos])
  }

  const handleDeselectAll = () => {
    setSelectedVideos([])
  }

  if (loading) {
    return (
      <div className="settings-panel-overlay" onClick={onClose}>
        <div className="settings-panel" onClick={e => e.stopPropagation()}>
          <div className="settings-header">
            <h2>⚙️ Setting Video</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          <div className="settings-body">
            <div className="loading-message">Memuat daftar video...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>🎬 Setting Video</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-info">
            <p>Pilih video yang ingin diputar pada mode iklan:</p>
            <p className="settings-hint">
              Total video tersedia: <strong>{availableVideos.length}</strong> |
              Dipilih: <strong>{selectedVideos.length}</strong>
            </p>
          </div>

          <div className="settings-actions">
            <button className="action-button select-all" onClick={handleSelectAll}>
              ✅ Pilih Semua
            </button>
            <button className="action-button deselect-all" onClick={handleDeselectAll}>
              ❌ Batal Pilih
            </button>
          </div>

          <div className="video-list">
            {availableVideos.length === 0 ? (
              <div className="no-videos">
                <p>⚠️ Tidak ada video ditemukan di folder public/ads/</p>
                <p>Pastikan file video menggunakan format: ad1.mp4, ad2.mp4, dst.</p>
              </div>
            ) : (
              availableVideos.map(video => (
                <div
                  key={video}
                  className={`video-item ${selectedVideos.includes(video) ? 'selected' : ''}`}
                  onClick={() => handleToggleVideo(video)}
                >
                  <div className="video-checkbox">
                    {selectedVideos.includes(video) ? '☑️' : '⬜'}
                  </div>
                  <div className="video-info">
                    <div className="video-name">{video}</div>
                    <div className="video-status">
                      {selectedVideos.includes(video) ? '✅ Akan diputar' : '⏸️ Tidak diputar'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="footer-button cancel" onClick={onClose}>
            Batal
          </button>
          <button
            className="footer-button save"
            onClick={handleSave}
            disabled={selectedVideos.length === 0 || saving}
          >
            {saving ? '💾 Menyimpan...' : '💾 Simpan & Reload'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
