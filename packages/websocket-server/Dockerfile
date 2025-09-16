# WebSocket Server Dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY websocket-server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY websocket-server/ ./

# Install TypeScript globally for build
RUN npm install -g typescript

# Build the TypeScript code
RUN npm run build

# Remove TypeScript and dev dependencies
RUN npm uninstall -g typescript && npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/tools || exit 1

# Start the server
CMD ["node", "dist/server.js"]
