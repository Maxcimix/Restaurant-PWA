import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',   // ← sin esto, Docker no expone el puerto
    port: 5173,
    watch: {
      usePolling: true, // ← necesario en Windows + Docker para hot reload
    },
  },
  plugins: [react()],
})
