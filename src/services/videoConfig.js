// Service untuk mengelola konfigurasi video

export const videoConfigService = {
  // Simpan konfigurasi video (untuk development mode)
  async saveConfig(videos) {
    try {
      // Di production, ini akan memanggil API backend
      // const response = await fetch('/api/save-videos', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ videos })
      // })
      // return response.json()

      // Untuk development, download file JSON
      const config = { videos }
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'videos.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✅ Config downloaded, please place it in /public/ads/')

      return { success: true }
    } catch (error) {
      console.error('Error saving config:', error)
      throw error
    }
  },

  // Load konfigurasi
  async loadConfig() {
    try {
      const response = await fetch('/ads/videos.json')
      const config = await response.json()
      return config
    } catch (error) {
      console.error('Error loading config:', error)
      return { videos: [] }
    }
  }
}
