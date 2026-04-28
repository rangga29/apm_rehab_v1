// Print Service for APM Rehab Kiosk

class PrintService {
  /**
   * Normalize data fields to handle both PascalCase (API) and camelCase variants
   */
  normalize(data) {
    return {
      RegistrationNo: data.RegistrationNo || data.registrationNo || '-',
      AppointmentNo: data.AppointmentNo || data.appointmentNo || '-',
      MedicalNo: data.MedicalNo || data.medicalNo || '-',
      PatientName: data.PatientName || data.patientName || '-',
      DateOfBirth: data.DateOfBirth || data.dateOfBirth || '-',
      ServiceUnitName: data.ServiceUnitName || data.clinicName || '-',
      ParamedicName: data.ParamedicName || data.doctorName || '-',
      BusinessPartnerName: data.BusinessPartnerName || '-',
      Session: data.Session || data.session || '-',
      QueueNo: data.QueueNo || data.queueNo || '-',
      AppointmentTime: data.AppointmentTime || data.appointmentTime || '-',
      Room: data.Room || data.room || '-',
      RegistrationDate: data.RegistrationDate || data.date || '-',
      RegistrationTime: data.RegistrationTime || data.time || '-',
      customerType: data.customerType || '-',
      mobileNo: data.mobileNo || '-'
    }
  }

  /**
   * Get current print settings
   */
  async getSettings() {
    if (!window.electronAPI) {
      return { printReceipt: true, receiptCopies: 1, printSticker: true, stickerCopies: 3 }
    }
    try {
      return await window.electronAPI.getPrintSettings()
    } catch {
      return { printReceipt: true, receiptCopies: 1, printSticker: true, stickerCopies: 3 }
    }
  }

  /**
   * Print proof of registration on thermal receipt printer
   */
  async printReceipt(data, copies = 1) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const normalized = this.normalize(data)
    // Attach copies count so main.js knows how many to print
    normalized._receiptCopies = Math.max(1, Math.min(copies, 10))

    try {
      const result = await window.electronAPI.printReceipt(normalized)
      return result
    } catch (error) {
      console.error('Print receipt error:', error)
      throw new Error(`Gagal mencetak struk: ${error.message}`)
    }
  }

  /**
   * Print patient sticker on label printer
   */
  async printSticker(data, copies = 3) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const normalized = this.normalize(data)
    // Attach copies count so main.js knows how many to print
    normalized._stickerCopies = Math.max(1, Math.min(copies, 10))

    try {
      const result = await window.electronAPI.printSticker(normalized)
      return result
    } catch (error) {
      console.error('Print sticker error:', error)
      throw new Error(`Gagal mencetak stiker: ${error.message}`)
    }
  }

  /**
   * Print receipt and/or sticker based on settings
   */
  async printAll(data) {
    const settings = await this.getSettings()
    console.log('[printService] Settings:', settings)

    const tasks = []

    if (settings.printReceipt && settings.receiptCopies > 0) {
      tasks.push(
        this.printReceipt(data, settings.receiptCopies)
          .catch(err => console.error('[printService] Receipt failed:', err.message))
      )
    } else {
      console.log('[printService] Receipt printing DISABLED')
    }

    if (settings.printSticker && settings.stickerCopies > 0) {
      tasks.push(
        this.printSticker(data, settings.stickerCopies)
          .catch(err => console.error('[printService] Sticker failed:', err.message))
      )
    } else {
      console.log('[printService] Sticker printing DISABLED')
    }

    await Promise.all(tasks)
    return { success: true }
  }

  /**
   * Get list of available printers
   */
  async getAvailablePrinters() {
    if (!window.electronAPI) return []
    try {
      return await window.electronAPI.getPrinters()
    } catch (error) {
      console.error('Get printers error:', error)
      return []
    }
  }
}

export default new PrintService()
