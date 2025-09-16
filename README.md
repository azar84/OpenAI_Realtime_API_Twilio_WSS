# OpenAI Realtime API + Twilio Voice Integration

A complete implementation of OpenAI's Realtime API integrated with Twilio Voice for phone-based AI conversations with custom tool calling capabilities.

## 🚀 Features

- **Real-time voice conversations** with OpenAI's GPT-4o Realtime model
- **Twilio Voice integration** for phone calls
- **Custom tool calling** with n8n workflow integration
- **Automated service orchestration** with startup scripts
- **WebSocket-based architecture** for low-latency communication
- **Audio format optimization** for Twilio (G.711 μ-law)

## 🏗️ Architecture

```
Phone Call → Twilio → WebSocket Server → OpenAI Realtime API
                  ↕                    ↕
              Web Interface ←→ Custom Tools (n8n)
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **OpenAI API key** with Realtime API access
- **Twilio account** with phone number
- **ngrok** (for local development)
- **n8n instance** (optional, for custom tools)

## ⚡ Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/OpenAI_Realtime_API_Twilio_WSS.git
cd OpenAI_Realtime_API_Twilio_WSS
```

### 2. Install Dependencies

```bash
# Install WebSocket server dependencies
cd websocket-server
npm install

# Install webapp dependencies  
cd ../webapp
npm install
```

### 3. Configure Environment Variables

**WebSocket Server** (`websocket-server/.env`):
```bash
cp .env.example .env
# Edit .env with your values:
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
PORT=8081
# Other variables will be set automatically by startup scripts
```

**Web App** (`webapp/.env`):
```bash
cp .env.example .env
# Most variables are set automatically by startup scripts
```

### 4. Start All Services (Automated)

```bash
cd webapp
./start-all.sh
```

This script will:
- ✅ Start WebSocket server on port 8081
- ✅ Start ngrok tunnel and get public URL
- ✅ Update environment variables automatically
- ✅ Restart services to load new config
- ✅ Start Next.js webapp on port 3000

### 5. Configure Twilio Webhook

1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click your phone number
3. Set **Voice webhook URL** to: `https://your-ngrok-url.ngrok-free.app/twiml`
4. Set HTTP method to **POST**
5. Save configuration

### 6. Test the System

- **Call your Twilio number** → Should hear "Connected"
- **Speak to the AI** → Should get intelligent responses
- **Ask for weather** → AI will call the weather tool
- **Ask about customers** → AI will call the n8n tool (if configured)

## 🛠️ Available Tools

### Built-in Tools

1. **Weather Tool** (`get_weather_from_coords`)
   - Get current weather by coordinates
   - Uses Open-Meteo API

### Custom Tools (n8n Integration)

2. **Customer Lookup** (`lookup_customer`)
   - Find customer information by phone number
   - Integrates with n8n workflow
   - Configure `N8N_TOOL_URL` and `N8N_SECRET` in `.env`

## 📁 Project Structure

```
├── websocket-server/          # Backend WebSocket server
│   ├── src/
│   │   ├── server.ts         # Main server file
│   │   ├── sessionManager.ts # OpenAI Realtime session handling
│   │   ├── functionHandlers.ts # Custom tool definitions
│   │   └── types.ts          # TypeScript interfaces
│   ├── .env.example          # Environment template
│   └── package.json
│
├── webapp/                   # Next.js frontend
│   ├── app/                  # Next.js 13+ app directory
│   ├── components/           # React components
│   ├── lib/                  # Utility functions
│   ├── start-all.sh         # 🚀 Main startup script
│   ├── start-simple.js      # Node.js alternative
│   ├── stop-all.sh          # Shutdown script
│   ├── .env.example         # Environment template
│   └── package.json
│
├── README.md                 # This file
└── .gitignore               # Git ignore rules
```

## 🔧 Manual Setup (Alternative)

If you prefer manual setup instead of the automated scripts:

### 1. Start WebSocket Server
```bash
cd websocket-server
npm run dev
```

### 2. Start ngrok
```bash
ngrok http 8081
# Copy the https URL
```

### 3. Update Environment
```bash
# In websocket-server/.env
PUBLIC_URL=https://your-ngrok-url.ngrok-free.app
```

### 4. Restart WebSocket Server
```bash
# Restart to load new PUBLIC_URL
cd websocket-server
npm run dev
```

### 5. Start Web App
```bash
cd webapp
npm run dev
```

## 🎛️ Configuration Options

### OpenAI Realtime API Settings

The system is configured for optimal Twilio integration:

- **Model**: `gpt-4o-realtime-preview-2024-12-17`
- **Voice**: `ash`
- **Audio Format**: `g711_ulaw` (Twilio compatible)
- **Turn Detection**: Server-side VAD (Voice Activity Detection)
- **Tools**: Enabled with custom function calling

### Audio Configuration

- **Input**: G.711 μ-law (from Twilio)
- **Output**: G.711 μ-law (to Twilio)
- **Sample Rate**: 8kHz
- **Channels**: Mono

## 🔍 Troubleshooting

### Common Issues

1. **"Connected" but no AI response**
   - Check OpenAI API key is valid
   - Verify WebSocket server logs for connection errors
   - Ensure PUBLIC_URL is set correctly

2. **Compilation errors**
   - Check Node.js version (v18+ required)
   - Run `npm install` in both directories
   - Verify TypeScript configuration

3. **Twilio webhook errors**
   - Verify webhook URL is correct ngrok URL + `/twiml`
   - Check ngrok is running and tunnel is active
   - Ensure WebSocket server is accessible

4. **Audio issues (noise/distortion)**
   - Audio format is optimized for G.711 μ-law
   - Check network connectivity
   - Verify Twilio account configuration

### Debug Mode

Enable detailed logging:

```bash
# In websocket-server/.env
# Add any custom environment variables here
```

## 🧪 Development

### Adding Custom Tools

1. **Define tool schema** in `websocket-server/src/functionHandlers.ts`:

```typescript
functions.push({
  schema: {
    name: "your_tool_name",
    type: "function",
    description: "What your tool does",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "Parameter description" }
      },
      required: ["param1"]
    }
  },
  handler: async (args: { param1: string }) => {
    // Your tool logic here
    return JSON.stringify({ result: "success" });
  }
});
```

2. **Restart the server** to load new tools

### Testing Tools

Test tools directly via HTTP:

```bash
curl http://localhost:8081/tools
# Should show all available tools
```

## 📚 API Reference

### WebSocket Server Endpoints

- `GET /tools` - List available tools
- `GET /public-url` - Get current public URL
- `POST /twiml` - Twilio webhook endpoint
- `WS /call` - Twilio WebSocket connection
- `WS /logs` - Frontend logging connection

### Environment Variables

See `.env.example` files for complete reference.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Examples**: See `webapp/` directory

## 🎉 Acknowledgments

- **OpenAI** for the Realtime API
- **Twilio** for voice infrastructure
- **n8n** for workflow automation
- **Next.js** for the web interface

---

**Ready to build amazing voice AI experiences!** 🚀🎤🤖
# Automated Deployment Test - Tue Sep 16 16:48:31 CST 2025

# Testing GitHub Secrets Deployment - Tue Sep 16 16:53:55 CST 2025
