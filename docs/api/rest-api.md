# REST API Documentation

This document describes the REST API endpoints available in the OpenAI Realtime + Twilio Demo system.

## 🌐 Base URLs

- **Web App API:** `http://localhost:3000/api`
- **WebSocket Server API:** `http://localhost:8081`

## 📋 Agent Configuration API

### Get Agent Configurations

**Endpoint:** `GET /api/agent-config`

**Description:** Retrieve agent configurations

**Query Parameters:**
- `active` (boolean, optional): Get only active configuration
- `id` (number, optional): Get specific configuration by ID

**Response:**
```json
{
  "id": 1,
  "name": "Default Assistant",
  "instructions": "You are a helpful AI assistant.",
  "voice": "ash",
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "temperature": 0.8,
  "max_tokens": null,
  "input_audio_format": "g711_ulaw",
  "output_audio_format": "g711_ulaw",
  "turn_detection_type": "server_vad",
  "turn_detection_threshold": 0.5,
  "turn_detection_prefix_padding_ms": 300,
  "turn_detection_silence_duration_ms": 200,
  "modalities": ["text", "audio"],
  "tools_enabled": true,
  "enabled_tools": ["get_weather_from_coords", "lookup_customer"],
  "is_active": true,
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2024-12-01T10:00:00Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Configuration not found
- `500` - Internal server error

### Create Agent Configuration

**Endpoint:** `POST /api/agent-config`

**Description:** Create a new agent configuration

**Request Body:**
```json
{
  "name": "Customer Service Agent",
  "instructions": "You are a helpful customer service representative.",
  "voice": "ash",
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "temperature": 0.7,
  "max_tokens": 1000,
  "input_audio_format": "g711_ulaw",
  "output_audio_format": "g711_ulaw",
  "turn_detection_type": "server_vad",
  "turn_detection_threshold": 0.5,
  "turn_detection_prefix_padding_ms": 300,
  "turn_detection_silence_duration_ms": 200,
  "modalities": ["text", "audio"],
  "tools_enabled": true,
  "enabled_tools": ["lookup_customer", "knowledge_base"],
  "is_active": true
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Customer Service Agent",
  "instructions": "You are a helpful customer service representative.",
  "voice": "ash",
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "temperature": 0.7,
  "max_tokens": 1000,
  "input_audio_format": "g711_ulaw",
  "output_audio_format": "g711_ulaw",
  "turn_detection_type": "server_vad",
  "turn_detection_threshold": 0.5,
  "turn_detection_prefix_padding_ms": 300,
  "turn_detection_silence_duration_ms": 200,
  "modalities": ["text", "audio"],
  "tools_enabled": true,
  "enabled_tools": ["lookup_customer", "knowledge_base"],
  "is_active": true,
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2024-12-01T10:00:00Z"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Bad request (missing required fields)
- `500` - Internal server error

### Update Agent Configuration

**Endpoint:** `PUT /api/agent-config`

**Description:** Update an existing agent configuration

**Request Body:**
```json
{
  "id": 1,
  "instructions": "Updated instructions for the assistant.",
  "voice": "ballad",
  "temperature": 0.9,
  "enabled_tools": ["get_weather_from_coords"]
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Default Assistant",
  "instructions": "Updated instructions for the assistant.",
  "voice": "ballad",
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "temperature": 0.9,
  "max_tokens": null,
  "input_audio_format": "g711_ulaw",
  "output_audio_format": "g711_ulaw",
  "turn_detection_type": "server_vad",
  "turn_detection_threshold": 0.5,
  "turn_detection_prefix_padding_ms": 300,
  "turn_detection_silence_duration_ms": 200,
  "modalities": ["text", "audio"],
  "tools_enabled": true,
  "enabled_tools": ["get_weather_from_coords"],
  "is_active": true,
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2024-12-01T10:30:00Z"
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Bad request (missing ID)
- `404` - Configuration not found
- `500` - Internal server error

### Delete Agent Configuration

**Endpoint:** `DELETE /api/agent-config?id={id}`

**Description:** Delete (soft delete) an agent configuration

**Query Parameters:**
- `id` (number, required): Configuration ID to delete

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Deleted successfully
- `400` - Bad request (missing ID)
- `404` - Configuration not found
- `500` - Internal server error

## 🛠️ Tools API

### Get Available Tools

**Endpoint:** `GET /api/tools`

**Description:** Retrieve all available tools from the backend

**Response:**
```json
[
  {
    "name": "get_weather_from_coords",
    "type": "function",
    "description": "Get the current weather",
    "parameters": {
      "type": "object",
      "properties": {
        "latitude": {
          "type": "number"
        },
        "longitude": {
          "type": "number"
        }
      },
      "required": ["latitude", "longitude"]
    }
  },
  {
    "name": "lookup_customer",
    "type": "function",
    "description": "Find a customer and recent info by phone number via n8n workflow",
    "parameters": {
      "type": "object",
      "properties": {
        "phone": {
          "type": "string",
          "description": "E.164 phone number"
        }
      },
      "required": ["phone"]
    }
  }
]
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

## 📞 Twilio API

### Get Twilio Configuration

**Endpoint:** `GET /api/twilio`

**Description:** Get Twilio configuration and status

**Response:**
```json
{
  "accountSid": "AC1234567890abcdef",
  "authToken": "***hidden***",
  "phoneNumbers": [
    {
      "phoneNumber": "+1234567890",
      "friendlyName": "My Twilio Number",
      "voiceUrl": "wss://your-domain.com",
      "statusCallback": "https://your-domain.com/status"
    }
  ],
  "status": "configured"
}
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

### Get Twilio Phone Numbers

**Endpoint:** `GET /api/twilio/numbers`

**Description:** Retrieve available Twilio phone numbers

**Response:**
```json
[
  {
    "phoneNumber": "+1234567890",
    "friendlyName": "My Twilio Number",
    "voiceUrl": "wss://your-domain.com",
    "statusCallback": "https://your-domain.com/status",
    "capabilities": {
      "voice": true,
      "sms": false,
      "mms": false
    }
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Twilio credentials not configured
- `500` - Internal server error

## 🌐 WebSocket Server API

### Get Public URL

**Endpoint:** `GET /public-url`

**Description:** Get the current public URL for Twilio webhooks

**Response:**
```json
{
  "publicUrl": "https://abc123.ngrok-free.app"
}
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

### Get Available Tools

**Endpoint:** `GET /tools`

**Description:** Get all available tools from the WebSocket server

**Response:**
```json
[
  {
    "name": "get_weather_from_coords",
    "type": "function",
    "description": "Get the current weather",
    "parameters": {
      "type": "object",
      "properties": {
        "latitude": {
          "type": "number"
        },
        "longitude": {
          "type": "number"
        }
      },
      "required": ["latitude", "longitude"]
    }
  }
]
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

### Twilio Webhook

**Endpoint:** `POST /twiml`

**Description:** Twilio webhook endpoint that returns TwiML for call handling

**Request Body:**
```
CallSid=CA1234567890abcdef&From=%2B1234567890&To=%2B0987654321&CallStatus=ringing
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://abc123.ngrok-free.app/call" />
  </Start>
  <Say>Connected</Say>
</Response>
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

## 🔍 Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `RATE_LIMITED` - Rate limit exceeded
- `INTERNAL_ERROR` - Internal server error

## 🔐 Authentication

### API Key Authentication

Some endpoints require API keys:

**OpenAI API Key:**
- Required for AI functionality
- Set in `OPENAI_API_KEY` environment variable

**Twilio Credentials:**
- Required for phone functionality
- Set in `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` environment variables

### CORS Configuration

The API supports CORS for web applications:

```javascript
// CORS headers
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 📊 Rate Limiting

### Current Limits

- **Agent Configuration API:** 100 requests per minute
- **Tools API:** 200 requests per minute
- **Twilio API:** 50 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🧪 Testing the API

### Using curl

**Get agent configurations:**
```bash
curl -X GET http://localhost:3000/api/agent-config
```

**Create new configuration:**
```bash
curl -X POST http://localhost:3000/api/agent-config \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "instructions": "You are a test assistant.",
    "voice": "ash"
  }'
```

**Get available tools:**
```bash
curl -X GET http://localhost:8081/tools
```

### Using JavaScript

```javascript
// Get agent configurations
const response = await fetch('http://localhost:3000/api/agent-config');
const configs = await response.json();

// Create new configuration
const newConfig = await fetch('http://localhost:3000/api/agent-config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Test Agent',
    instructions: 'You are a test assistant.',
    voice: 'ash'
  })
});
```

## 🔄 WebSocket Integration

The REST API works in conjunction with the WebSocket API:

1. **Configuration Changes:** REST API updates are sent to WebSocket clients
2. **Real-time Updates:** WebSocket clients receive live updates
3. **Session Management:** WebSocket handles real-time communication

## 🚀 Best Practices

### Request Handling

1. **Use appropriate HTTP methods**
2. **Include proper headers**
3. **Handle errors gracefully**
4. **Validate input data**

### Response Handling

1. **Check status codes**
2. **Parse JSON responses**
3. **Handle error cases**
4. **Implement retry logic**

### Security

1. **Use HTTPS in production**
2. **Validate all inputs**
3. **Implement rate limiting**
4. **Log security events**
