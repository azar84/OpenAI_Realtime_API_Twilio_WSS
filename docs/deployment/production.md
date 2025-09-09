# Production Deployment Guide

This guide covers deploying the OpenAI Realtime + Twilio Demo system to production environments.

## 🎯 Production Architecture

### Recommended Production Setup

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Load Balancer │───▶│   Web App        │───▶│   Database      │
│   (nginx/HAProxy)│    │   (Next.js)      │    │   (PostgreSQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   WebSocket      │
                       │   Server         │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   OpenAI API     │
                       │   Twilio API     │
                       └──────────────────┘
```

## 🏗️ Infrastructure Requirements

### Minimum Requirements

**CPU:** 2 cores (4+ recommended)
**RAM:** 4GB (8GB+ recommended)
**Storage:** 20GB SSD
**Network:** 100Mbps+ bandwidth
**OS:** Ubuntu 20.04+ or CentOS 8+

### Recommended Specifications

**CPU:** 4+ cores
**RAM:** 16GB+
**Storage:** 100GB+ SSD
**Network:** 1Gbps+ bandwidth
**OS:** Ubuntu 22.04 LTS

## 🐳 Docker Deployment

### Dockerfile for WebSocket Server

```dockerfile
# websocket-server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/tools || exit 1

# Start server
CMD ["npm", "start"]
```

### Dockerfile for Web App

```dockerfile
# webapp/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: openai_realtime_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  websocket-server:
    build: ./websocket-server
    environment:
      - NODE_ENV=production
      - PORT=8081
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=openai_realtime_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - PUBLIC_URL=${PUBLIC_URL}
      - N8N_TOOL_URL=${N8N_TOOL_URL}
      - N8N_SECRET=${N8N_SECRET}
    ports:
      - "8081:8081"
    depends_on:
      - postgres
    restart: unless-stopped

  webapp:
    build: ./webapp
    environment:
      - NODE_ENV=production
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=openai_realtime_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - NEXT_PUBLIC_WS_URL=ws://localhost:8081
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - websocket-server
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - webapp
      - websocket-server
    restart: unless-stopped

volumes:
  postgres_data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream webapp {
        server webapp:3000;
    }

    upstream websocket {
        server websocket-server:8081;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=ws:10m rate=5r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # WebSocket proxy
        location /ws/ {
            limit_req zone=ws burst=10 nodelay;
            proxy_pass http://websocket/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }

        # Web app proxy
        location / {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://webapp;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## ☁️ Cloud Deployment

### AWS Deployment

**EC2 Instance Setup:**
```bash
# Launch EC2 instance (t3.medium or larger)
# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <repository-url>
cd openai-realtime-twilio-demo

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

**RDS Database Setup:**
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier openai-realtime-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-12345678
```

**Application Load Balancer:**
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name openai-realtime-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678
```

### Google Cloud Platform

**Cloud Run Deployment:**
```yaml
# cloudbuild.yaml
steps:
  # Build WebSocket server
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/websocket-server', './websocket-server']
  
  # Build Web app
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/webapp', './webapp']
  
  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/websocket-server']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/webapp']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'websocket-server', '--image', 'gcr.io/$PROJECT_ID/websocket-server', '--platform', 'managed', '--region', 'us-central1']
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'webapp', '--image', 'gcr.io/$PROJECT_ID/webapp', '--platform', 'managed', '--region', 'us-central1']
```

### Azure Deployment

**Container Instances:**
```yaml
# azure-deploy.yml
apiVersion: 2021-07-01
location: eastus
name: openai-realtime
properties:
  containers:
  - name: websocket-server
    properties:
      image: your-registry.azurecr.io/websocket-server:latest
      ports:
      - port: 8081
      environmentVariables:
      - name: OPENAI_API_KEY
        value: your-openai-api-key
      - name: DB_HOST
        value: your-database-server.database.windows.net
      - name: DB_PASSWORD
        secureValue: your-database-password
  - name: webapp
    properties:
      image: your-registry.azurecr.io/webapp:latest
      ports:
      - port: 3000
      environmentVariables:
      - name: TWILIO_ACCOUNT_SID
        value: your-twilio-account-sid
      - name: TWILIO_AUTH_TOKEN
        secureValue: your-twilio-auth-token
  osType: Linux
  restartPolicy: Always
```

## 🔐 Security Configuration

### SSL/TLS Setup

**Let's Encrypt with Certbot:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Custom SSL Certificate:**
```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate signing request
openssl req -new -key key.pem -out csr.pem

# Generate self-signed certificate (for testing)
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
```

### Environment Security

**Secrets Management:**
```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name "openai-realtime/secrets" \
  --description "OpenAI Realtime production secrets" \
  --secret-string '{"OPENAI_API_KEY":"sk-proj-...","TWILIO_AUTH_TOKEN":"..."}'

# Retrieve secrets
aws secretsmanager get-secret-value \
  --secret-id "openai-realtime/secrets" \
  --query SecretString --output text
```

**Environment Variable Encryption:**
```bash
# Encrypt .env file
gpg --symmetric --cipher-algo AES256 .env

# Decrypt in production
gpg --decrypt .env.gpg > .env
```

### Network Security

**Firewall Configuration:**
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

**VPC Configuration (AWS):**
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets
aws ec2 create-subnet --vpc-id vpc-12345678 --cidr-block 10.0.1.0/24

# Create security groups
aws ec2 create-security-group \
  --group-name openai-realtime-sg \
  --description "Security group for OpenAI Realtime" \
  --vpc-id vpc-12345678
```

## 📊 Monitoring and Logging

### Application Monitoring

**Prometheus + Grafana:**
```yaml
# monitoring/docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus_data:
  grafana_data:
```

**Health Check Endpoints:**
```typescript
// websocket-server/src/server.ts
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasDbConfig: !!(process.env.DB_HOST && process.env.DB_NAME)
    }
  };
  
  res.json(health);
});
```

### Logging Configuration

**Winston Logger:**
```typescript
// websocket-server/src/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export default logger;
```

**Log Rotation:**
```bash
# Install logrotate
sudo apt install logrotate

# Configure log rotation
sudo nano /etc/logrotate.d/openai-realtime
```

```bash
# /etc/logrotate.d/openai-realtime
/var/log/openai-realtime/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload openai-realtime
    endscript
}
```

## 🚀 Deployment Automation

### CI/CD Pipeline

**GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Registry
      uses: docker/login-action@v2
      with:
        registry: your-registry.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and Push Images
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          your-registry.com/websocket-server:latest
          your-registry.com/webapp:latest
    
    - name: Deploy to Production
      run: |
        ssh user@production-server << 'EOF'
          cd /opt/openai-realtime-twilio-demo
          docker-compose pull
          docker-compose up -d
        EOF
```

### Blue-Green Deployment

**Deployment Script:**
```bash
#!/bin/bash
# deploy.sh

set -e

# Configuration
APP_NAME="openai-realtime"
CURRENT_VERSION=$(docker-compose ps -q webapp)
NEW_VERSION="latest"

echo "Starting blue-green deployment..."

# Pull new images
docker-compose pull

# Start new version (green)
docker-compose up -d --scale webapp=2

# Wait for health check
echo "Waiting for new version to be healthy..."
sleep 30

# Check health
if curl -f http://localhost:3000/api/health; then
    echo "New version is healthy, switching traffic..."
    
    # Stop old version
    docker-compose stop webapp
    docker-compose up -d --scale webapp=1
    
    echo "Deployment completed successfully!"
else
    echo "New version failed health check, rolling back..."
    docker-compose stop webapp
    docker-compose up -d --scale webapp=1
    exit 1
fi
```

## 🔧 Production Optimization

### Performance Tuning

**Node.js Optimization:**
```bash
# Set Node.js options
export NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=128"
```

**Database Optimization:**
```sql
-- PostgreSQL configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

**Nginx Optimization:**
```nginx
# nginx.conf optimizations
worker_processes auto;
worker_cpu_affinity auto;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Scaling Configuration

**Horizontal Scaling:**
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  websocket-server:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - PORT=8081
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=openai_realtime_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - PUBLIC_URL=${PUBLIC_URL}
  
  webapp:
    deploy:
      replicas: 2
    environment:
      - NODE_ENV=production
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=openai_realtime_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - NEXT_PUBLIC_WS_URL=ws://localhost:8081
```

## 🛠️ Maintenance

### Backup Strategy

**Database Backup:**
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="openai_realtime_db_$DATE.sql"

# Create backup
pg_dump -h localhost -U postgres -d openai_realtime_db > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://your-backup-bucket/

# Clean up old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

**Application Backup:**
```bash
#!/bin/bash
# backup-app.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/openai-realtime-twilio-demo"

# Create application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Upload to S3
aws s3 cp $BACKUP_DIR/app_backup_$DATE.tar.gz s3://your-backup-bucket/
```

### Update Procedure

**Zero-Downtime Updates:**
```bash
#!/bin/bash
# update.sh

set -e

echo "Starting zero-downtime update..."

# Pull latest images
docker-compose pull

# Update WebSocket server
docker-compose up -d websocket-server

# Wait for health check
sleep 10

# Update web app
docker-compose up -d webapp

# Wait for health check
sleep 10

# Verify all services are healthy
curl -f http://localhost:8081/tools
curl -f http://localhost:3000/api/health

echo "Update completed successfully!"
```

This comprehensive production deployment guide should help you deploy the system reliably and securely in production environments.
