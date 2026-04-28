const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages to main process
  send: (channel, data) => {
    const validChannels = ['main-process-message', 'print-receipt', 'print-sticker']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  // Receive messages from main process
  on: (channel, func) => {
    const validChannels = ['main-process-message', 'print-complete', 'print-error']
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },

  // Remove listener
  removeListener: (channel, func) => {
    const validChannels = ['main-process-message', 'print-complete', 'print-error']
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func)
    }
  },

  // Get version info
  getVersion: () => process.versions,

  // Get platform info
  getPlatform: () => process.platform,

  // Window controls for kiosk mode
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Printing functions
  printReceipt: (content) => ipcRenderer.invoke('print-receipt', content),
  printSticker: (content) => ipcRenderer.invoke('print-sticker', content),

  // Print settings
  getPrintSettings: () => ipcRenderer.invoke('get-print-settings'),
  savePrintSettings: (settings) => ipcRenderer.invoke('save-print-settings', settings),

  // Get available printers
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // Camera/QR scanning support
  requestCameraAccess: () => ipcRenderer.invoke('request-camera-access'),

  // Video configuration management
  saveVideosConfig: (videos) => ipcRenderer.invoke('save-videos-config', videos),
  getVideosConfig: () => ipcRenderer.invoke('get-videos-config'),

  // Display/monitor management
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  moveToDisplay: (displayId) => ipcRenderer.invoke('move-to-display', displayId),
  getCurrentDisplay: () => ipcRenderer.invoke('get-current-display'),

  // External RS API - calls main process to avoid CORS
  validateAppointmentExternal: (code) => ipcRenderer.invoke('validate-appointment-external', code),

  // Register appointment
  registerAppointmentExternal: (data) => ipcRenderer.invoke('register-appointment-external', data)
})
