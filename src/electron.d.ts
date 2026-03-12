// Electron API type definitions
export interface ElectronAPI {
  send: (channel: string, data: any) => void
  on: (channel: string, func: (...args: any[]) => void) => void
  removeListener: (channel: string, func: (...args: any[]) => void) => void
  getVersion: () => NodeJS.ProcessVersions
  getPlatform: () => NodeJS.Platform
  minimize: () => void
  maximize: () => void
  close: () => void
  printReceipt: (content: PrintContent) => Promise<any>
  printSticker: (content: PrintContent) => Promise<any>
  getPrinters: () => Promise<PrinterInfo[]>
  requestCameraAccess: () => Promise<boolean>
  saveVideosConfig: (videos: string[]) => Promise<{ success: boolean; path?: string; error?: string }>
  getVideosConfig: () => Promise<{ success: boolean; videos: string[] }>
}

export interface PrintContent {
  patientName: string
  appointmentCode: string
  registrationCode: string
  date: string
  time: string
  details?: any
}

export interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
  options?: any
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
