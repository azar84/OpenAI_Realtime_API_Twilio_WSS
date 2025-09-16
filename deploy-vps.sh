#!/bin/bash

# VPS Deployment Script for OpenAI Realtime + Twilio Demo
# This script deploys the WebSocket server and PostgreSQL to your VPS

set -e

echo "🚀 Starting VPS deployment..."

# Check if required environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is required"
    exit 1
fi

if [ -z "$TWILIO_ACCOUNT_SID" ]; then
    echo "❌ Error: TWILIO_ACCOUNT_SID environment variable is required"
    exit 1
fi

if [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo "❌ Error: TWILIO_AUTH_TOKEN environment variable is required"
    exit 1
fi

# VPS connection details
VPS_HOST="51.222.142.170"
VPS_USER="debian"
VPS_PASSWORD="htc792980"

echo "📦 Preparing deployment files..."

# Create deployment directory
mkdir -p deployment

# Copy necessary files
cp docker-compose.yml deployment/
cp websocket-server/Dockerfile deployment/
cp -r websocket-server deployment/
cp -r database deployment/

# Create environment file for VPS
cat > deployment/.env << EOF
# Database Configuration
DB_NAME=openai_realtime_db
DB_USER=postgres
DB_PASSWORD=postgres123

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}

# Twilio Configuration
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}

# Server Configuration
PUBLIC_URL=http://${VPS_HOST}
NODE_ENV=production
DEBUG=false

# Tool Integration (optional)
N8N_TOOL_URL=
N8N_SECRET=
EOF

echo "📤 Uploading files to VPS..."

# Upload files to VPS
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no -r deployment/* $VPS_USER@$VPS_HOST:/home/$VPS_USER/openai-realtime/

echo "🔧 Setting up services on VPS..."

# Run deployment commands on VPS
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'EOF'
cd /home/debian/openai-realtime

echo "📦 Installing Docker Compose if not present..."
if ! command -v docker-compose &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y docker-compose
fi

echo "🛑 Stopping any existing containers..."
docker-compose down || true

echo "🏗️ Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "🔍 Checking service status..."
docker-compose ps

echo "🧪 Testing WebSocket server..."
curl -f http://localhost:8081/tools || echo "WebSocket server not ready yet"

echo "✅ Deployment completed!"
EOF

echo "🎉 VPS deployment finished!"
echo "📱 Your WebSocket server is available at: http://$VPS_HOST:8081"
echo "🔗 Tools endpoint: http://$VPS_HOST:8081/tools"
echo "💾 PostgreSQL is running on port 5432"

# Cleanup
rm -rf deployment

echo "✨ Ready for Vercel webapp deployment!"
