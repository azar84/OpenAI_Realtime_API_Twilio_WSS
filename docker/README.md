# Monolithic Container Deployment

This directory contains the configuration files for deploying the OpenAI Realtime + Twilio Demo as a single monolithic container.

## Architecture

The monolithic container runs all services together:
- **PostgreSQL Database** (port 5432)
- **WebSocket Server** (port 8081) 
- **Next.js Web App** (port 3000)
- **Nginx Reverse Proxy** (port 80)

All services are managed by Supervisor for process management.

## Quick Start

1. **Copy environment file**:
   ```bash
   cp docker/env.example .env
   ```

2. **Update environment variables**:
   Edit `.env` with your actual values:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
   - `PUBLIC_URL` - Your domain (e.g., https://your-domain.com)
   - `DB_PASSWORD` - Secure database password

3. **Build and run**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Web Interface: http://localhost
   - Direct WebSocket: ws://localhost:8081
   - Direct Web App: http://localhost:3000
   - Direct Database: localhost:5432

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for Realtime API | ✅ | - |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | ✅ | - |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ✅ | - |
| `PUBLIC_URL` | Public domain for Twilio webhooks | ✅ | - |
| `DB_PASSWORD` | PostgreSQL password | ✅ | postgres123 |
| `DB_NAME` | Database name | ❌ | openai_realtime_db |
| `DB_USER` | Database user | ❌ | postgres |
| `N8N_TOOL_URL` | n8n webhook URL (optional) | ❌ | - |
| `N8N_SECRET` | n8n webhook secret (optional) | ❌ | - |
| `DEBUG` | Enable debug logging | ❌ | false |

## Services

### PostgreSQL Database
- **Port**: 5432
- **Database**: openai_realtime_db
- **User**: postgres
- **Data**: Persisted in Docker volume

### WebSocket Server
- **Port**: 8081
- **Health Check**: http://localhost:8081/tools
- **WebSocket**: ws://localhost:8081/call

### Next.js Web App
- **Port**: 3000
- **Health Check**: http://localhost:3000/api/twilio
- **Interface**: http://localhost:3000

### Nginx Reverse Proxy
- **Port**: 80
- **Health Check**: http://localhost/health
- **Routes**:
  - `/` → Next.js Web App
  - `/call` → WebSocket Server
  - `/twiml` → Twilio Webhooks
  - `/tools` → WebSocket API

## Twilio Configuration

1. **Set Webhook URL** in Twilio Console:
   ```
   https://your-domain.com/twiml
   ```

2. **Set Status Callback URL**:
   ```
   https://your-domain.com/status
   ```

## Health Monitoring

The container includes health checks for all services:

```bash
# Check container health
docker ps

# View logs
docker-compose logs -f

# Check individual services
curl http://localhost/health
curl http://localhost:8081/tools
curl http://localhost:3000/api/twilio
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Rebuild container
docker-compose down
docker-compose up --build
```

### Database connection issues
```bash
# Check PostgreSQL logs
docker-compose logs | grep postgres

# Connect to database
docker exec -it openai-realtime-monolith psql -U postgres -d openai_realtime_db
```

### WebSocket connection issues
```bash
# Check WebSocket server logs
docker-compose logs | grep websocket

# Test WebSocket connection
curl http://localhost:8081/tools
```

### Twilio webhook issues
```bash
# Check nginx logs
docker-compose logs | grep nginx

# Test webhook endpoint
curl -X POST http://localhost/twiml
```

## Production Deployment

### VPS Deployment
1. **Install Docker** on your VPS
2. **Clone repository** and configure environment
3. **Set up SSL** (Let's Encrypt recommended)
4. **Configure firewall** (ports 80, 443)
5. **Set up monitoring** and backups

### SSL Configuration
Add SSL certificates to `docker/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - SSL private key

Update nginx configuration for HTTPS.

### Backup Strategy
```bash
# Backup database
docker exec openai-realtime-monolith pg_dump -U postgres openai_realtime_db > backup.sql

# Backup volumes
docker run --rm -v openai-realtime-twilio-demo_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## Scaling Considerations

This monolithic approach is ideal for:
- ✅ Small to medium deployments
- ✅ Single VPS hosting
- ✅ Simplified management
- ✅ Cost-effective hosting

For larger scale, consider:
- Microservices architecture
- Separate database hosting
- Load balancing
- Container orchestration (Kubernetes)
