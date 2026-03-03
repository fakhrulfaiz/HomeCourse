import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443, // For ngrok HTTPS
    },
    // Disable host check to allow nginx proxy with any hostname
    allowedHosts: ['localhost', '.ngrok-free.dev', '.ngrok.io'],
  },
})
