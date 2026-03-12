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
        <span>⚙️ Menu Kiosk</span>
      </div>

      <div className="context-menu-items">
        <button className="context-menu-item setting" onClick={() => handleMenuClick(onOpenSettings)}>
          <span className="menu-icon">🎬</span>
          <div>
            <span className="menu-text">Setting Video</span>
            <span className="menu-desc">Pilih video yang diputar</span>
          </div>
        </button>

        <button className="context-menu-item monitor" onClick={() => handleMenuClick(onOpenMonitor)}>
          <span className="menu-icon">🖥️</span>
          <div>
            <span className="menu-text">Select Monitor</span>
            <span className="menu-desc">Pilih monitor untuk tampilan</span>
          </div>
        </button>

        <button className="context-menu-item reset" onClick={() => handleMenuClick(onReset)}>
          <span className="menu-icon">🔄</span>
          <div>
            <span className="menu-text">Reset Kiosk</span>
            <span className="menu-desc">Kembali ke halaman utama</span>
          </div>
        </button>

        <div className="context-menu-divider"></div>

        <button className="context-menu-item exit" onClick={() => handleMenuClick(onExit)}>
          <span className="menu-icon">🚪</span>
          <div>
            <span className="menu-text">Exit Kiosk</span>
            <span className="menu-desc">Keluar dari mode kiosk</span>
          </div>
        </button>
      </div>
    </div>,
    document.body
  )
}

export default ContextMenu
