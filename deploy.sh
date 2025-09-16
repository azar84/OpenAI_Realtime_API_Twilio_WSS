#!/bin/bash

# Deployment script for VPS
# Usage: ./deploy.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_HOST="51.222.142.170"
VPS_USER="debian"
VPS_PASSWORD="htc792980"
APP_NAME="openai-realtime"
DOMAIN="51.222.142.170"  # You can change this to your domain later

echo -e "${BLUE}🚀 Deploying OpenAI Realtime + Twilio Demo to VPS${NC}"
echo "=================================================="
echo -e "${BLUE}VPS: ${VPS_HOST}${NC}"
echo -e "${BLUE}User: ${VPS_USER}${NC}"
echo -e "${BLUE}App: ${APP_NAME}${NC}"
echo ""

# Function to run commands on VPS
run_ssh() {
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$@"
}

# Function to copy files to VPS
copy_to_vps() {
    sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no -r "$1" "$VPS_USER@$VPS_HOST:$2"
}

echo -e "${YELLOW}📋 Step 1: Checking VPS connection...${NC}"
if ! run_ssh "echo 'Connection successful'"; then
    echo -e "${RED}❌ Failed to connect to VPS${NC}"
    echo -e "${YELLOW}💡 Make sure sshpass is installed: sudo apt install sshpass${NC}"
    exit 1
fi
echo -e "${GREEN}✅ VPS connection successful${NC}"

echo -e "${YELLOW}📋 Step 2: Installing Docker on VPS...${NC}"
run_ssh "
    # Update system
    sudo apt update -y
    
    # Install Docker if not already installed
    if ! command -v docker &> /dev/null; then
        echo 'Installing Docker...'
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker debian
        sudo systemctl enable docker
        sudo systemctl start docker
    else
        echo 'Docker already installed'
    fi
    
    # Install Docker Compose if not already installed
    if ! command -v docker-compose &> /dev/null; then
        echo 'Installing Docker Compose...'
        sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    else
        echo 'Docker Compose already installed'
    fi
    
    # Install nginx for SSL termination (optional)
    sudo apt install -y nginx certbot python3-certbot-nginx
    
    echo 'Docker installation complete'
"
echo -e "${GREEN}✅ Docker installation complete${NC}"

echo -e "${YELLOW}📋 Step 3: Creating application directory...${NC}"
run_ssh "
    mkdir -p /home/debian/$APP_NAME
    cd /home/debian/$APP_NAME
    echo 'Application directory created'
"
echo -e "${GREEN}✅ Application directory created${NC}"

echo -e "${YELLOW}📋 Step 4: Copying application files...${NC}"
# Copy all necessary files
copy_to_vps "Dockerfile" "/home/debian/$APP_NAME/"
copy_to_vps "docker-compose.yml" "/home/debian/$APP_NAME/"
copy_to_vps "docker/" "/home/debian/$APP_NAME/"
copy_to_vps "websocket-server/" "/home/debian/$APP_NAME/"
copy_to_vps "webapp/" "/home/debian/$APP_NAME/"
copy_to_vps "database/" "/home/debian/$APP_NAME/"
echo -e "${GREEN}✅ Application files copied${NC}"

echo -e "${YELLOW}📋 Step 5: Creating environment file...${NC}"
run_ssh "
    cd /home/debian/$APP_NAME
    cat > .env << 'EOF'
# Production Environment Variables
DB_PASSWORD=secure_postgres_password_$(date +%s)
DB_NAME=openai_realtime_db
DB_USER=postgres

# OpenAI Configuration (REQUIRED - UPDATE THIS)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Twilio Configuration (REQUIRED - UPDATE THIS)
TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Server Configuration (REQUIRED - UPDATE THIS)
PUBLIC_URL=https://$DOMAIN
NODE_ENV=production
DEBUG=false

# Tool Integration (Optional)
N8N_TOOL_URL=
N8N_SECRET=
EOF
    echo 'Environment file created'
"
echo -e "${GREEN}✅ Environment file created${NC}"

echo -e "${YELLOW}📋 Step 6: Building and starting the application...${NC}"
run_ssh "
    cd /home/debian/$APP_NAME
    docker-compose down 2>/dev/null || true
    docker-compose up --build -d
    echo 'Application started'
"
echo -e "${GREEN}✅ Application started${NC}"

echo -e "${YELLOW}📋 Step 7: Setting up firewall...${NC}"
run_ssh "
    # Allow necessary ports
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw --force enable
    echo 'Firewall configured'
"
echo -e "${GREEN}✅ Firewall configured${NC}"

echo -e "${YELLOW}📋 Step 8: Checking application status...${NC}"
sleep 30  # Wait for services to start
run_ssh "
    cd /home/debian/$APP_NAME
    echo '=== Docker Containers ==='
    docker ps
    echo ''
    echo '=== Application Logs ==='
    docker-compose logs --tail=20
    echo ''
    echo '=== Health Check ==='
    curl -f http://localhost/health || echo 'Health check failed'
"
echo -e "${GREEN}✅ Application status checked${NC}"

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo -e "${BLUE}📊 Application URLs:${NC}"
echo -e "  🌐 Web Interface: http://$DOMAIN"
echo -e "  🔌 WebSocket: ws://$DOMAIN:8081"
echo -e "  📱 Direct Web App: http://$DOMAIN:3000"
echo -e "  🗄️  Database: $DOMAIN:5432"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "  1. Update .env file with your actual API keys:"
echo -e "     ssh $VPS_USER@$VPS_HOST"
echo -e "     cd /home/debian/$APP_NAME"
echo -e "     nano .env"
echo -e "  2. Restart the application:"
echo -e "     docker-compose restart"
echo -e "  3. Configure Twilio webhook:"
echo -e "     https://$DOMAIN/twiml"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "  View logs: docker-compose logs -f"
echo -e "  Restart: docker-compose restart"
echo -e "  Stop: docker-compose down"
echo -e "  Start: docker-compose up -d"
echo ""
echo -e "${YELLOW}⚠️  Important: Update your .env file with real API keys!${NC}"
