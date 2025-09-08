#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping OpenAI Realtime + Twilio Demo Services${NC}"
echo "================================================"

echo -e "${YELLOW}🧹 Stopping all processes...${NC}"

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
sleep 2

echo -e "${GREEN}✅ All services stopped successfully${NC}"

# Show remaining processes (if any)
REMAINING=$(ps aux | grep -E "(ts-node|next dev|ngrok)" | grep -v grep | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some processes may still be running:${NC}"
    ps aux | grep -E "(ts-node|next dev|ngrok)" | grep -v grep
else
    echo -e "${GREEN}🎉 All services completely stopped${NC}"
fi
