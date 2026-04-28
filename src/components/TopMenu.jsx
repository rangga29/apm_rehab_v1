import { useState, useRef, useEffect } from 'react'
import './TopMenu.css'

function TopMenu({ onOpenSettings, onOpenMonitor, onReset, onExit, showSettings, showMonitor, onCloseSettings, onCloseMonitor, testMode, setTestMode, blockByTime, setBlockByTime, blockNonUmum, setBlockNonUmum }) {
  const [openMenu, setOpenMenu] = useState(null)
  const [visible, setVisible] = useState(false)
  const menuRef = useRef(null)

  // Toggle menu visibility with Ctrl+Shift+M, Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        setVisible(v => !v)
        setOpenMenu(null)
      }
      if (e.key === 'Escape') {
        handleHideAll()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuClick = (menuName, action) => {
    if (action) {
      action()
    }
    setOpenMenu(openMenu === menuName ? null : menuName)
  }

  // Handle hiding both menu and panels
  const handleHideAll = () => {
    setVisible(false)
    setOpenMenu(null)
    if (onCloseSettings) onCloseSettings()
    if (onCloseMonitor) onCloseMonitor()
  }

  // Hidden trigger area at top-left corner (very small, ~6px)
  // Users won't accidentally trigger it, only intentional click
  const handleHiddenTriggerClick = () => {
    setVisible(v => !v)
  }

  const menus = [
    {
      name: 'file',
      label: 'File',
      items: [
        {
          label: 'Reset Kiosk',
          icon: './icons/refresh.svg',
          action: () => { onReset(); handleHideAll() }
        },
        { divider: true },
        {
          label: 'Exit',
          icon: './icons/door.svg',
          action: () => { onExit(); handleHideAll() }
        }
      ]
    },
    {
      name: 'settings',
      label: 'Pengaturan',
      items: [
        {
          label: 'Pengaturan Video',
          icon: './icons/settings.svg',
          action: () => { setVisible(false); setOpenMenu(null); onOpenSettings() }
        },
        {
          label: 'Pilih Monitor',
          icon: './icons/monitor.svg',
          action: () => { setVisible(false); setOpenMenu(null); onOpenMonitor() }
        },
        { divider: true },
        {
          label: testMode ? '✓ Test mode aktif' : 'Test mode nonaktif',
          icon: './icons/check.svg',
          action: () => { setTestMode(!testMode); handleHideAll() }
        },
        { divider: true },
        {
          label: blockByTime ? '✓ Blokir Waktu Registrasi' : 'Blokir Waktu Registrasi',
          icon: './icons/check.svg',
          action: () => { setBlockByTime(!blockByTime); handleHideAll() }
        },
        {
          label: blockNonUmum ? '✓ Blokir Non-Pasien Umum' : 'Blokir Non-Pasien Umum',
          icon: './icons/check.svg',
          action: () => { setBlockNonUmum(!blockNonUmum); handleHideAll() }
        }
      ]
    }
  ]

  // Hide button closes both menu and any open panels
  const handleHideClick = () => {
    handleHideAll()
  }

  // Don't show menu bar if panels are open
  if (showSettings || showMonitor) {
    return null
  }

  if (!visible) {
    // Tiny hidden trigger at top-left corner
    return (
      <div
        className="top-menu-hidden-trigger"
        onClick={handleHiddenTriggerClick}
        title="Tekan Ctrl+Shift+M atau klik di sini untuk membuka menu"
      />
    )
  }

  return (
    <div className="top-menu-bar" ref={menuRef}>
      <div className="top-menu-brand">
        <img src="/logo/logo_rsck.png" alt="Logo" className="top-menu-logo" />
        <span className="top-menu-title">APM Rehab Kiosk</span>
      </div>

      <div className="top-menu-items">
        {menus.map((menu) => (
          <div key={menu.name} className="top-menu-item-wrapper">
            <button
              className={`top-menu-item ${openMenu === menu.name ? 'active' : ''}`}
              onClick={() => handleMenuClick(menu.name, openMenu === menu.name ? null : () => setOpenMenu(menu.name))}
              onMouseEnter={() => openMenu && setOpenMenu(menu.name)}
            >
              {menu.label}
            </button>

            {openMenu === menu.name && (
              <div className="top-menu-dropdown">
                {menu.items.map((item, index) => (
                  item.divider ? (
                    <div key={`divider-${index}`} className="top-menu-divider" />
                  ) : (
                    <button
                      key={item.label}
                      className="top-menu-dropdown-item"
                      onClick={item.action}
                    >
                      <img src={item.icon} alt={item.label} className="top-menu-dropdown-icon" />
                      {item.label}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hide button */}
      <button
        className="top-menu-hide-btn"
        onClick={handleHideClick}
        title="Sembunyikan menu (Ctrl+Shift+M)"
      >
        ✕
      </button>
    </div>
  )
}

export default TopMenu
