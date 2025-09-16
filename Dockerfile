# Multi-stage build for monolithic container
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Install PostgreSQL server
RUN apk add --no-cache postgresql postgresql-contrib

# Set working directory
WORKDIR /app

# Copy package files for both services
COPY package*.json ./
COPY websocket-server/package*.json ./websocket-server/
COPY webapp/package*.json ./webapp/

# Install dependencies for both services
RUN npm ci --only=production
RUN cd websocket-server && npm ci
RUN cd webapp && npm ci --only=production

# Copy source code
COPY websocket-server/ ./websocket-server/
COPY webapp/ ./webapp/
COPY database/ ./database/

# Build WebSocket server
WORKDIR /app/websocket-server
RUN npm install -g typescript
RUN npm run build
RUN npm prune --production && npm uninstall -g typescript

# Skip Next.js build for now - will run in dev mode
WORKDIR /app/webapp
# RUN npm run build

# Create production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    postgresql \
    postgresql-contrib \
    bash \
    curl \
    supervisor \
    nginx \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create directories
RUN mkdir -p /var/lib/postgresql/data \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /etc/supervisor/conf.d \
    && mkdir -p /etc/nginx \
    && mkdir -p /var/log/nginx

# Copy built applications
COPY --from=base /app/websocket-server/dist ./websocket-server/dist
COPY --from=base /app/websocket-server/node_modules ./websocket-server/node_modules
COPY --from=base /app/websocket-server/package.json ./websocket-server/
COPY --from=base /app/webapp ./webapp
COPY --from=base /app/database ./database

# Copy configuration files
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/init-db.sh /usr/local/bin/init-db.sh
COPY docker/start.sh /usr/local/bin/start.sh

# Set permissions
RUN chmod +x /usr/local/bin/init-db.sh \
    && chmod +x /usr/local/bin/start.sh \
    && chown -R postgres:postgres /var/lib/postgresql \
    && chown -R postgres:postgres /var/log/postgresql

# Create non-root user for Node.js services
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app

# Expose ports
EXPOSE 80 3000 8081 5432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start all services
CMD ["/usr/local/bin/start.sh"]
