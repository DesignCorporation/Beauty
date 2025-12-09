#!/bin/bash

echo "🚀 Deploying Auth Service updates..."

# Stop the service
echo "⏸️ Stopping Auth Service..."
pm2 stop beauty-auth-service

# Update code (assuming git pull)
echo "📦 Updating code..."
git pull origin main

# Install dependencies if package.json changed
echo "📚 Installing dependencies..."
npm install

# Start the service
echo "▶️ Starting Auth Service..."
pm2 start ecosystem.config.js

# Check status
echo "🔍 Checking service status..."
sleep 3
pm2 status

echo "🔍 Testing health endpoint..."
curl -s https://auth.beauty.designcorp.eu/health | jq .

echo "✅ Deployment complete!"
echo "🔗 Health check: https://auth.beauty.designcorp.eu/health"
echo "📋 Client endpoints now support auth middleware properly"