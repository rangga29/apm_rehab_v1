import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import electron from 'vite-plugin-electron'

const isDocker = process.env.VITE_DOCKER === 'true'

const plugins = [react()]

if (!isDocker) {
  plugins.push(
    electron([
      {
        entry: 'electron/main.js',
        onstart(options) {
          options.startup()
        }
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        }
      }
    ])
  )
}

export default defineConfig({
  base: './',
  cacheDir: '/tmp/vite-cache-apm',
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
