#!/bin/bash

echo "🚀 Starting OpenAI Realtime + Twilio Demo (Monolithic Container)"
echo "================================================================"

# Set default environment variables if not provided
export DB_PASSWORD=${DB_PASSWORD:-"postgres123"}
export DB_NAME=${DB_NAME:-"openai_realtime_db"}
export DB_USER=${DB_USER:-"postgres"}
export DEBUG=${DEBUG:-"false"}
export NODE_ENV=${NODE_ENV:-"production"}

echo "📋 Environment Configuration:"
echo "  - Database: ${DB_NAME}@localhost:5432"
echo "  - WebSocket Server: localhost:8081"
echo "  - Web App: localhost:3000"
echo "  - Nginx: localhost:80"
echo "  - Public URL: ${PUBLIC_URL:-"Not set"}"
echo ""

# Initialize database
echo "🗄️  Initializing database..."
/usr/local/bin/init-db.sh

# Start all services with supervisor
echo "🎛️  Starting all services with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
