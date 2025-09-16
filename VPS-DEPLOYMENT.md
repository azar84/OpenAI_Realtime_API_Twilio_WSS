# VPS Deployment Guide

## Quick Deployment

I've created an automated deployment script for your VPS. Here's how to use it:

### Prerequisites

Install `sshpass` on your local machine:
```bash
# Ubuntu/Debian
sudo apt install sshpass

# macOS
brew install sshpass

# Or use ssh with key-based auth (more secure)
```

### Automated Deployment

```bash
# Run the deployment script
./deploy.sh
```

This script will:
1. ✅ Connect to your VPS (51.222.142.170)
2. ✅ Install Docker and Docker Compose
3. ✅ Copy all application files
4. ✅ Create environment configuration
5. ✅ Build and start the container
6. ✅ Configure firewall
7. ✅ Verify deployment

## Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Connect to VPS
```bash
ssh debian@51.222.142.170
# Password: htc792980
```

### 2. Install Docker
```bash
# Update system
sudo apt update -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker debian
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Create Application Directory
```bash
mkdir -p /home/debian/openai-realtime
cd /home/debian/openai-realtime
```

### 4. Copy Files
From your local machine:
```bash
scp -r . debian@51.222.142.170:/home/debian/openai-realtime/
```

### 5. Create Environment File
```bash
cd /home/debian/openai-realtime
nano .env
```

Add your configuration:
```env
# Database Configuration
DB_PASSWORD=your_secure_password_here
DB_NAME=openai_realtime_db
DB_USER=postgres

# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Twilio Configuration (REQUIRED)
TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Server Configuration (REQUIRED)
PUBLIC_URL=https://51.222.142.170
NODE_ENV=production
DEBUG=false

# Tool Integration (Optional)
N8N_TOOL_URL=
N8N_SECRET=
```

### 6. Start Application
```bash
docker-compose up --build -d
```

### 7. Configure Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
```

## Post-Deployment Configuration

### 1. Update Environment Variables
```bash
ssh debian@51.222.142.170
cd /home/debian/openai-realtime
nano .env
# Update with your real API keys
docker-compose restart
```

### 2. Configure Twilio Webhook
In your Twilio Console:
- **Voice Webhook URL**: `https://51.222.142.170/twiml`
- **Status Callback URL**: `https://51.222.142.170/status`

### 3. Test the Application
```bash
# Check container status
docker ps

# View logs
docker-compose logs -f

# Test endpoints
curl http://51.222.142.170/health
curl http://51.222.142.170/tools
```

## Application URLs

After deployment, your application will be available at:

- **🌐 Web Interface**: http://51.222.142.170
- **🔌 WebSocket**: ws://51.222.142.170:8081
- **📱 Direct Web App**: http://51.222.142.170:3000
- **🗄️ Database**: 51.222.142.170:5432

## SSL Configuration (Optional)

For HTTPS support:

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

### 3. Update Environment
```bash
# Update PUBLIC_URL in .env
PUBLIC_URL=https://your-domain.com
docker-compose restart
```

## Management Commands

### Container Management
```bash
# View status
docker ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Start services
docker-compose up -d

# Rebuild and restart
docker-compose up --build -d
```

### Database Management
```bash
# Connect to database
docker exec -it openai-realtime-monolith psql -U postgres -d openai_realtime_db

# Backup database
docker exec openai-realtime-monolith pg_dump -U postgres openai_realtime_db > backup.sql

# Restore database
docker exec -i openai-realtime-monolith psql -U postgres -d openai_realtime_db < backup.sql
```

### Log Management
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs websocket-server
docker-compose logs webapp
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f
```

## Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl http://51.222.142.170/health

# WebSocket server
curl http://51.222.142.170/tools

# Web app
curl http://51.222.142.170/api/twilio
```

### System Monitoring
```bash
# System resources
htop
df -h
free -h

# Docker resources
docker stats

# Container logs
docker-compose logs --tail=100
```

### Backup Strategy
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/debian/backups"

mkdir -p $BACKUP_DIR

# Backup database
docker exec openai-realtime-monolith pg_dump -U postgres openai_realtime_db > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/debian/openai-realtime

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Schedule daily backups
echo "0 2 * * * /home/debian/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs
   docker-compose down
   docker-compose up --build -d
   ```

2. **Database connection issues**
   ```bash
   docker-compose logs | grep postgres
   docker exec -it openai-realtime-monolith psql -U postgres -d openai_realtime_db
   ```

3. **WebSocket connection issues**
   ```bash
   docker-compose logs | grep websocket
   curl http://51.222.142.170/tools
   ```

4. **Twilio webhook issues**
   ```bash
   docker-compose logs | grep nginx
   curl -X POST http://51.222.142.170/twiml
   ```

### Performance Optimization

1. **Increase container resources**
   ```bash
   # Edit docker-compose.yml
   services:
     openai-realtime:
       deploy:
         resources:
           limits:
             memory: 2G
             cpus: '1.0'
   ```

2. **Database optimization**
   ```bash
   # Connect to database and run
   docker exec -it openai-realtime-monolith psql -U postgres -d openai_realtime_db
   ```

## Security Considerations

1. **Change default passwords**
2. **Use SSH keys instead of passwords**
3. **Enable firewall**
4. **Regular security updates**
5. **Monitor logs for suspicious activity**
6. **Use HTTPS in production**

## Cost Optimization

- **VPS**: ~$5-20/month
- **Domain**: ~$10-15/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$5-25/month

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables
3. Test individual services
4. Check firewall settings
5. Verify Twilio configuration
