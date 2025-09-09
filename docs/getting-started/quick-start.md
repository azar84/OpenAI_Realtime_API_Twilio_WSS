# Quick Start Guide

Get the OpenAI Realtime + Twilio Demo running in under 10 minutes!

## 🎯 Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher
- **PostgreSQL** database running
- **OpenAI API key** with Realtime API access
- **Twilio account** with a phone number
- **ngrok** installed and authenticated

## ⚡ One-Command Setup

The fastest way to get started:

```bash
# Clone the repository
git clone <repository-url>
cd openai-realtime-twilio-demo

# Install dependencies
cd webapp
npm install
cd ../websocket-server
npm install

# Start everything with one command
cd ../webapp
./start-all.sh
```

## 🔧 Manual Setup (Step by Step)

### 1. Database Setup

```bash
# Create database
createdb openai_realtime_db

# Run schema
psql openai_realtime_db < database/schema.sql
```

### 2. Environment Configuration

**WebSocket Server** (`websocket-server/.env`):
```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openai_realtime_db
DB_USER=your-username
DB_PASSWORD=your-password
PORT=8081
```

**Web App** (`webapp/.env`):
```env
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

### 3. Start Services

```bash
# Terminal 1: WebSocket Server
cd websocket-server
npm run dev

# Terminal 2: Ngrok (in new terminal)
ngrok http 8081

# Terminal 3: Web App (in new terminal)
cd webapp
npm run dev
```

### 4. Configure Twilio

1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click your phone number
3. Set **Voice webhook URL** to: `wss://your-ngrok-url.ngrok-free.app`
4. Set HTTP method to **POST**
5. Save configuration

## 🌐 Access the System

Once everything is running:

- **Web App**: http://localhost:3000
- **Ngrok Dashboard**: http://localhost:4040
- **WebSocket Server**: http://localhost:8081

## 🧪 Test the System

### Test Voice Chat
1. Open http://localhost:3000
2. Click "Connect to Agent" in the Voice Chat panel
3. Allow microphone access
4. Start speaking - you should hear AI responses

### Test Phone Calls
1. Call your Twilio phone number
2. You should hear "Connected" and be able to talk to the AI
3. Try asking "What's the weather like?" to test tool calling

## 🎉 Success!

If you can:
- ✅ Access the web interface
- ✅ Use voice chat in the browser
- ✅ Make phone calls that connect to the AI
- ✅ See real-time transcripts
- ✅ Test tool calling (weather, customer lookup)

Then you're all set! 🚀

## 🆘 Need Help?

- **Quick issues**: Check [Common Issues](../troubleshooting/common-issues.md)
- **Detailed setup**: See [Installation Guide](./installation.md)
- **Configuration**: Review [Configuration Guide](./configuration.md)

## 🚀 Next Steps

- [Configure your agent](./configuration.md)
- [Add custom tools](../development/custom-tools.md)
- [Deploy to production](../deployment/production.md)
