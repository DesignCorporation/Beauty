import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const shouldUsePolling = process.env.VITE_USE_POLLING === 'false' ? false : true;

  return ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@beauty-platform/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "zod": path.resolve(__dirname, "../../node_modules/.pnpm/zod@3.25.76/node_modules/zod"),
    },
  },
  server: {
    port: 6001,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      'dev-salon.beauty.designcorp.eu',
      'dev-crm.beauty.designcorp.eu',
      'salon.beauty.designcorp.eu',
      'crm.beauty.designcorp.eu',
      'localhost',
      '135.181.156.117'
    ],
    // HMR включен для HTTPS домена - автоматически определяет хост
    hmr: {
      host: process.env.VITE_HMR_HOST,  // Позволяет браузеру определить хост автоматически
      protocol: 'wss',
      clientPort: 443
    },
    watch: mode === 'development'
      ? {
          usePolling: shouldUsePolling,
          interval: 200,
          ignored: ['**/node_modules/**', '**/dist/**']
        }
      : {
          ignored: ['**/*']
        },
    proxy: {
      '/api': {
        target: 'http://localhost:6020', // API Gateway
        changeOrigin: true,
        // Keep /api prefix so gateway receives the correct path
      },
      '/socket.io': {
        target: 'http://localhost:6020',
        changeOrigin: true,
        ws: true
      },
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@beauty-platform/ui', 'lucide-react', 'sonner']
        },
      },
    },
  },
  preview: {
    port: 6001,
    host: '0.0.0.0',
  }
  })
})
