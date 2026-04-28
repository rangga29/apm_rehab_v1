import { useState, useEffect } from 'react'
import { videoConfigService } from '../services/videoConfig'
import './SettingsPanel.css'

function SettingsPanel({ onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('video')

  // Video state
  const [availableVideos, setAvailableVideos] = useState([])
  const [selectedVideos, setSelectedVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(true)

  // Print state
  const [printSettings, setPrintSettings] = useState({
    printReceipt: true,
    receiptCopies: 1,
    printSticker: true,
    stickerCopies: 3
  })
  const [loadingPrint, setLoadingPrint] = useState(true)

  const [saving, setSaving] = useState(false)

  // Load videos
  useEffect(() => {
    const loadVideos = async () => {
      try {
        let currentVideos = []
        if (window.electronAPI?.getVideosConfig) {
          const result = await window.electronAPI.getVideosConfig()
          if (result.success) currentVideos = result.videos
        } else {
          const response = await fetch('./ads/videos.json')
          const config = await response.json()
          currentVideos = config.videos || []
        }
        setSelectedVideos(currentVideos)

        const allVideos = []
        for (let i = 1; i <= 20; i++) {
          try {
            await fetch(`./ads/ad${i}.mp4`, { method: 'HEAD' })
            allVideos.push(`ad${i}.mp4`)
          } catch {
            break
          }
        }
        setAvailableVideos(allVideos)
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        setLoadingVideos(false)
      }
    }
    loadVideos()
  }, [])

  // Load print settings
  useEffect(() => {
    const loadPrint = async () => {
      try {
        if (window.electronAPI?.getPrintSettings) {
          const result = await window.electronAPI.getPrintSettings()
          setPrintSettings(result)
        }
      } catch (error) {
        console.error('Error loading print settings:', error)
      } finally {
        setLoadingPrint(false)
      }
    }
    loadPrint()
  }, [])

  const handleToggleVideo = (video) => {
    setSelectedVideos(prev =>
      prev.includes(video) ? prev.filter(v => v !== video) : [...prev, video]
    )
  }

  const handleSelectAll = () => setSelectedVideos([...availableVideos])
  const handleDeselectAll = () => setSelectedVideos([])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save video config
      const sortedVideos = [...selectedVideos].sort((a, b) =>
        parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))
      )

      if (window.electronAPI?.saveVideosConfig) {
        await window.electronAPI.saveVideosConfig(sortedVideos)
      } else {
        await videoConfigService.saveConfig(sortedVideos)
      }

      // Save print settings
      if (window.electronAPI?.savePrintSettings) {
        await window.electronAPI.savePrintSettings(printSettings)
        console.log('[SettingsPanel] Print settings saved:', printSettings)
      }

      alert('✅ BERHASIL DISIMPAN!\nPengaturan video & cetak telah disimpan.\nAplikasi akan di-reload.')
      if (onSave) onSave(sortedVideos)
      onClose()
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      console.error('Error saving:', error)
      alert('❌ Gagal menyimpan: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>PENGATURAN</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            Video
          </button>
          <button
            className={`tab-button ${activeTab === 'cetak' ? 'active' : ''}`}
            onClick={() => setActiveTab('cetak')}
          >
            Pengaturan Cetak
          </button>
        </div>

        <div className="settings-body">
          {/* ── Video Tab ── */}
          {activeTab === 'video' && (
            <>
              <div className="settings-info">
                <p>Pilih video yang ingin diputar pada mode iklan</p>
                <p className="settings-hint">
                  Total: <strong>{availableVideos.length}</strong> |
                  Dipilih: <strong>{selectedVideos.length}</strong>
                </p>
              </div>

              <div className="settings-actions">
                <button className="action-button select-all" onClick={handleSelectAll}>Pilih Semua</button>
                <button className="action-button deselect-all" onClick={handleDeselectAll}>Batal Pilih</button>
              </div>

              {loadingVideos ? (
                <div className="loading-message">Memuat video...</div>
              ) : availableVideos.length === 0 ? (
                <div className="no-videos">
                  <p>⚠️ Tidak ada video ditemukan</p>
                  <p>Format: ad1.mp4, ad2.mp4, dst.</p>
                </div>
              ) : (
                <div className="video-list">
                  {availableVideos.map(video => (
                    <div
                      key={video}
                      className={`video-item ${selectedVideos.includes(video) ? 'selected' : ''}`}
                      onClick={() => handleToggleVideo(video)}
                    >
                      <div className="video-checkbox">
                        {selectedVideos.includes(video) ? (
                          <img src="./icons/check.svg" alt="Selected" style={{width: '24px', height: '24px'}} />
                        ) : (
                          <div style={{width: '24px', height: '24px', border: '2px solid #4facfe', borderRadius: '4px'}} />
                        )}
                      </div>
                      <div className="video-info">
                        <div className="video-name">{video}</div>
                        <div className="video-status">
                          {selectedVideos.includes(video) ? 'Akan diputar' : 'Tidak diputar'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Cetak Tab ── */}
          {activeTab === 'cetak' && (
            <>
              {loadingPrint ? (
                <div className="loading-message">Memuat pengaturan...</div>
              ) : (
                <div className="print-settings">
                  <p className="settings-info">
                    Atur apakah bukti pendaftaran dan stiker akan dicetak, serta jumlah copynya.
                  </p>

                  {/* Bukti Pendaftaran */}
                  <div className="print-setting-row">
                    <label className="print-setting-label">
                      <input
                        type="checkbox"
                        checked={printSettings.printReceipt}
                        onChange={e => setPrintSettings(s => ({ ...s, printReceipt: e.target.checked }))}
                      />
                      <span>Cetak Bukti Pendaftaran</span>
                    </label>
                    <div className="print-setting-copies">
                      <label className="copies-label">Jumlah:</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={printSettings.receiptCopies}
                        onChange={e => setPrintSettings(s => ({
                          ...s,
                          receiptCopies: Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                        }))}
                        disabled={!printSettings.printReceipt}
                        className="copies-input"
                      />
                    </div>
                  </div>

                  {/* Stiker Pasien */}
                  <div className="print-setting-row">
                    <label className="print-setting-label">
                      <input
                        type="checkbox"
                        checked={printSettings.printSticker}
                        onChange={e => setPrintSettings(s => ({ ...s, printSticker: e.target.checked }))}
                      />
                      <span>Cetak Stiker Pasien</span>
                    </label>
                    <div className="print-setting-copies">
                      <label className="copies-label">Jumlah:</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={printSettings.stickerCopies}
                        onChange={e => setPrintSettings(s => ({
                          ...s,
                          stickerCopies: Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                        }))}
                        disabled={!printSettings.printSticker}
                        className="copies-input"
                      />
                    </div>
                  </div>

                  <div className="print-settings-note">
                    <p>ℹ️ Maksimum 10 copy per dokumen. Tombol "Cetak Dokumen" akan mengikuti pengaturan ini.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="settings-footer">
          <button className="footer-button cancel" onClick={onClose}>Batal</button>
          <button
            className="footer-button save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '💾 Menyimpan...' : '💾 Simpan & Reload'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
