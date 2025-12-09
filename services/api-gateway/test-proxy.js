// Простой тест API Gateway proxy
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Auth proxy с правильной конфигурацией для cookies и headers
const authProxy = createProxyMiddleware({
  target: 'http://localhost:6021',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/auth'
  },
  logLevel: 'debug',
  // Важно для передачи cookies и headers
  cookieDomainRewrite: false,
  cookiePathRewrite: false,
  preserveHeaderKeyCase: true,
  // Передаём все заголовки включая Authorization и Cookie
  onProxyReq: (proxyReq, req, res) => {
    // Логируем заголовки для отладки
    console.log('🔍 Headers from client:', Object.keys(req.headers));
    if (req.headers.cookie) {
      console.log('🍪 Cookies found:', req.headers.cookie);
    }
  }
});

app.use('/api/auth', authProxy);

app.listen(6030, () => {
  console.log('🧪 Test API Gateway on port 6030');
  console.log('🔗 Testing: /api/auth -> http://localhost:6021/auth');
});