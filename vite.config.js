import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isDocker = process.env.VITE_DOCKER === 'true'

// Conditionally import electron plugin (not needed in Docker)
const plugins = [react()]

if (!isDocker) {
  // Only load electron plugin when NOT in Docker
  const electron = await import('vite-plugin-electron')
  plugins.push(
    electron.default([
      {
        // Main process entry
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ])
  )
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // Use relative paths for file:// protocol compatibility
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: isDocker ? '0.0.0.0' : 'localhost',
    port: parseInt(process.env.PORT || '5173')
  }
})

