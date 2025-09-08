# 🔄 Startup Flow - WebSocket Server Environment Reload

## 🎯 The Core Issue
The WebSocket server loads `PUBLIC_URL` from environment variables at startup:
```javascript
// websocket-server/src/server.ts line 18
const PUBLIC_URL = process.env.PUBLIC_URL || "";
```

This means when we update the `.env` file with the ngrok URL, the **WebSocket server must be restarted** to pick up the new value.

## 📋 Complete Startup Sequence

### 1. **🔌 Start WebSocket Server (Initial)**
- Starts with empty `PUBLIC_URL=""`
- Loads environment from `.env` file
- Runs on port 8081

### 2. **🌍 Start Ngrok**
- Creates tunnel to port 8081
- Gets public URL (e.g., `https://abc123.ngrok-free.app`)

### 3. **📝 Update .env Files**
- Updates `websocket-server/.env` with `PUBLIC_URL="https://abc123.ngrok-free.app"`
- Updates `webapp/.env` with reference URLs

### 4. **🔄 Restart WebSocket Server** ⭐ **CRITICAL STEP**
- Kills the initial WebSocket server process
- Starts new WebSocket server process
- **New process loads updated `PUBLIC_URL` from .env**
- Health check confirms server is ready

### 5. **🌐 Start Web App**
- Only starts after WebSocket server is restarted
- Can immediately connect to updated WebSocket server
- Has access to all environment variables

## 🔧 Why This Works

```javascript
// Before restart: PUBLIC_URL = ""
// After restart:  PUBLIC_URL = "https://abc123.ngrok-free.app"

app.all("/twiml", (req, res) => {
  const wsUrl = new URL(PUBLIC_URL);  // Now has correct URL!
  wsUrl.protocol = "wss:";
  wsUrl.pathname = `/call`;
  // ...
});
```

## ✅ Guarantees

- ✅ WebSocket server **always** has the correct PUBLIC_URL
- ✅ TwiML responses use the current ngrok URL
- ✅ No race conditions between services
- ✅ Environment variables are properly loaded
- ✅ Web app starts only after everything is ready

## 🚨 Without Restart

❌ WebSocket server would have `PUBLIC_URL = ""`
❌ TwiML would generate invalid WebSocket URLs
❌ Twilio calls would fail to connect
❌ Agent would not work properly

## 🎉 With Restart

✅ WebSocket server has correct `PUBLIC_URL`
✅ TwiML generates proper WebSocket URLs  
✅ Twilio calls connect successfully
✅ Agent works perfectly

**The restart is essential for proper operation!** 🔄
