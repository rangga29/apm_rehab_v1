// Print Service for APM Rehab Kiosk

class PrintService {
  /**
   * Print proof of registration on thermal receipt printer
   */
  async printReceipt(data) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      const result = await window.electronAPI.printReceipt({
        patientName: data.patientName,
        appointmentCode: data.appointmentCode,
        registrationCode: data.registrationCode,
        date: data.date,
        time: data.time,
        department: data.department
      })

      return result
    } catch (error) {
      console.error('Print receipt error:', error)
      throw new Error(`Failed to print receipt: ${error.message}`)
    }
  }

  /**
   * Print patient sticker on label printer
   */
  async printSticker(data) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    try {
      const result = await window.electronAPI.printSticker({
        patientName: data.patientName,
        registrationCode: data.registrationCode,
        date: data.date,
        department: data.department
      })

      return result
    } catch (error) {
      console.error('Print sticker error:', error)
      throw new Error(`Failed to print sticker: ${error.message}`)
    }
  }

  /**
   * Print both receipt and sticker
   */
  async printAll(data) {
    try {
      const receiptResult = await this.printReceipt(data)

      // Small delay between prints
      await new Promise(resolve => setTimeout(resolve, 1000))

      const stickerResult = await this.printSticker(data)

      return {
        success: true,
        receipt: receiptResult,
        sticker: stickerResult
      }
    } catch (error) {
      console.error('Print all error:', error)
      throw error
    }
  }

  /**
   * Get list of available printers
   */
  async getAvailablePrinters() {
    if (!window.electronAPI) {
      return []
    }

    try {
      const printers = await window.electronAPI.getPrinters()
      return printers
    } catch (error) {
      console.error('Get printers error:', error)
      return []
    }
  }
}

export default new PrintService()
