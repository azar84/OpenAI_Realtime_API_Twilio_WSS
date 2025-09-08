#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting OpenAI Realtime + Twilio Demo${NC}"
echo "================================================"

# Function to kill existing processes
cleanup() {
    echo -e "\n${YELLOW}🧹 Stopping all existing processes...${NC}"
    
    # Kill all related processes
    echo -e "${YELLOW}   Stopping WebSocket servers...${NC}"
    pkill -f "ts-node.*server.ts" 2>/dev/null
    pkill -f "npm.*ts-node.*server.ts" 2>/dev/null
    
    echo -e "${YELLOW}   Stopping Next.js apps...${NC}"
    pkill -f "next dev" 2>/dev/null
    pkill -f "npm.*next dev" 2>/dev/null
    
    echo -e "${YELLOW}   Stopping ngrok tunnels...${NC}"
    pkill -f ngrok 2>/dev/null
    killall ngrok 2>/dev/null
    
    # Force kill processes on specific ports
    echo -e "${YELLOW}   Clearing ports 3000, 8081...${NC}"
    lsof -ti:3000,8081 | xargs kill -9 2>/dev/null || true
    
    # Wait for processes to die
    sleep 3
    
    echo -e "${GREEN}✅ All existing processes stopped${NC}"
}

# Function to get ngrok URL
get_ngrok_url() {
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local url=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('tunnels'):
        print(data['tunnels'][0]['public_url'])
except:
    pass
" 2>/dev/null)
        
        if [ ! -z "$url" ] && [[ "$url" == https://* ]]; then
            echo "$url"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for ngrok to start... (attempt $attempt/$max_attempts)${NC}" >&2
        sleep 3
        ((attempt++))
    done
    
    echo -e "${RED}❌ Failed to get ngrok URL after $max_attempts attempts${NC}" >&2
    return 1
}

# Function to update .env with ngrok URL
update_env() {
    local ngrok_url="$1"
    local ws_url="${ngrok_url/https:\/\//wss://}"
    local ws_env_file="../websocket-server/.env"
    local webapp_env_file=".env"
    
    echo -e "${BLUE}📝 Updating .env files with ngrok URL...${NC}"
    
    # Update WebSocket Server .env file (main one that needs PUBLIC_URL)
    if [ -f "$ws_env_file" ]; then
        echo -e "${YELLOW}   Updating websocket-server/.env...${NC}"
        cp "$ws_env_file" "$ws_env_file.backup"
        
        # Remove existing PUBLIC_URL lines (including any corrupted ones)
        grep -v '^PUBLIC_URL=' "$ws_env_file" > "$ws_env_file.tmp"
        mv "$ws_env_file.tmp" "$ws_env_file"
        
        # Add new PUBLIC_URL (ensure clean format)
        echo "PUBLIC_URL=\"$ngrok_url\"" >> "$ws_env_file"
        
        echo -e "${GREEN}   ✅ Updated websocket-server/.env with PUBLIC_URL${NC}"
    else
        echo -e "${YELLOW}   Creating websocket-server/.env...${NC}"
        echo "PUBLIC_URL=\"$ngrok_url\"" > "$ws_env_file"
    fi
    
    # Update WebApp .env file (for reference)
    if [ -f "$webapp_env_file" ]; then
        echo -e "${YELLOW}   Updating webapp/.env...${NC}"
        cp "$webapp_env_file" "$webapp_env_file.backup"
        
        # Remove existing auto-generated ngrok URLs
        sed -i.tmp '/# Auto-generated ngrok URLs/,/^$/d' "$webapp_env_file"
        rm -f "$webapp_env_file.tmp"
    fi
    
    # Add new ngrok URLs to webapp .env
    echo "" >> "$webapp_env_file"
    echo "# Auto-generated ngrok URLs (for reference)" >> "$webapp_env_file"
    echo "NGROK_URL=$ngrok_url" >> "$webapp_env_file"
    echo "NGROK_WS_URL=$ws_url" >> "$webapp_env_file"
    echo "NGROK_HTTPS_URL=$ngrok_url" >> "$webapp_env_file"
    echo "" >> "$webapp_env_file"
    
    echo -e "${GREEN}✅ Updated .env files with:${NC}"
    echo -e "   PUBLIC_URL (websocket-server): $ngrok_url"
    echo -e "   HTTPS URL (webapp): $ngrok_url"
    echo -e "   WebSocket URL (webapp): $ws_url"
    echo -e "   Backups saved as .env.backup"
}

# Cleanup existing processes
cleanup

# Start WebSocket Server
echo -e "${BLUE}🔌 Starting WebSocket Server...${NC}"
cd ../websocket-server
npx ts-node src/server.ts &
WS_PID=$!

# Wait for WebSocket server to be ready
echo -e "${YELLOW}   Waiting for WebSocket server to start...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:8081/tools >/dev/null 2>&1; then
        echo -e "${GREEN}✅ WebSocket Server ready (PID: $WS_PID)${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ WebSocket Server failed to start after 30 seconds${NC}"
        exit 1
    fi
    sleep 3
done

# Start Ngrok (before webapp so URL is available)
echo -e "${BLUE}🌍 Starting Ngrok...${NC}"
ngrok http 8081 &
NGROK_PID=$!

# Wait for ngrok and get URL
echo -e "${YELLOW}   Waiting for ngrok to start...${NC}"
NGROK_URL=$(get_ngrok_url)

if [ $? -eq 0 ] && [ ! -z "$NGROK_URL" ]; then
    echo -e "${GREEN}✅ Ngrok ready (PID: $NGROK_PID)${NC}"
    echo -e "${BLUE}📝 Updating .env files with ngrok URL: $NGROK_URL${NC}"
    update_env "$NGROK_URL"
    
    # Verify .env was updated correctly
    if grep -q "PUBLIC_URL=\"$NGROK_URL\"" "../websocket-server/.env"; then
        echo -e "${GREEN}✅ WebSocket Server .env updated successfully${NC}"
        
        # Restart WebSocket server to pick up new environment variables
        echo -e "${YELLOW}   Restarting WebSocket Server to load new PUBLIC_URL...${NC}"
        kill $WS_PID 2>/dev/null
        sleep 2
        
        cd ../websocket-server
        npx ts-node src/server.ts &
        WS_PID=$!
        
        # Wait for WebSocket server to restart with new env
        echo -e "${YELLOW}   Waiting for WebSocket server to restart with new environment...${NC}"
        for i in {1..10}; do
            if curl -s http://localhost:8081/tools >/dev/null 2>&1; then
                echo -e "${GREEN}✅ WebSocket Server restarted with updated environment (PID: $WS_PID)${NC}"
                break
            fi
            if [ $i -eq 10 ]; then
                echo -e "${RED}❌ WebSocket Server failed to restart after 30 seconds${NC}"
                kill $NGROK_PID 2>/dev/null
                exit 1
            fi
            sleep 3
        done
        
        echo -e "${GREEN}✅ Environment update complete${NC}"
    else
        echo -e "${RED}❌ Failed to update WebSocket Server .env${NC}"
        kill $WS_PID $NGROK_PID 2>/dev/null
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to get ngrok URL${NC}"
    kill $WS_PID $NGROK_PID 2>/dev/null
    exit 1
fi

# Start Web App (ONLY after ngrok is ready, .env is updated, and WebSocket server is restarted)
echo -e "${BLUE}🌐 Starting Web App...${NC}"
echo -e "${GREEN}   ✅ Prerequisites ready: WebSocket Server (restarted) + Ngrok + .env updated${NC}"
echo -e "${YELLOW}   Starting Next.js development server...${NC}"
cd ../webapp
npm run dev &
WEB_PID=$!

# Wait for web app to be ready
echo -e "${YELLOW}   Waiting for Web App to start...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:3000/api/twilio >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Web App ready (PID: $WEB_PID)${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Web App failed to start after 30 seconds${NC}"
        kill $WS_PID $NGROK_PID 2>/dev/null
        exit 1
    fi
    sleep 3
done


# Display final status
echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "================================================"
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "  ✅ WebSocket Server: http://localhost:8081 (PID: $WS_PID)"
echo -e "  ✅ Web App: http://localhost:3000 (PID: $WEB_PID)"
echo -e "  ✅ Ngrok: $NGROK_URL (PID: $NGROK_PID)"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "  Web App: http://localhost:3000"
echo -e "  Ngrok Dashboard: http://localhost:4040"
echo -e "  Public HTTPS: $NGROK_URL"
echo -e "  Public WebSocket: ${NGROK_URL/https:\/\//wss://}"
echo ""
echo -e "${BLUE}📋 For Twilio Configuration:${NC}"
echo -e "  Webhook URL: ${NGROK_URL/https:\/\//wss://}"
echo -e "  Status Callback: $NGROK_URL/status"
echo ""
echo -e "${BLUE}🔍 Service Health Check:${NC}"
echo -e "  WebSocket Server Tools: http://localhost:8081/tools"
echo -e "  WebApp API: http://localhost:3000/api/twilio"
echo ""
echo -e "${YELLOW}💡 To stop all services, press Ctrl+C or run ./stop-all.sh${NC}"

# Wait for user interrupt
trap 'echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"; kill $WS_PID $WEB_PID $NGROK_PID 2>/dev/null; echo -e "${GREEN}✅ All services stopped${NC}"; exit 0' INT

# Keep script running
while true; do
    sleep 1
done
