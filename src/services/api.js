// API Service for APM Rehab Kiosk
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL
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
