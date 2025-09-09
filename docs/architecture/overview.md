# System Architecture Overview

This document provides a comprehensive overview of the OpenAI Realtime + Twilio Demo system architecture.

## 🏗️ High-Level Architecture

The system is built as a distributed real-time voice AI platform with the following key components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Phone Call    │───▶│   Twilio Voice   │───▶│  WebSocket      │
│   (User)        │    │   Infrastructure  │    │  Server         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Browser   │───▶│   Next.js Web    │───▶│  OpenAI Realtime│
│   (Voice Chat)  │    │   Application    │    │  API            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   Database       │
                       └──────────────────┘
```

## 🔧 Core Components

### 1. WebSocket Server (`websocket-server/`)

**Purpose:** Central communication hub handling all real-time interactions

**Key Responsibilities:**
- Manage WebSocket connections (Twilio, Voice Chat, Frontend)
- Handle audio streaming and format conversion
- Process OpenAI Realtime API communication
- Execute custom tool calls
- Manage session state and configuration

**Technology Stack:**
- **Runtime:** Node.js with TypeScript
- **WebSocket:** `ws` library
- **HTTP Server:** Express.js
- **Database:** PostgreSQL with `pg` driver
- **Audio Processing:** Custom format conversion

### 2. Next.js Web Application (`webapp/`)

**Purpose:** User interface for configuration, monitoring, and voice chat

**Key Responsibilities:**
- Provide web-based voice chat interface
- Manage agent configuration and settings
- Display real-time conversation transcripts
- Monitor function calls and system status
- Handle Twilio phone number management

**Technology Stack:**
- **Framework:** Next.js 14 with App Router
- **UI Library:** React with TypeScript
- **Styling:** Tailwind CSS
- **Components:** Radix UI primitives
- **Audio:** Web Audio API with AudioWorklet

### 3. PostgreSQL Database

**Purpose:** Persistent storage for configuration and session data

**Key Tables:**
- `agent_configs` - AI agent settings and instructions
- `tool_definitions` - Available tool schemas
- `sessions` - Active session tracking
- `session_logs` - Debugging and analytics

## 🔄 Data Flow Architecture

### Phone Call Flow

```
1. User calls Twilio number
2. Twilio sends webhook to /twiml endpoint
3. Server responds with TwiML containing WebSocket URL
4. Twilio establishes WebSocket connection to /call
5. Audio streams from Twilio to WebSocket server
6. Server forwards audio to OpenAI Realtime API
7. AI processes audio and generates response
8. Response audio streams back through server to Twilio
9. User hears AI response through phone
```

### Voice Chat Flow

```
1. User clicks "Connect to Agent" in web interface
2. Browser requests microphone access
3. WebSocket connection established to /voice-chat
4. Audio captured as PCM16 and sent to server
5. Server forwards audio to OpenAI Realtime API
6. AI processes audio and generates response
7. Response audio sent back to browser
8. Browser plays audio through speakers
```

### Configuration Flow

```
1. User modifies settings in web interface
2. Changes sent to /api/agent-config endpoint
3. Configuration saved to PostgreSQL database
4. WebSocket server notified of changes
5. New configuration applied to active sessions
6. Changes take effect immediately
```

## 🎵 Audio Processing Architecture

### Dual Audio Format Support

The system supports two different audio formats optimized for different use cases:

**Twilio Calls (G.711 μ-law):**
- **Format:** G.711 μ-law encoding
- **Sample Rate:** 8kHz
- **Channels:** Mono
- **Bit Depth:** 8-bit
- **Use Case:** Phone calls via Twilio infrastructure

**Voice Chat (PCM16):**
- **Format:** 16-bit PCM
- **Sample Rate:** 24kHz
- **Channels:** Mono
- **Bit Depth:** 16-bit
- **Use Case:** Browser-based voice chat

### Audio Processing Pipeline

```
Input Audio → Format Detection → Conversion → OpenAI API
     ↓              ↓              ↓           ↓
Twilio/Web    Audio Format    PCM16/G711   Realtime API
     ↓              ↓              ↓           ↓
Output Audio ← Format Detection ← Conversion ← Response
```

## 🛠️ Tool System Architecture

### Built-in Tools

**Weather Tool (`get_weather_from_coords`):**
- **Purpose:** Get current weather information
- **API:** Open-Meteo weather service
- **Input:** Latitude and longitude coordinates
- **Output:** Temperature and weather conditions

**Customer Lookup (`lookup_customer`):**
- **Purpose:** Find customer information by phone number
- **Integration:** n8n workflow via webhook
- **Input:** E.164 phone number
- **Output:** Customer data and recent activity

**Knowledge Base (`knowledge_base`):**
- **Purpose:** Answer questions about company information
- **Integration:** n8n workflow with knowledge base
- **Input:** Search query
- **Output:** Relevant information and answers

### Tool Execution Flow

```
1. AI decides to call a tool
2. Tool call sent to WebSocket server
3. Server validates tool exists and is enabled
4. Tool handler executes with provided parameters
5. External API/webhook called if needed
6. Response returned to AI
7. AI incorporates response into conversation
```

## 🔐 Security Architecture

### Authentication & Authorization

**API Keys:**
- OpenAI API key for AI service access
- Twilio credentials for phone service
- n8n webhook secrets for tool integration

**Network Security:**
- HTTPS/WSS for all external communications
- ngrok tunneling for local development
- CORS configuration for web app access

**Data Protection:**
- Environment variables for sensitive data
- Database connection pooling
- Input validation and sanitization

## 📊 Session Management

### Multi-Connection Support

The system can handle multiple types of connections simultaneously:

**Twilio WebSocket:**
- Single active phone call
- G.711 μ-law audio format
- Twilio-specific message handling

**Voice Chat WebSocket:**
- Browser-based voice chat
- PCM16 audio format
- Web Audio API integration

**Frontend WebSocket:**
- Real-time logging and monitoring
- Configuration updates
- System status reporting

### Session State Management

**Session Object:**
```typescript
interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  voiceChatConn?: WebSocket;
  modelConn?: WebSocket;
  streamSid?: string;
  saved_config?: any;
  lastAssistantItem?: string;
  responseStartTimestamp?: number;
  latestMediaTimestamp?: number;
  openAIApiKey?: string;
}
```

## 🚀 Scalability Considerations

### Current Limitations

- **Single Session:** One active phone call at a time
- **Single Voice Chat:** One active voice chat session
- **Local Development:** Designed for local/development use

### Future Scalability

**Horizontal Scaling:**
- Multiple WebSocket server instances
- Load balancer for connection distribution
- Redis for session state sharing

**Vertical Scaling:**
- Increased memory for larger audio buffers
- More CPU cores for concurrent processing
- SSD storage for faster database operations

## 🔍 Monitoring & Observability

### Logging Strategy

**WebSocket Server:**
- Connection events and errors
- Audio processing metrics
- Tool execution logs
- OpenAI API interactions

**Web Application:**
- User interactions and errors
- Configuration changes
- Real-time event processing
- Performance metrics

**Database:**
- Query performance monitoring
- Connection pool statistics
- Session tracking and analytics

### Health Checks

**Service Health:**
- WebSocket server: `GET /tools`
- Web application: `GET /api/twilio`
- Database: Connection test queries
- ngrok: Tunnel status API

## 🎯 Design Principles

### 1. Real-time First
- WebSocket-based communication
- Low-latency audio processing
- Immediate configuration updates

### 2. Modular Architecture
- Separated concerns between components
- Pluggable tool system
- Independent service scaling

### 3. Developer Experience
- Automated startup scripts
- Comprehensive logging
- Easy local development setup

### 4. Production Ready
- Error handling and recovery
- Configuration management
- Monitoring and observability

## 🔄 Future Enhancements

### Planned Features
- Multi-session support
- Advanced audio processing
- Enhanced monitoring dashboard
- Docker containerization
- Cloud deployment options

### Integration Opportunities
- Additional AI providers
- More communication channels
- Advanced analytics
- Enterprise features
