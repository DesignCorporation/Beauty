const express = require('express');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 6100;

// PostgreSQL connection config
const pgConfig = {
  host: 'localhost',
  port: 5432, // Real PostgreSQL port
  database: 'beauty_platform_new',
  user: 'beauty_platform_user',
  password: process.env.PGPASSWORD || 'secure_password',
  connectTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 3 // Connection pool size
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  let client;

  try {
    client = new Client(pgConfig);
    await client.connect();
    
    // Simple query to test database
    const result = await client.query('SELECT 1 as health_check, NOW() as timestamp');
    const responseTime = Date.now() - startTime;
    
    await client.end();

    res.json({
      status: 'healthy',
      database: 'beauty_platform_new',
      responseTime: `${responseTime}ms`,
      connection: 'ok',
      query: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing client:', closeError.message);
      }
    }
    
    const responseTime = Date.now() - startTime;
    console.error('PostgreSQL Health Check Failed:', error.message);
    
    res.status(503).json({
      status: 'unhealthy',
      database: 'beauty_platform_new',
      responseTime: `${responseTime}ms`,
      connection: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PostgreSQL Health Check',
    version: '1.0.0',
    endpoints: ['/health'],
    database: 'beauty_platform_new'
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ PostgreSQL Health Check service running on http://127.0.0.1:${PORT}`);
  console.log(`🔍 Database: beauty_platform_new (port 5432)`);
  console.log(`📊 Health endpoint: http://127.0.0.1:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');  
  process.exit(0);
});