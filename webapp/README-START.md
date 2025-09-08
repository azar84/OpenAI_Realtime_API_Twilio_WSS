# 🚀 Quick Start Scripts

This directory contains scripts to easily start all services for the OpenAI Realtime + Twilio Demo.

## 📋 Available Scripts

### 1. Bash Script (Recommended)
```bash
./start-all.sh
```

### 2. Node.js Script
```bash
npm run start-all-simple
```

### 3. Manual Start
```bash
npm run start-all
```

## 🎯 What the Scripts Do

1. **Clean up** any existing processes
2. **Start WebSocket Server** on port 8081
3. **Start Web App** on port 3000
4. **Start Ngrok** tunnel
5. **Get ngrok URL** automatically
6. **Update .env file** with ngrok URLs
7. **Display all URLs** for easy access

## 📁 Generated Environment Variables

The scripts automatically update environment variables in both directories:

**WebSocket Server** (`../websocket-server/.env`):
```env
PUBLIC_URL="https://your-ngrok-url.ngrok-free.app"
```

**WebApp** (`./webapp/.env`):
```env
# Auto-generated ngrok URLs (for reference)
NGROK_URL=https://your-ngrok-url.ngrok-free.app
NGROK_WS_URL=wss://your-ngrok-url.ngrok-free.app
NGROK_HTTPS_URL=https://your-ngrok-url.ngrok-free.app
```

## 🌐 Access URLs

After running the script, you'll have access to:

- **Web App**: http://localhost:3000
- **Ngrok Dashboard**: http://localhost:4040
- **Public HTTPS**: https://your-ngrok-url.ngrok-free.app
- **Public WebSocket**: wss://your-ngrok-url.ngrok-free.app

## 📞 Twilio Configuration

Use these URLs for your Twilio phone number configuration:

- **Webhook URL**: `wss://your-ngrok-url.ngrok-free.app`
- **Status Callback**: `https://your-ngrok-url.ngrok-free.app/status`

## 🛑 Stopping Services

Press `Ctrl+C` to stop all services gracefully.

## 🔧 Troubleshooting

### Port Already in Use
If you get port conflicts, the script will clean up existing processes first.

### Ngrok URL Not Found
The script will retry up to 10 times to get the ngrok URL. If it fails:
1. Check that ngrok is running: http://localhost:4040
2. Manually copy the URL from the ngrok dashboard

### Services Not Starting
1. Make sure you're in the webapp directory
2. Check that all dependencies are installed: `npm install`
3. Verify the websocket-server directory exists

## 📝 Manual Steps (if scripts fail)

1. Start WebSocket Server:
   ```bash
   cd ../websocket-server
   npx ts-node src/server.ts &
   ```

2. Start Web App:
   ```bash
   cd ../webapp
   npm run dev &
   ```

3. Start Ngrok:
   ```bash
   ngrok http 8081 &
   ```

4. Get ngrok URL from: http://localhost:4040

5. Update .env file with the ngrok URL

## 🎉 Ready to Use!

Once all services are running, you can:
1. Visit the web app at http://localhost:3000
2. Select a Twilio phone number
3. Configure your session settings
4. Make test calls with full tool calling capabilities!
