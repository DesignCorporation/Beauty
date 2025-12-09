import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// ⚠️ Dev CSP relaxed to allow Vite preamble/HMR (unsafe-inline/unsafe-eval)
const cspHeader =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: http: wss: ws:; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || env.VITE_API_URL)
  },
  plugins: [react({
    jsxRuntime: 'automatic'
  })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@beauty-platform/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@beauty-platform/client-sdk": path.resolve(__dirname, "../../packages/client-sdk/src"),
    },
  },
  server: {
    port: 6002,
    host: '0.0.0.0',
    headers: {
      'Content-Security-Policy': cspHeader
    },
    allowedHosts: [
      'dev-admin.beauty.designcorp.eu',
      'admin.beauty.designcorp.eu',
      'dev-salon.beauty.designcorp.eu',
      'salon.beauty.designcorp.eu',
      'dev-client.beauty.designcorp.eu',
      'client.beauty.designcorp.eu',
      'localhost',
      '135.181.156.117'
    ],
    proxy: {
      '/api': {
        target: process.env.API_GATEWAY_URL || 'http://localhost:6020',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
              console.log('🍪 Vite Proxy: Forwarding cookies to backend:', req.headers.cookie.substring(0, 100) + '...');
            }
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            if (req.headers.origin) {
              proxyReq.setHeader('Origin', req.headers.origin);
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (proxyRes.headers['set-cookie']) {
              res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
              console.log('🍪 Vite Proxy: Forwarding Set-Cookie to frontend:', proxyRes.headers['set-cookie']);
            }
            const origin = req.headers.origin;
            if (origin) {
              res.setHeader('Access-Control-Allow-Origin', origin);
              res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            console.log(`🔄 Vite Proxy: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        }
      },
      '/uploads': {
        target: process.env.IMAGES_API_URL || 'http://localhost:6026',
        changeOrigin: true,
        secure: false
      }
    },
    hmr: process.env.NODE_ENV === 'development'
      ? {
          host: process.env.VITE_HMR_HOST || 'dev-admin.beauty.designcorp.eu',
          port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 443,
          protocol: process.env.VITE_HMR_PROTOCOL || 'wss'
        }
      : undefined
  },
  preview: {
    port: 6002,
    host: '0.0.0.0',
    headers: {
      'Content-Security-Policy': cspHeader
    },
  }
  }
})
