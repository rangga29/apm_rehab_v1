// API Service for APM Rehab Kiosk
import CryptoJS from 'crypto-js'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// External RS API Configuration
const EXTERNAL_API_BASE = import.meta.env.VITE_EXTERNAL_API_BASE_URL || 'https://mobilejkn.rscahyakawaluyan.com/medinfrasAPI'
const EXTERNAL_API_KEY = import.meta.env.VITE_EXTERNAL_API_KEY || 'rsck'
const EXTERNAL_CONSUMER_ID = import.meta.env.VITE_EXTERNAL_CONSUMER_ID || '123456'
const EXTERNAL_SECRET_KEY = import.meta.env.VITE_EXTERNAL_SECRET_KEY || '0034T2'

/**
 * Generate HMAC SHA256 signature headers untuk external RS API
 * Mirip dengan APIHeaderGenerator di Laravel
 */
function generateExternalApiHeaders() {
  const timeStamp = Math.floor(Date.now() / 1000)
  const signature = CryptoJS.HmacSHA256(
    String(timeStamp) + EXTERNAL_CONSUMER_ID,
    EXTERNAL_SECRET_KEY
  )
  const signatureEncoded = signature.toString(CryptoJS.enc.Base64)

  return {
    'Accept': 'application/json',
    'X-cons-id': EXTERNAL_CONSUMER_ID,
    'X-signature': signatureEncoded,
    'X-timestamp': String(timeStamp),
  }
}

/**
 * Retry wrapper dengan exponential backoff + timeout
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

    console.log(`[API] Attempt ${attempt + 1}/${maxRetries}: GET ${url}`)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      console.log(`[API] Status: ${response.status}`)

      if (response.ok) {
        return response
      }

      // Jika bukan server error, langsung return
      if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
        return response
      }

      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error(`[API] Attempt ${attempt + 1} failed:`, error.name, error.message)

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s
        const delay = Math.pow(2, attempt) * 1000
        console.log(`[API] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
}

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  /**
   * Validasi appointment code via External RS API
   * Mirip alur PatientCheck.php di arors_v5
   *
   * Endpoint: /appointment/base/list/information/{date}/{date}
   * Filter:    AppointmentNo = OPA/YYYYMMDD/{code}
   *
   * @param {string} code - Kode appointment (misal: 00042)
   * @returns {Promise<object>} Data appointment yang ditemukan
   */
  async validateAppointmentByExternalApi(code) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}${month}${day}` // contoh: 20260331

    const appointmentNo = `OPA/${dateStr}/${code}`

    const url = `${EXTERNAL_API_BASE}/${EXTERNAL_API_KEY}/appointment/base/list/information/${dateStr}/${dateStr}`
    const headers = generateExternalApiHeaders()

    console.log('[API] validateAppointmentByExternalApi:', { code, appointmentNo, url, headers })

    try {
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: headers,
      })

      if (!response.ok) {
        throw new Error(`Request failed. Status: ${response.status}`)
      }

      const result = await response.json()
      console.log('[API] Response:', result)

      // Parse response JSON (mirip Laravel: $data = json_decode($response->getBody(), true))
      if (result.Status !== 'SUCCESS') {
        throw new Error(result.Remarks || 'API returned unsuccessful status')
      }

      // Parse field data (mirip Laravel: json_decode($data['Data'], true))
      let dataField = result.Data
      if (typeof dataField === 'string') {
        try {
          dataField = JSON.parse(dataField)
        } catch (e) {
          throw new Error('Failed to parse API Data field')
        }
      }

      // Jika Data sudah berupa array/list appointment
      if (Array.isArray(dataField)) {
        const appointment = dataField.find(item => item.AppointmentNo === appointmentNo)

        if (!appointment) {
          throw new Error(`Appointment dengan nomor ${appointmentNo} tidak ditemukan`)
        }

        return {
          success: true,
          appointmentNo: appointment.AppointmentNo,
          patientName: appointment.PatientName || appointment.Patient?.Name || '-',
          medicalNo: appointment.MedicalNo || appointment.Patient?.MedicalNo || '-',
          clinicCode: appointment.ClinicCode || '-',
          clinicName: appointment.ClinicName || appointment.Poliklinik || '-',
          doctorCode: appointment.DoctorCode || '-',
          doctorName: appointment.DoctorName || appointment.Dokter || '-',
          appointmentDate: appointment.AppointmentDate || dateStr,
          appointmentTime: appointment.AppointmentTime || appointment.Session || '-',
          queueNo: appointment.QueueNo || '-',
          status: appointment.Status || '-',
        }
      }

      // Jika Data berupa object single appointment
      if (dataField.AppointmentNo === appointmentNo) {
        return {
          success: true,
          appointmentNo: dataField.AppointmentNo,
          patientName: dataField.PatientName || dataField.Patient?.Name || '-',
          medicalNo: dataField.MedicalNo || dataField.Patient?.MedicalNo || '-',
          clinicCode: dataField.ClinicCode || '-',
          clinicName: dataField.ClinicName || dataField.Poliklinik || '-',
          doctorCode: dataField.DoctorCode || '-',
          doctorName: dataField.DoctorName || dataField.Dokter || '-',
          appointmentDate: dataField.AppointmentDate || dateStr,
          appointmentTime: dataField.AppointmentTime || dataField.Session || '-',
          queueNo: dataField.QueueNo || '-',
          status: dataField.Status || '-',
        }
      }

      throw new Error(`Appointment dengan nomor ${appointmentNo} tidak ditemukan`)

    } catch (error) {
      console.error('[API] External API Error:', error.name, error.message)
      throw error
    }
  }

  async validateAppointmentCode(code) {
    try {
      const response = await fetch(`${this.baseURL}/appointments/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.toUpperCase().trim() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Invalid appointment code')
      }

      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  async registerPatient(appointmentData) {
    try {
      const response = await fetch(`${this.baseURL}/patients/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Registration failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Registration Error:', error)
      throw error
    }
  }

  async getPatientDetails(registrationCode) {
    try {
      const response = await fetch(`${this.baseURL}/patients/${registrationCode}`)

      if (!response.ok) {
        throw new Error('Patient not found')
      }

      return await response.json()
    } catch (error) {
      console.error('Get Patient Error:', error)
      throw error
    }
  }

  async syncOfflineData(records) {
    try {
      const response = await fetch(`${this.baseURL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records })
      })

      return await response.json()
    } catch (error) {
      console.error('Sync Error:', error)
      throw error
    }
  }
}

// Mock API for development/testing
class MockAPIService {
  constructor() {
    // Simulate database
    this.mockAppointments = new Map([
      ['ABC123456', {
        patientName: 'John Doe',
        department: 'Physical Therapy',
        appointmentDate: new Date().toISOString(),
        appointmentTime: '10:00 AM'
      }],
      ['XYZ789012', {
        patientName: 'Jane Smith',
        department: 'Occupational Therapy',
        appointmentDate: new Date().toISOString(),
        appointmentTime: '2:30 PM'
      }],
      ['TEST123456', {
        patientName: 'Test Patient',
        department: 'General Checkup',
        appointmentDate: new Date().toISOString(),
        appointmentTime: '11:00 AM'
      }]
    ])
  }

  async validateAppointmentCode(code) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    const normalizedCode = code.toUpperCase().trim()

    if (!normalizedCode || normalizedCode.length < 6) {
      throw new Error('Invalid appointment code format')
    }

    const appointment = this.mockAppointments.get(normalizedCode)

    if (!appointment) {
      throw new Error('Appointment code not found. Please check and try again.')
    }

    // Generate registration data
    return {
      success: true,
      patientName: appointment.patientName,
      appointmentCode: normalizedCode,
      registrationCode: 'REG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      department: appointment.department,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime
    }
  }

  async registerPatient(appointmentData) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      success: true,
      ...appointmentData
    }
  }

  async validateAppointmentByExternalApi(code) {
    // Fallback mock: cari di mockAppointments
    await new Promise(resolve => setTimeout(resolve, 1000))
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}${month}${day}`
    const appointmentNo = `OPA/${dateStr}/${code}`

    const appointment = this.mockAppointments.get(code.toUpperCase().trim())

    if (!appointment) {
      throw new Error(`Appointment dengan nomor ${appointmentNo} tidak ditemukan (Mock)`)
    }

    return {
      success: true,
      appointmentNo: appointmentNo,
      patientName: appointment.patientName,
      medicalNo: '00000000',
      clinicCode: '-',
      clinicName: appointment.department,
      doctorCode: '-',
      doctorName: '-',
      appointmentDate: dateStr,
      appointmentTime: appointment.appointmentTime,
      queueNo: '1',
      status: 'ACTIVE',
    }
  }

  async getPatientDetails(registrationCode) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      registrationCode,
      status: 'registered'
    }
  }

  async syncOfflineData(records) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true, synced: records.length }
  }
}

// Use mock API in development, real API in production
const useMockAPI = import.meta.env.VITE_USE_MOCK_API !== 'false'

export default useMockAPI ? new MockAPIService() : new APIService()
