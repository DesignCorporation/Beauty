import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@beauty-platform/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 6003,
    host: '0.0.0.0',
    allowedHosts: [
      'dev-client.beauty.designcorp.eu',
      'client.beauty.designcorp.eu',
      'localhost',
      '135.181.156.117'
    ],
    hmr: false, // Отключаем HMR для production
  },
  preview: {
    port: 6003,
    host: '0.0.0.0',
  }
})