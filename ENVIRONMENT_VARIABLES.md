# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the OpenAI Realtime + Twilio Demo system.

## 📋 Complete Variable List

| Variable | Description | Default | Required | Used In |
|----------|-------------|---------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for Realtime API access | - | ✅ | WebSocket Server |
| `PORT` | WebSocket server port | `8081` | ❌ | WebSocket Server |
| `PUBLIC_URL` | Public URL for Twilio webhooks | `""` | ❌ | WebSocket Server |
| `DB_HOST` | PostgreSQL database host | `localhost` | ✅ | Both |
| `DB_PORT` | PostgreSQL database port | `5432` | ✅ | Both |
| `DB_NAME` | PostgreSQL database name | `openai_realtime_db` | ✅ | Both |
| `DB_USER` | PostgreSQL database username | - | ✅ | Both |
| `DB_PASSWORD` | PostgreSQL database password | `""` | ✅ | Both |
| `USER` | System username (fallback for DB_USER) | `$USER` | ❌ | Both |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | - | ✅ | Web App |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | - | ✅ | Web App |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL for frontend | `ws://localhost:8081` | ❌ | Web App |
| `WEBSOCKET_SERVER_URL` | WebSocket server URL for API calls | `http://localhost:8081` | ❌ | Web App |

## 🌐 Unified Configuration

**File:** `.env` (root directory)

### Complete Configuration
```env
# OpenAI Realtime + Twilio Demo - Unified Environment Configuration
# This file contains all environment variables for both webapp and websocket-server

# =============================================================================
# REQUIRED VARIABLES - Must be set for the application to work
# =============================================================================

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openai_realtime_db
DB_USER=postgres
DB_PASSWORD=your_password

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=your_auth_token

# =============================================================================
# OPTIONAL VARIABLES - Have defaults or are auto-generated
# =============================================================================

# Server Configuration
PORT=8081
PUBLIC_URL=https://abc123.ngrok-free.app

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:8081
WEBSOCKET_SERVER_URL=http://localhost:8081

# System Configuration
USER=username

# =============================================================================
# AUTO-GENERATED VARIABLES (set by start-all.sh script)
# =============================================================================
# These are automatically set when you run npm run start-all
# NGROK_URL=https://abc123.ngrok-free.app
# NGROK_WS_URL=wss://abc123.ngrok-free.app
# NGROK_HTTPS_URL=https://abc123.ngrok-free.app
```

## 🚀 Development Setup

### Single Unified Environment File
```env
# .env (root directory)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openai_realtime_db
DB_USER=your_username
DB_PASSWORD=your_password
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
PORT=8081
NEXT_PUBLIC_WS_URL=ws://localhost:8081
WEBSOCKET_SERVER_URL=http://localhost:8081
```

## 🏭 Production Setup

### Single Unified Environment File
```env
# .env (root directory)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=openai_realtime_db
DB_USER=production_user
DB_PASSWORD=secure_password
TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=your_auth_token
PORT=8081
PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=wss://your-domain.com
WEBSOCKET_SERVER_URL=https://your-domain.com
```

## 🐳 Docker Configuration

### Docker Compose Environment
```yaml
version: '3.8'
services:
  websocket-server:
    environment:
      - PORT=8081
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=openai_realtime_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - PUBLIC_URL=${PUBLIC_URL}
  
  webapp:
    environment:
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=openai_realtime_db
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - NEXT_PUBLIC_WS_URL=ws://websocket-server:8081
```

## 🔧 Environment Variable Usage in Code

### WebSocket Server (`packages/websocket-server/`)
- `OPENAI_API_KEY` - Used in server.ts, agent-tools.ts, ephemeral.ts, agent-config-mapper.ts
- `PORT` - Used in server.ts
- `PUBLIC_URL` - Used in server.ts
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `USER` - Used in db.ts

### Web Application (`packages/webapp/`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - Used in API routes
- `NEXT_PUBLIC_WS_URL` - Used in API routes and components
- `WEBSOCKET_SERVER_URL` - Used in tool-configurations API routes
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `USER` - Used in db.ts

### Shared Package (`packages/shared/`)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `USER` - Used in db.ts

## 🚨 Security Notes

- **Never commit** `.env` files to version control
- **Use strong passwords** for database credentials
- **Rotate API keys** regularly
- **Use environment-specific** values for production
- **Validate all inputs** from environment variables

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database variables
   echo "DB_HOST: $DB_HOST"
   echo "DB_PORT: $DB_PORT"
   echo "DB_NAME: $DB_NAME"
   ```

2. **OpenAI API Key Missing**
   ```bash
   # Check OpenAI key
   echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
   ```

3. **Twilio Configuration**
   ```bash
   # Check Twilio credentials
   echo "TWILIO_ACCOUNT_SID: $TWILIO_ACCOUNT_SID"
   echo "TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN:0:10}..."
   ```

### Validation Commands

```bash
# Check all required variables
node -e "
const required = ['OPENAI_API_KEY', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
required.forEach(key => {
  console.log(key + ':', process.env[key] ? 'SET' : 'NOT SET');
});
"
```

## 📝 Quick Reference

### Development
```bash
# Copy and modify these files:
cp packages/websocket-server/.env.example packages/websocket-server/.env
cp packages/webapp/.env.example packages/webapp/.env
```

### Production
```bash
# Set environment variables in your deployment platform:
# - Heroku: heroku config:set KEY=value
# - Docker: -e KEY=value
# - Kubernetes: env: - name: KEY value: value
```

---

**Total Variables: 13** (All actively used in codebase)
**Required Variables: 6** (OPENAI_API_KEY, DB_HOST, DB_USER, DB_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
**Optional Variables: 7** (All others have defaults)
