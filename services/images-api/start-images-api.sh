#!/bin/bash
# Images API Startup Script

cd /root/beauty-platform/services/images-api
export PORT=6026
export NODE_ENV=production

echo "🚀 Starting Images API on port $PORT..."
nohup node src/server.js > images-api.log 2>&1 &
echo $! > images-api.pid
echo "✅ Images API started with PID: $(cat images-api.pid)"
echo "📋 Logs: tail -f images-api.log"
echo "🛑 Stop: kill $(cat images-api.pid)"