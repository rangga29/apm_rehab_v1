import { useState, useEffect, useRef } from 'react'
import './ConfirmDialog.css'

function PasswordDialog({
  show,
  title,
  message,
  onSubmit,
  onCancel,
  submitText = 'Submit',
  cancelText = 'Batal',
  placeholder = 'Masukkan password',
  error = ''
}) {
  const [password, setPassword] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (show && inputRef.current) {
      inputRef.current.focus()
    }
    // Reset password when dialog opens
    if (show) {
      setPassword('')
    }
  }, [show])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (password.trim()) {
      onSubmit(password.trim())
      setPassword('')
    }
  }

  const handleCancel = () => {
    setPassword('')
    onCancel()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!show) return null

  return (
    <div className="confirm-dialog-overlay" onClick={handleCancel}>
      <div
        className="confirm-dialog danger"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon">🔐</span>
          <h3 className="confirm-dialog-title">{title}</h3>
        </div>

        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>

          <form onSubmit={handleSubmit} className="password-form">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={placeholder}
              className="password-input"
              autoComplete="off"
            />

            {error && (
              <div className="password-error">
                <span className="error-icon">❌</span>
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="confirm-dialog-footer">
          <button
            type="button"
            className="confirm-dialog-btn cancel"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm danger"
            onClick={handleSubmit}
            disabled={!password.trim()}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasswordDialog
