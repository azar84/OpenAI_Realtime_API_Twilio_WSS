# Custom Tools Development Guide

This guide explains how to create and integrate custom tools for the OpenAI Realtime + Twilio Demo system.

## 🛠️ Tool System Overview

The system supports two types of tools:

1. **Built-in Tools** - Implemented directly in the server
2. **External Tools** - Integrated via n8n workflows or webhooks

## 🔧 Built-in Tool Development

### Tool Structure

Each tool consists of two parts:

1. **Schema Definition** - Describes the tool's interface
2. **Handler Function** - Implements the tool's logic

### Example: Weather Tool

```typescript
// Tool schema definition
{
  schema: {
    name: "get_weather_from_coords",
    type: "function",
    description: "Get the current weather",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" }
      },
      required: ["latitude", "longitude"]
    }
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    // Tool implementation
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m,wind_speed_10m`
    );
    const data = await response.json();
    return JSON.stringify({ temp: data.current?.temperature_2m });
  }
}
```

### Adding a New Built-in Tool

**Step 1: Define the Tool Schema**

```typescript
// In websocket-server/src/functionHandlers.ts
functions.push({
  schema: {
    name: "your_tool_name",
    type: "function",
    description: "What your tool does",
    parameters: {
      type: "object",
      properties: {
        param1: { 
          type: "string", 
          description: "Parameter description" 
        },
        param2: { 
          type: "number", 
          description: "Another parameter" 
        }
      },
      required: ["param1"]
    }
  },
  handler: async (args: { param1: string; param2?: number }) => {
    // Your tool logic here
    try {
      // Make API calls, process data, etc.
      const result = await yourApiCall(args.param1, args.param2);
      return JSON.stringify({ success: true, data: result });
    } catch (error) {
      return JSON.stringify({ 
        error: `Tool execution failed: ${error.message}` 
      });
    }
  }
});
```

**Step 2: Test the Tool**

```bash
# Restart the WebSocket server
cd websocket-server
npm run dev

# Test the tool via API
curl http://localhost:8081/tools
```

**Step 3: Add to Database**

```sql
-- Add tool definition to database
INSERT INTO tool_definitions (name, description, parameters) VALUES
(
  'your_tool_name',
  'What your tool does',
  '{
    "type": "object",
    "properties": {
      "param1": {"type": "string", "description": "Parameter description"},
      "param2": {"type": "number", "description": "Another parameter"}
    },
    "required": ["param1"]
  }'::jsonb
);
```

## 🌐 External Tool Integration

### n8n Workflow Integration

**Step 1: Create n8n Workflow**

1. Go to your n8n instance
2. Create a new workflow
3. Add a "Webhook" trigger node
4. Configure the webhook URL
5. Add processing nodes
6. Add a "Respond to Webhook" node

**Step 2: Configure Webhook**

```json
{
  "httpMethod": "POST",
  "path": "your-tool-endpoint",
  "responseMode": "responseNode",
  "options": {
    "noResponseBody": false
  }
}
```

**Step 3: Add Tool to Server**

```typescript
// In websocket-server/src/functionHandlers.ts
functions.push({
  schema: {
    name: "n8n_tool",
    type: "function",
    description: "Tool powered by n8n workflow",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input data" }
      },
      required: ["input"]
    }
  },
  handler: async (args: { input: string }) => {
    const N8N_URL = "https://your-n8n-instance.com/webhook/your-tool-endpoint";
    const N8N_SECRET = process.env.N8N_SECRET;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(N8N_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tool-Secret": N8N_SECRET || "",
        },
        body: JSON.stringify({ input: args.input }),
        signal: controller.signal,
      });
      
      const data = await response.json();
      return JSON.stringify(data);
    } catch (error) {
      return JSON.stringify({ 
        error: `n8n tool failed: ${error.message}` 
      });
    } finally {
      clearTimeout(timer);
    }
  }
});
```

### Generic Webhook Integration

**Step 1: Create Webhook Endpoint**

```javascript
// Example Express.js webhook
app.post('/webhook/your-tool', (req, res) => {
  const { input } = req.body;
  
  // Process the input
  const result = processInput(input);
  
  // Return response
  res.json({ success: true, result });
});
```

**Step 2: Add Tool Handler**

```typescript
functions.push({
  schema: {
    name: "webhook_tool",
    type: "function",
    description: "Tool powered by webhook",
    parameters: {
      type: "object",
      properties: {
        data: { type: "string", description: "Data to process" }
      },
      required: ["data"]
    }
  },
  handler: async (args: { data: string }) => {
    const WEBHOOK_URL = "https://your-api.com/webhook/your-tool";
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: args.data }),
      });
      
      const result = await response.json();
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({ 
        error: `Webhook tool failed: ${error.message}` 
      });
    }
  }
});
```

## 🎯 Tool Best Practices

### Schema Design

**Clear Descriptions:**
```typescript
description: "Get current weather conditions for a specific location"
```

**Comprehensive Parameters:**
```typescript
parameters: {
  type: "object",
  properties: {
    location: {
      type: "string",
      description: "City name or address to get weather for"
    },
    units: {
      type: "string",
      enum: ["celsius", "fahrenheit"],
      description: "Temperature units to return"
    }
  },
  required: ["location"]
}
```

**Proper Types:**
- Use `string` for text data
- Use `number` for numeric data
- Use `boolean` for true/false values
- Use `array` for lists
- Use `object` for complex data

### Error Handling

**Graceful Failures:**
```typescript
handler: async (args: any) => {
  try {
    // Tool logic
    const result = await performOperation(args);
    return JSON.stringify({ success: true, data: result });
  } catch (error) {
    console.error(`Tool ${toolName} failed:`, error);
    return JSON.stringify({ 
      error: `Tool execution failed: ${error.message}`,
      details: error.stack
    });
  }
}
```

**Timeout Handling:**
```typescript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  });
  // Process response
} catch (error) {
  if (error.name === 'AbortError') {
    return JSON.stringify({ error: "Tool timeout" });
  }
  throw error;
} finally {
  clearTimeout(timer);
}
```

### Performance Optimization

**Caching:**
```typescript
const cache = new Map();

handler: async (args: any) => {
  const cacheKey = JSON.stringify(args);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await expensiveOperation(args);
  cache.set(cacheKey, result);
  
  return result;
}
```

**Rate Limiting:**
```typescript
const rateLimiter = new Map();

handler: async (args: any) => {
  const key = args.userId || 'default';
  const now = Date.now();
  const window = 60000; // 1 minute
  const limit = 10; // 10 requests per minute
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, []);
  }
  
  const requests = rateLimiter.get(key);
  const recent = requests.filter(time => now - time < window);
  
  if (recent.length >= limit) {
    return JSON.stringify({ error: "Rate limit exceeded" });
  }
  
  recent.push(now);
  rateLimiter.set(key, recent);
  
  // Continue with tool logic
}
```

## 🧪 Testing Tools

### Unit Testing

```typescript
// test/tools.test.ts
import { functions } from '../src/functionHandlers';

describe('Custom Tools', () => {
  test('weather tool returns temperature', async () => {
    const weatherTool = functions.find(f => f.schema.name === 'get_weather_from_coords');
    expect(weatherTool).toBeDefined();
    
    const result = await weatherTool.handler({
      latitude: 40.7128,
      longitude: -74.0060
    });
    
    const data = JSON.parse(result);
    expect(data.temp).toBeDefined();
    expect(typeof data.temp).toBe('number');
  });
});
```

### Integration Testing

```typescript
// test/integration.test.ts
import { WebSocket } from 'ws';

test('tool execution via WebSocket', async () => {
  const ws = new WebSocket('ws://localhost:8081/logs');
  
  await new Promise((resolve) => {
    ws.on('open', resolve);
  });
  
  // Send tool call message
  ws.send(JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'function_call',
      name: 'get_weather_from_coords',
      arguments: JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060
      })
    }
  }));
  
  // Wait for response
  const response = await new Promise((resolve) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'conversation.item.created') {
        resolve(msg);
      }
    });
  });
  
  expect(response).toBeDefined();
  ws.close();
});
```

### Manual Testing

**Via Web Interface:**
1. Go to http://localhost:3000
2. Add your tool to the configuration
3. Save the configuration
4. Test voice chat or phone calls
5. Ask questions that trigger your tool

**Via API:**
```bash
# Test tool directly
curl -X POST http://localhost:8081/tools/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "your_tool_name",
    "arguments": {"param1": "value1"}
  }'
```

## 📊 Monitoring and Debugging

### Logging

**Tool Execution Logs:**
```typescript
handler: async (args: any) => {
  console.log(`Tool ${toolName} called with args:`, args);
  
  try {
    const result = await performOperation(args);
    console.log(`Tool ${toolName} completed successfully`);
    return JSON.stringify(result);
  } catch (error) {
    console.error(`Tool ${toolName} failed:`, error);
    throw error;
  }
}
```

**Performance Monitoring:**
```typescript
handler: async (args: any) => {
  const startTime = Date.now();
  
  try {
    const result = await performOperation(args);
    const duration = Date.now() - startTime;
    console.log(`Tool ${toolName} took ${duration}ms`);
    return JSON.stringify(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Tool ${toolName} failed after ${duration}ms:`, error);
    throw error;
  }
}
```

### Error Tracking

**Structured Error Responses:**
```typescript
handler: async (args: any) => {
  try {
    const result = await performOperation(args);
    return JSON.stringify({ success: true, data: result });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        tool: toolName,
        args: args
      }
    });
  }
}
```

## 🚀 Deployment Considerations

### Environment Variables

**Tool-specific Configuration:**
```typescript
// In .env file
WEATHER_API_KEY=your-weather-api-key
N8N_TOOL_URL=https://your-n8n-instance.com/webhook
N8N_SECRET=your-n8n-secret
CUSTOM_TOOL_TIMEOUT=30000
```

**Using Environment Variables:**
```typescript
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const N8N_URL = process.env.N8N_TOOL_URL;
const TIMEOUT = parseInt(process.env.CUSTOM_TOOL_TIMEOUT || '30000');
```

### Security

**API Key Management:**
```typescript
if (!process.env.WEATHER_API_KEY) {
  throw new Error('WEATHER_API_KEY environment variable is required');
}
```

**Input Validation:**
```typescript
handler: async (args: any) => {
  // Validate required parameters
  if (!args.latitude || !args.longitude) {
    return JSON.stringify({ error: 'Missing required parameters' });
  }
  
  // Validate parameter types
  if (typeof args.latitude !== 'number' || typeof args.longitude !== 'number') {
    return JSON.stringify({ error: 'Invalid parameter types' });
  }
  
  // Validate ranges
  if (args.latitude < -90 || args.latitude > 90) {
    return JSON.stringify({ error: 'Latitude must be between -90 and 90' });
  }
  
  // Continue with tool logic
}
```

### Performance

**Connection Pooling:**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

handler: async (args: any) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM data WHERE id = $1', [args.id]);
    return JSON.stringify({ success: true, data: result.rows });
  } finally {
    client.release();
  }
}
```

**Caching:**
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

handler: async (args: any) => {
  const cacheKey = `tool_${toolName}_${JSON.stringify(args)}`;
  
  let result = cache.get(cacheKey);
  if (!result) {
    result = await performOperation(args);
    cache.set(cacheKey, result);
  }
  
  return JSON.stringify(result);
}
```

## 📚 Tool Templates

### Common Tool Patterns

**API Integration Tool:**
```typescript
{
  schema: {
    name: "api_tool",
    type: "function",
    description: "Call external API",
    parameters: {
      type: "object",
      properties: {
        endpoint: { type: "string", description: "API endpoint" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
        data: { type: "object", description: "Request data" }
      },
      required: ["endpoint", "method"]
    }
  },
  handler: async (args: any) => {
    const response = await fetch(args.endpoint, {
      method: args.method,
      headers: { "Content-Type": "application/json" },
      body: args.data ? JSON.stringify(args.data) : undefined
    });
    
    return JSON.stringify(await response.json());
  }
}
```

**Database Query Tool:**
```typescript
{
  schema: {
    name: "db_query",
    type: "function",
    description: "Execute database query",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL query" },
        params: { type: "array", description: "Query parameters" }
      },
      required: ["query"]
    }
  },
  handler: async (args: any) => {
    const client = await pool.connect();
    try {
      const result = await client.query(args.query, args.params || []);
      return JSON.stringify({ success: true, rows: result.rows });
    } finally {
      client.release();
    }
  }
}
```

**File Processing Tool:**
```typescript
{
  schema: {
    name: "process_file",
    type: "function",
    description: "Process uploaded file",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "File name" },
        operation: { type: "string", enum: ["read", "write", "delete"] }
      },
      required: ["filename", "operation"]
    }
  },
  handler: async (args: any) => {
    const fs = require('fs').promises;
    
    try {
      switch (args.operation) {
        case 'read':
          const content = await fs.readFile(args.filename, 'utf8');
          return JSON.stringify({ success: true, content });
        case 'write':
          await fs.writeFile(args.filename, args.content);
          return JSON.stringify({ success: true });
        case 'delete':
          await fs.unlink(args.filename);
          return JSON.stringify({ success: true });
        default:
          return JSON.stringify({ error: 'Invalid operation' });
      }
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  }
}
```

This comprehensive guide should help you create robust, efficient, and well-integrated custom tools for the system.
