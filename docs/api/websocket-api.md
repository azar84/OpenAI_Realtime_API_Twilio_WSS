# WebSocket API Documentation

This document describes the WebSocket API used for real-time communication in the OpenAI Realtime + Twilio Demo system.

## 🌐 WebSocket Endpoints

The WebSocket server exposes three main endpoints for different types of connections:

### 1. Twilio Call Connection
**Endpoint:** `wss://your-domain.com/call`  
**Purpose:** Handle phone calls from Twilio  
**Audio Format:** G.711 μ-law (8kHz, mono)

### 2. Voice Chat Connection
**Endpoint:** `wss://your-domain.com/voice-chat`  
**Purpose:** Browser-based voice chat  
**Audio Format:** PCM16 (24kHz, mono)

### 3. Frontend Logging Connection
**Endpoint:** `wss://your-domain.com/logs`  
**Purpose:** Real-time logging and monitoring  
**Audio Format:** N/A (text only)

## 📡 Message Types

### Twilio Messages

#### `start` Event
Sent when a call begins.

```json
{
  "event": "start",
  "start": {
    "streamSid": "MZ1234567890abcdef",
    "callSid": "CA1234567890abcdef",
    "tracks": ["inbound", "outbound"],
    "mediaFormat": {
      "encoding": "audio/x-mulaw",
      "sampleRate": 8000,
      "channels": 1
    }
  }
}
```

#### `media` Event
Contains audio data from the call.

```json
{
  "event": "media",
  "media": {
    "track": "inbound",
    "chunk": "1",
    "timestamp": "1234567890",
    "payload": "base64-encoded-audio-data"
  }
}
```

#### `stop` Event
Sent when the call ends.

```json
{
  "event": "stop",
  "stop": {
    "callSid": "CA1234567890abcdef"
  }
}
```

### Voice Chat Messages

#### Control Messages

**Start Recording:**
```json
{
  "type": "start_recording"
}
```

**Stop Recording:**
```json
{
  "type": "stop_recording"
}
```

#### Audio Data
Raw PCM16 audio data sent as base64-encoded strings.

### OpenAI Realtime API Messages

The system forwards most OpenAI Realtime API messages between the client and OpenAI. Key message types include:

#### Session Management
```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "instructions": "You are a helpful assistant.",
    "voice": "ash",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    }
  }
}
```

#### Audio Input
```json
{
  "type": "input_audio_buffer.append",
  "audio": "base64-encoded-audio-data"
}
```

#### Audio Output
```json
{
  "type": "response.audio.delta",
  "delta": "base64-encoded-audio-data",
  "item_id": "item_123"
}
```

#### Function Calls
```json
{
  "type": "response.output_item.done",
  "item": {
    "type": "function_call",
    "name": "get_weather_from_coords",
    "arguments": "{\"latitude\": 40.7128, \"longitude\": -74.0060}",
    "call_id": "call_123"
  }
}
```

## 🔧 Server-Side Message Handling

### Twilio Message Processing

```typescript
function handleTwilioMessage(data: RawData) {
  const msg = parseMessage(data);
  
  switch (msg.event) {
    case "start":
      // Initialize call session
      session.streamSid = msg.start.streamSid;
      tryConnectModel();
      break;
      
    case "media":
      // Forward audio to OpenAI
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
          type: "input_audio_buffer.append",
          audio: msg.media.payload,
        });
      }
      break;
      
    case "close":
      // Clean up session
      closeAllConnections();
      break;
  }
}
```

### Voice Chat Message Processing

```typescript
function handleVoiceChatMessage(data: RawData) {
  const stringData = data.toString();
  
  try {
    // Try to parse as JSON control message
    const msg = JSON.parse(stringData);
    
    if (msg.type === "start_recording") {
      // Clear any existing response and start fresh
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, { type: "response.cancel" });
        jsonSend(session.modelConn, { type: "input_audio_buffer.clear" });
      }
    } else if (msg.type === "stop_recording") {
      // Commit audio and request response
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, { type: "input_audio_buffer.commit" });
        jsonSend(session.modelConn, { type: "response.create" });
      }
    }
  } catch (parseError) {
    // Assume it's base64 PCM16 audio data
    if (isOpen(session.modelConn)) {
      jsonSend(session.modelConn, {
        type: "input_audio_buffer.append",
        audio: stringData,
      });
    }
  }
}
```

## 🎵 Audio Format Specifications

### Twilio Audio (G.711 μ-law)
- **Encoding:** G.711 μ-law
- **Sample Rate:** 8,000 Hz
- **Channels:** 1 (mono)
- **Bit Depth:** 8-bit
- **Data Format:** Base64-encoded binary

### Voice Chat Audio (PCM16)
- **Encoding:** 16-bit PCM
- **Sample Rate:** 24,000 Hz
- **Channels:** 1 (mono)
- **Bit Depth:** 16-bit
- **Data Format:** Base64-encoded binary

## 🔄 Connection Lifecycle

### Twilio Call Lifecycle

```
1. Twilio sends webhook to /twiml
2. Server responds with TwiML containing WebSocket URL
3. Twilio establishes WebSocket connection to /call
4. Twilio sends 'start' event with stream details
5. Server connects to OpenAI Realtime API
6. Audio flows bidirectionally through WebSocket
7. Twilio sends 'stop' event when call ends
8. Server cleans up all connections
```

### Voice Chat Lifecycle

```
1. Browser requests microphone access
2. WebSocket connection established to /voice-chat
3. Browser sends 'start_recording' control message
4. Audio data streams continuously as base64
5. Browser sends 'stop_recording' control message
6. Server processes audio and generates response
7. Response audio sent back to browser
8. Connection closed when user disconnects
```

## 🛠️ Error Handling

### Connection Errors

**WebSocket Connection Failed:**
```json
{
  "type": "error",
  "error": {
    "code": "connection_failed",
    "message": "Failed to establish WebSocket connection"
  }
}
```

**Audio Processing Error:**
```json
{
  "type": "error",
  "error": {
    "code": "audio_processing_failed",
    "message": "Failed to process audio data"
  }
}
```

### OpenAI API Errors

**API Key Invalid:**
```json
{
  "type": "error",
  "error": {
    "code": "invalid_api_key",
    "message": "OpenAI API key is invalid or expired"
  }
}
```

**Rate Limit Exceeded:**
```json
{
  "type": "error",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "OpenAI API rate limit exceeded"
  }
}
```

## 🔍 Debugging and Monitoring

### Connection Status

**WebSocket Server Status:**
```bash
curl http://localhost:8081/tools
```

**Active Connections:**
- Check server logs for connection events
- Monitor WebSocket connection count
- Track session state changes

### Audio Debugging

**Audio Format Detection:**
- Log audio data size and format
- Monitor conversion between formats
- Track audio processing latency

**OpenAI API Debugging:**
- Log all messages sent to/received from OpenAI
- Monitor response times and errors
- Track function call execution

## 📊 Performance Considerations

### Audio Latency

**Target Latency:** < 500ms end-to-end
**Optimization Strategies:**
- Use WebSocket for real-time communication
- Minimize audio buffer sizes
- Optimize audio format conversion
- Use server-side VAD for turn detection

### Connection Management

**Connection Limits:**
- One active Twilio call
- One active voice chat session
- Multiple frontend logging connections

**Resource Usage:**
- Monitor memory usage for audio buffers
- Track CPU usage for audio processing
- Monitor database connection pool

## 🔐 Security Considerations

### Authentication

**API Keys:**
- OpenAI API key required for AI functionality
- Twilio credentials for phone service
- n8n webhook secrets for tool integration

### Data Protection

**Audio Data:**
- Audio data is not stored permanently
- Transmitted over secure WebSocket connections
- Processed in memory only

**Configuration Data:**
- Stored securely in PostgreSQL database
- Environment variables for sensitive data
- Input validation and sanitization

## 🚀 Best Practices

### Client Implementation

1. **Handle Connection States:** Implement proper connection state management
2. **Audio Quality:** Use appropriate sample rates and formats
3. **Error Handling:** Implement robust error handling and recovery
4. **Resource Cleanup:** Properly close connections and clean up resources

### Server Implementation

1. **Session Management:** Maintain clean session state
2. **Audio Processing:** Optimize audio format conversion
3. **Error Recovery:** Implement graceful error recovery
4. **Monitoring:** Add comprehensive logging and monitoring
