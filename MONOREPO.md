# Monorepo Structure

This project has been converted to a monorepo structure using npm workspaces for better code organization and shared dependencies.

## 📁 Project Structure

```
openai-realtime-twilio-demo/
├── packages/
│   ├── shared/              # Shared types, utilities, and database operations
│   ├── webapp/              # Next.js web application
│   └── websocket-server/    # WebSocket server for real-time communication
├── database/                # Database schema and migrations
├── docs/                    # Documentation
├── docker/                  # Docker configuration
└── package.json             # Root package.json with workspace configuration
```

## 🚀 Getting Started

### 1. Install Dependencies

From the root directory:

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### 2. Build Shared Package

The shared package must be built before other packages can use it:

```bash
npm run build:shared
```

### 3. Start All Services

```bash
npm run start-all
```

This will start:
- WebSocket server (port 8081)
- Next.js web app (port 3000)
- ngrok tunnel for public access

## 📦 Packages

### `packages/shared`

Contains shared code used by both webapp and websocket-server:

- **Types**: Common TypeScript interfaces and types
- **Database**: Database connection and query utilities
- **Agent Config**: Agent configuration database operations

**Build**: `npm run build:shared`

### `packages/webapp`

Next.js web application with React frontend:

- **UI Components**: React components for the web interface
- **API Routes**: Next.js API routes for configuration
- **Voice Chat**: WebRTC-based voice chat interface

**Start**: `npm run dev` (from packages/webapp)

### `packages/websocket-server`

WebSocket server handling real-time communication:

- **Twilio Integration**: Phone call handling via WebSocket
- **OpenAI Realtime API**: Integration with OpenAI's real-time API
- **Tool Management**: Custom tool calling system

**Start**: `npm run dev` (from packages/websocket-server)

## 🚀 Smart Development Orchestration

The `npm run dev` command now uses an intelligent orchestrator that:

- **🧹 Cleans up** existing processes before starting
- **⏳ Waits for services** to be ready before proceeding  
- **🌍 Starts ngrok** and automatically gets the public URL
- **📝 Updates .env** file with ngrok URLs automatically
- **🔄 Restarts WebSocket server** to load new environment variables
- **✅ Health checks** all services to ensure they're working
- **🎯 Proper error handling** with detailed status reporting
- **🛑 Graceful shutdown** with Ctrl+C

This matches the same logic as the `start-all.sh` script but integrated into the monorepo workflow.

## 🔧 Development Commands

### Root Level Commands

```bash
# Install all dependencies
npm install

# Development - Start all services with smart orchestration (including ngrok)
npm run dev

# Individual service commands (for debugging)
npm run dev:websocket    # WebSocket server only
npm run dev:webapp       # Next.js app only  
npm run dev:ngrok        # ngrok tunnel only

# Build all packages
npm run build:all

# Build shared package only
npm run build:shared

# Start all services (with ngrok)
npm run start-all

# Stop all services
npm run stop-all

# Clean all packages
npm run clean
```

### Package-Specific Commands

```bash
# From packages/webapp
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server

# From packages/websocket-server
npm run dev          # Start with nodemon
npm run build        # Build TypeScript
npm run start        # Start production server

# From packages/shared
npm run build        # Build TypeScript
npm run dev          # Watch mode
```

## 🔄 Shared Dependencies

The `packages/shared` package provides:

- **Types**: `@openai-realtime-twilio-demo/shared/types`
- **Database**: `@openai-realtime-twilio-demo/shared/db`
- **Agent Config**: `@openai-realtime-twilio-demo/shared/agent-config-db`

Both webapp and websocket-server depend on the shared package via workspace references.

## 🏗️ Building for Production

1. **Build shared package first**:
   ```bash
   npm run build:shared
   ```

2. **Build all packages**:
   ```bash
   npm run build:all
   ```

3. **Start services**:
   ```bash
   npm run start-all
   ```

## 📝 Adding New Shared Code

When adding new shared functionality:

1. Add code to `packages/shared/src/`
2. Export from `packages/shared/src/index.ts`
3. Build the shared package: `npm run build:shared`
4. Import in other packages: `import { ... } from '@openai-realtime-twilio-demo/shared'`

## 🔍 Troubleshooting

### Build Issues

- Ensure shared package is built before building other packages
- Run `npm run clean` to clear all build artifacts
- Check that workspace dependencies are properly linked

### Runtime Issues

- Verify all services are running: `npm run start-all`
- Check that shared package is built and up-to-date
- Ensure environment variables are properly configured

## 📚 Migration Notes

The monorepo conversion:

- ✅ Moved `webapp/` → `packages/webapp/`
- ✅ Moved `websocket-server/` → `packages/websocket-server/`
- ✅ Created `packages/shared/` for common code
- ✅ Updated package.json files with workspace references
- ✅ Updated build scripts and paths
- ✅ Maintained all existing functionality

All existing functionality remains the same, but now with better code organization and shared dependencies.
