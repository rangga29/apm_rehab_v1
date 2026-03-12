import { useState, useRef, useEffect } from 'react'
import './VideoAds.css'

function VideoAds({ onExit }) {
  const videoRef = useRef(null)
  const backgroundVideoRef = useRef(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [ads, setAds] = useState([])
  const [logoExists, setLogoExists] = useState(false)
  const [logoFileName, setLogoFileName] = useState('logo.png')
  const [loading, setLoading] = useState(true)
  const [backgroundVideoLoaded, setBackgroundVideoLoaded] = useState(false)

  // Load ads dari file konfigurasi JSON
  useEffect(() => {
    const loadAds = async () => {
      try {
        const response = await fetch('./ads/videos.json')
        const config = await response.json()
        const videoList = config.videos || []
        const adPaths = videoList.map(video => `./ads/${video}`)
        setAds(adPaths)

        console.log(`📁 Loaded ${adPaths.length} videos from videos.json`)
      } catch (error) {
        console.error('Error loading videos.json:', error)
      } finally {
        setLoading(false)
      }
    }

    const checkLogo = async () => {
      console.log('🔍 Checking for logo files...')
      try {
        // Try logo_rsck.png first (new logo)
        const response1 = await fetch('./logo/logo_rsck.png', { method: 'HEAD' })
        if (response1.ok) {
          console.log('✅ Found logo_rsck.png')
          setLogoExists(true)
          setLogoFileName('logo_rsck.png')
          return
        }
      } catch {
        console.log('⚠️ logo_rsck.png not found, trying logo.png')
      }

      try {
        // Fallback to logo.png
        const response2 = await fetch('./logo/logo.png', { method: 'HEAD' })
        if (response2.ok) {
          console.log('✅ Found logo.png')
          setLogoExists(true)
          setLogoFileName('logo.png')
        }
      } catch {
        console.log('⚠️ logo.png not found')
      }
    }

    loadAds()
    checkLogo()
  }, [])

  // Play video
  useEffect(() => {
    if (loading || ads.length === 0) return

    const video = videoRef.current
    if (!video) return

    const currentVideo = ads[currentVideoIndex]
    video.src = currentVideo
    video.play().catch(err => console.log('Error:', err))

    const handleVideoEnd = () => {
      const nextIndex = (currentVideoIndex + 1) % ads.length
      setCurrentVideoIndex(nextIndex)
    }

    video.addEventListener('ended', handleVideoEnd)

    return () => {
      video.removeEventListener('ended', handleVideoEnd)
    }
  }, [ads, currentVideoIndex, loading])

  // Loading state
  if (loading) {
    return (
      <div className="video-ads-container">
        <video
          ref={backgroundVideoRef}
          className="ads-background-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="./videoBackground1.mp4" type="video/mp4" />
        </video>
        <div className="ads-background-overlay"></div>
        <div className="loading-ads">
          <div className="loading-spinner"></div>
          <p>Memuat konfigurasi video...</p>
        </div>
      </div>
    )
  }

  // No videos
  if (ads.length === 0) {
    return (
      <div className="video-ads-container">
        <video
          ref={backgroundVideoRef}
          className="ads-background-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="./videoBackground1.mp4" type="video/mp4" />
        </video>
        <div className="ads-background-overlay"></div>
        <div className="no-ads-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-logo">
              <span>APM</span>
            </div>
            <h1>APM Rehabilitasi Medik & Fisioterapi</h1>
            <p className="placeholder-hint">
              Klik kanan untuk menu setting
            </p>
            <button className="start-registration-button" onClick={onExit}>
              Mulai Registrasi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="video-ads-container">
      {/* Background Video Layer */}
      <video
        ref={backgroundVideoRef}
        className="ads-background-video"
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={() => {
          console.log('✅ Background video loaded')
          setBackgroundVideoLoaded(true)
        }}
        onError={() => {
          console.warn('⚠️ Background video failed to load')
          setBackgroundVideoLoaded(false)
        }}
      >
        <source src="./videoBackground1.mp4" type="video/mp4" />
      </video>

      {/* Background Overlay untuk blend */}
      <div className="ads-background-overlay"></div>

      {/* Video Frame - CENTERED with Border */}
      <div className="ad-video-frame">
        <video
          ref={videoRef}
          className="ad-video"
          autoPlay
          muted={false}
          playsInline
          loop={ads.length === 1}
        />
      </div>

      {/* UI Overlay - OUTSIDE video */}
      <div className="ads-layout-overlay">
        {/* TOP SECTION */}
        <div className="ads-top-section">
          {/* Title - KIRI */}
          <div className="ads-title-area">
            <div className="ads-title-wrapper">
              <div className="ads-title-content">
                <h1>APM REHABILITASI MEDIK</h1>
              </div>
            </div>
          </div>

          {/* Logo - KANAN ATAS */}
          <div className="ads-logo-area">
            <div className="ads-logo-container">
              {logoExists ? (
                <img src={`./logo/${logoFileName}`} alt="Logo" className="ads-logo-image" />
              ) : (
                <div className="ads-logo-placeholder">
                  <span>Logo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="ads-bottom-section">
          {/* Video Indicators */}
          {ads.length > 1 && (
            <div className="ad-indicators">
              {ads.map((_, index) => (
                <div
                  key={index}
                  className={`ad-dot ${index === currentVideoIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          )}

          {/* Button - CENTER */}
          <div className="ads-button-area">
            <button className="start-registration-button" onClick={onExit}>
              Mulai Registrasi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoAds
