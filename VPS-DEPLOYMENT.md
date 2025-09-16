# VPS Deployment Guide

This guide explains how to deploy the WebSocket server and PostgreSQL database to your VPS.

## 🏗️ Architecture

- **VPS (51.222.142.170)**: WebSocket Server + PostgreSQL Database
- **Vercel**: Next.js Webapp (deployed separately)

## 📋 Prerequisites

1. **Environment Variables**: Set these in your local environment:
   ```bash
   export OPENAI_API_KEY="your_openai_api_key"
   export TWILIO_ACCOUNT_SID="your_twilio_account_sid"
   export TWILIO_AUTH_TOKEN="your_twilio_auth_token"
   ```

2. **Required Tools**:
   - `sshpass` (for automated SSH)
   - `docker` and `docker-compose` on VPS

## 🚀 Quick Deployment

### Option 1: Automated Deployment
```bash
# Set your environment variables
export OPENAI_API_KEY="your_key_here"
export TWILIO_ACCOUNT_SID="your_sid_here"
export TWILIO_AUTH_TOKEN="your_token_here"

# Run the deployment script
./deploy-vps.sh
```

### Option 2: Manual Deployment

1. **Upload files to VPS**:
   ```bash
   sshpass -p "htc792980" scp -o StrictHostKeyChecking=no -r websocket-server/ debian@51.222.142.170:/home/debian/openai-realtime/
   sshpass -p "htc792980" scp -o StrictHostKeyChecking=no docker-compose.yml debian@51.222.142.170:/home/debian/openai-realtime/
   sshpass -p "htc792980" scp -o StrictHostKeyChecking=no -r database/ debian@51.222.142.170:/home/debian/openai-realtime/
   ```

2. **Create environment file on VPS**:
   ```bash
   sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170
   cd /home/debian/openai-realtime
   cp env.example .env
   # Edit .env with your actual values
   ```

3. **Start services**:
   ```bash
   docker-compose up --build -d
   ```

## 🔧 Services

### WebSocket Server
- **Port**: 8081
- **Health Check**: `http://51.222.142.170:8081/tools`
- **Container**: `openai-realtime-ws`

### PostgreSQL Database
- **Port**: 5432
- **Database**: `openai_realtime_db`
- **Container**: `openai-realtime-db`

## 📊 Monitoring

### Check Service Status
```bash
sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170 "cd /home/debian/openai-realtime && docker-compose ps"
```

### View Logs
```bash
# WebSocket server logs
sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170 "cd /home/debian/openai-realtime && docker-compose logs websocket-server"

# Database logs
sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170 "cd /home/debian/openai-realtime && docker-compose logs postgres"
```

### Test WebSocket Server
```bash
curl http://51.222.142.170:8081/tools
```

## 🔄 Updates

To update the WebSocket server:

1. **Rebuild and restart**:
   ```bash
   sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170 "cd /home/debian/openai-realtime && docker-compose up --build -d websocket-server"
   ```

2. **Or restart all services**:
   ```bash
   sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170 "cd /home/debian/openai-realtime && docker-compose restart"
   ```

## 🛠️ Troubleshooting

### WebSocket Server Not Starting
```bash
# Check logs
docker-compose logs websocket-server

# Check if database is ready
docker-compose logs postgres
```

### Database Connection Issues
```bash
# Test database connection
docker-compose exec postgres psql -U postgres -d openai_realtime_db -c "SELECT 1;"
```

### Port Conflicts
```bash
# Check what's using port 8081
sshpass -p "htc792980" ssh -o StrictHostKeyChecking=no debian@51.222.142.170 "sudo netstat -tlnp | grep 8081"
```

## 🔐 Security Notes

- Change default database password in production
- Use environment variables for sensitive data
- Consider using Docker secrets for production
- Set up proper firewall rules on VPS

## 📱 Next Steps

After VPS deployment:
1. Deploy webapp to Vercel
2. Configure webapp to connect to VPS WebSocket server
3. Set up domain name and SSL certificates
4. Configure Twilio webhooks to point to your VPS
