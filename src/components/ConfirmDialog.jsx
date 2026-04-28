import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

function ConfirmDialog({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Ya',
  cancelText = 'Tidak',
  type = 'warning' // warning, danger, info
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (show && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [show])

  if (!show) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className={`confirm-dialog ${type}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="confirm-dialog-header">
          {type === 'warning' && <img src="./icons/warning.svg" alt="Warning" className="confirm-dialog-icon" />}
          {type === 'danger' && <img src="./icons/door.svg" alt="Exit" className="confirm-dialog-icon" />}
          {type === 'info' && <img src="./icons/info.svg" alt="Info" className="confirm-dialog-icon" />}
          <h3 className="confirm-dialog-title">{title}</h3>
        </div>

        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-footer">
          <button
            className="confirm-dialog-btn cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-btn confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
