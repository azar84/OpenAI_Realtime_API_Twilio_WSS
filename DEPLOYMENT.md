# Deployment Guide

## Vercel Deployment Options

### Option 1: Frontend-Only on Vercel (Recommended)

Deploy the Next.js webapp to Vercel and host the WebSocket server on a separate platform.

#### Steps:

1. **Deploy WebSocket Server** (choose one):
   - **Railway**: `railway deploy` (recommended for WebSocket servers)
   - **Render**: Deploy as a web service
   - **Heroku**: Deploy as a web dyno
   - **DigitalOcean App Platform**: Deploy as a web service

2. **Deploy Next.js App to Vercel**:
   ```bash
   cd webapp
   vercel --prod
   ```

3. **Configure Environment Variables in Vercel**:
   ```bash
   vercel env add TWILIO_ACCOUNT_SID
   vercel env add TWILIO_AUTH_TOKEN
   vercel env add DB_HOST
   vercel env add DB_PORT
   vercel env add DB_NAME
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add NEXT_PUBLIC_WS_URL
   ```

4. **Update Twilio Webhook**:
   - Point Twilio webhook to your WebSocket server URL
   - Update `PUBLIC_URL` environment variable on WebSocket server

### Option 2: Full Stack on Railway (Alternative)

Deploy both services to Railway:

1. **Create Railway Project**:
   ```bash
   railway login
   railway init
   ```

2. **Deploy WebSocket Server**:
   ```bash
   cd websocket-server
   railway deploy
   ```

3. **Deploy Web App**:
   ```bash
   cd webapp
   railway deploy
   ```

4. **Configure Environment Variables**:
   ```bash
   railway variables set OPENAI_API_KEY=sk-proj-...
   railway variables set TWILIO_ACCOUNT_SID=AC1234567890abcdef
   railway variables set TWILIO_AUTH_TOKEN=your_auth_token
   railway variables set DB_HOST=your-db-host.com
   railway variables set DB_PASSWORD=secure_password
   railway variables set PUBLIC_URL=https://your-websocket-server.railway.app
   ```

### Option 3: Docker Deployment

Deploy using Docker containers:

1. **Create docker-compose.yml**:
   ```yaml
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

   volumes:
     postgres_data:
   ```

2. **Deploy to any Docker-compatible platform**:
   - DigitalOcean App Platform
   - AWS ECS
   - Google Cloud Run
   - Azure Container Instances

## Environment Variables Reference

### WebSocket Server
- `OPENAI_API_KEY` - OpenAI API key
- `DB_HOST` - Database host
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `PUBLIC_URL` - Public URL for Twilio webhooks
- `PORT` - Server port (8081)

### Web App
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `DB_HOST` - Database host
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL

## Database Options

### Vercel Postgres (for webapp)
```bash
vercel postgres create
vercel env add DATABASE_URL
```

### External PostgreSQL
- **Neon**: Serverless PostgreSQL
- **Supabase**: PostgreSQL with real-time features
- **Railway**: Managed PostgreSQL
- **PlanetScale**: MySQL-compatible (requires schema changes)

## Recommended Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway/Render │    │   External DB   │
│   (Next.js)     │◄──►│   (WebSocket)    │◄──►│   (PostgreSQL)  │
│   Frontend      │    │   Backend        │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   Twilio        │    │   OpenAI API     │
│   Voice         │    │   Realtime       │
└─────────────────┘    └──────────────────┘
```

## Cost Considerations

- **Vercel**: Free tier for frontend, paid for functions
- **Railway**: $5/month for WebSocket server
- **Database**: $5-20/month depending on provider
- **Total**: ~$10-25/month for full deployment

## Security Notes

1. **Never commit environment variables**
2. **Use platform-specific secret management**
3. **Enable HTTPS for all services**
4. **Configure CORS properly**
5. **Use database connection pooling**
6. **Implement rate limiting**
7. **Monitor API usage and costs**
