import { createPortal } from 'react-dom'
import './ContextMenu.css'

function ContextMenu({ x, y, onClose, onOpenSettings, onOpenMonitor, onReset, onExit }) {
  const handleMenuClick = (handler) => {
    onClose()
    setTimeout(() => handler(), 10)
  }

  return createPortal(
    <div
      className="context-menu"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
    >
      <div className="context-menu-header">
        <span>MENU KIOSK</span>
      </div>

      <div className="context-menu-items">
        <button className="context-menu-item setting" onClick={() => handleMenuClick(onOpenSettings)}>
          <img src="./icons/settings.svg" alt="Settings" className="menu-icon" />
          <div>
            <span className="menu-text">Pengaturan Video</span>
            <span className="menu-desc">Pilih video yang diputar pada mode iklan</span>
          </div>
        </button>

        <button className="context-menu-item monitor" onClick={() => handleMenuClick(onOpenMonitor)}>
          <img src="./icons/monitor.svg" alt="Monitor" className="menu-icon" />
          <div>
            <span className="menu-text">Pilih Monitor</span>
            <span className="menu-desc">Pilih monitor untuk tampilan</span>
          </div>
        </button>

        <button className="context-menu-item reset" onClick={() => handleMenuClick(onReset)}>
          <img src="./icons/refresh.svg" alt="Reset" className="menu-icon" />
          <div>
            <span className="menu-text">Reset Kiosk</span>
            <span className="menu-desc">Kembali ke halaman utama</span>
          </div>
        </button>

        <div className="context-menu-divider"></div>

        <button className="context-menu-item exit" onClick={() => handleMenuClick(onExit)}>
          <img src="./icons/door.svg" alt="Exit" className="menu-icon" />
          <div>
            <span className="menu-text">Keluar</span>
            <span className="menu-desc">Keluar dari mode kiosk</span>
          </div>
        </button>
      </div>
    </div>,
    document.body
  )
}

export default ContextMenu
