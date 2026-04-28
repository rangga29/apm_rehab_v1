import { useState, useEffect, useRef } from 'react'
import './ManualInput.css'

function ManualInput({ onSubmit, onCancel }) {
  const [suffix, setSuffix] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // Generate tanggal hari ini dalam format YYYYMMDD
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  const prefix = `OPA/${getTodayDate()}/`

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!suffix.trim()) {
      setError('Mohon masukkan 5 digit angka')
      return
    }

    if (suffix.length !== 5 || !/^\d+$/.test(suffix)) {
      setError('Harap masukkan tepat 5 digit angka')
      return
    }

    const fullCode = prefix + suffix
    onSubmit(fullCode)
  }

  const handleNumberClick = (num) => {
    if (suffix.length < 5) {
      setSuffix(suffix + num)
      setError('')
    }
  }

  const handleBackspace = () => {
    if (suffix.length > 0) {
      setSuffix(suffix.slice(0, -1))
      setError('')
    }
  }

  const handleClear = () => {
    setSuffix('')
    setError('')
  }

  return (
    <div className="manual-input-container">
      <h2>MASUKKAN KODE JANJI TEMU</h2>
      <p className="input-instruction">
        Masukkan 5 Digit Angka Terakhir Dari Kode Pada Bukti Pendaftaran Registrasi Online Anda
      </p>

      <form onSubmit={handleSubmit} className="input-form-horizontal">
        <div className="input-section">
          <div className="input-group">
            <div className="code-input-wrapper">
              <span className="code-prefix">{prefix}</span>
              <input
                ref={inputRef}
                type="text"
                value={suffix}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                  setSuffix(value)
                  setError('')
                }}
                placeholder="_____"
                className="code-input"
                autoFocus
                maxLength={5}
                inputMode="numeric"
              />
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="button-group">
            <button type="submit" className="submit-button">
              Kirim Kode
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} className="cancel-button">
                Kembali
              </button>
            )}
          </div>
        </div>

        {/* Numeric Keypad for Touchscreen */}
        <div className="numeric-keypad">
          <div className="keypad-row">
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('1')}>1</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('2')}>2</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('3')}>3</button>
          </div>
          <div className="keypad-row">
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('4')}>4</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('5')}>5</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('6')}>6</button>
          </div>
          <div className="keypad-row">
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('7')}>7</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('8')}>8</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('9')}>9</button>
          </div>
          <div className="keypad-row">
            <button type="button" className="keypad-btn clear-btn" onClick={handleClear}>C</button>
            <button type="button" className="keypad-btn" onClick={() => handleNumberClick('0')}>0</button>
            <button type="button" className="keypad-btn backspace-btn" onClick={handleBackspace}>
              <img src="./icons/x.svg" alt="Delete" style={{width: '24px', height: '24px'}} />
            </button>
          </div>
        </div>
      </form>

      <div className="input-tips">
        <ul>
          <li>Kode OPA Terdapat Pada Bukti Pendaftaran Dari Registrasi Online</li>
          <li>Kode Terdiri Dari 5 Digit Angka</li>
          <li>Gunakan Tombol Angka Di Layar Untuk Input</li>
          <li>Gunakan Tombol X Untuk Menghapus Satu Digit Angka</li>
          <li>Gunakan Tombol C Untuk Menghapus Semua Digit Angka</li>
        </ul>
      </div>
    </div>
  )
}

export default ManualInput
