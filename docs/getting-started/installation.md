# Installation Guide

Detailed installation instructions for the OpenAI Realtime + Twilio Demo system.

## 📋 System Requirements

### Hardware Requirements
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Stable internet connection

### Software Requirements
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v12 or higher
- **Git**: For cloning the repository
- **ngrok**: For local development tunneling

## 🔧 Installation Steps

### 1. Install Node.js

**macOS (using Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/) or use [Chocolatey](https://chocolatey.org/):
```powershell
choco install nodejs
```

**Verify installation:**
```bash
node --version  # Should be v18+
npm --version
```

### 2. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/) or use [Chocolatey](https://chocolatey.org/):
```powershell
choco install postgresql
```

**Verify installation:**
```bash
psql --version
```

### 3. Install ngrok

**macOS (using Homebrew):**
```bash
brew install ngrok/ngrok/ngrok
```

**Linux/Windows:**
1. Download from [ngrok.com](https://ngrok.com/download)
2. Extract and add to PATH
3. Sign up for free account
4. Get authtoken from [dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

**Authenticate ngrok:**
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

**Verify installation:**
```bash
ngrok version
```

### 4. Clone the Repository

```bash
git clone <repository-url>
cd openai-realtime-twilio-demo
```

### 5. Install Dependencies

**WebSocket Server:**
```bash
cd websocket-server
npm install
```

**Web App:**
```bash
cd ../webapp
npm install
```

### 6. Database Setup

**Create database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE openai_realtime_db;

# Create user (optional)
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE openai_realtime_db TO your_username;

# Exit psql
\q
```

**Run schema:**
```bash
psql -U postgres -d openai_realtime_db -f database/schema.sql
```

### 7. Environment Configuration

**WebSocket Server** (`websocket-server/.env`):
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openai_realtime_db
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=8081
NODE_ENV=development

# Optional: n8n Integration
N8N_TOOL_URL=https://your-n8n-instance.com/webhook/tools
N8N_SECRET=your-n8n-secret
```

**Web App** (`webapp/.env`):
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Database Configuration (same as websocket-server)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openai_realtime_db
DB_USER=your_username
DB_PASSWORD=your_password

# Optional: Custom settings
NEXT_PUBLIC_WS_URL=ws://localhost:8081
```

### 8. Verify Installation

**Test database connection:**
```bash
cd websocket-server
npm run test:db
```

**Test WebSocket server:**
```bash
cd websocket-server
npm run dev
# Should see: "Server running on http://localhost:8081"
```

**Test web app:**
```bash
cd webapp
npm run dev
# Should see: "Ready - started server on 0.0.0.0:3000"
```

## 🔑 API Keys Setup

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Create new secret key
5. Copy the key (starts with `sk-proj-`)
6. Add to `websocket-server/.env`

**Note:** Ensure your account has access to the Realtime API.

### Twilio Account Setup

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up or sign in
3. Get your **Account SID** and **Auth Token** from the dashboard
4. Purchase a phone number:
   - Go to [Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
   - Click "Buy a number"
   - Choose a number with voice capabilities
5. Add credentials to `webapp/.env`

## 🧪 Test the Installation

### 1. Start All Services

```bash
cd webapp
./start-all.sh
```

### 2. Verify Services

**Check WebSocket Server:**
```bash
curl http://localhost:8081/tools
# Should return JSON with available tools
```

**Check Web App:**
```bash
curl http://localhost:3000/api/twilio
# Should return Twilio configuration
```

**Check ngrok:**
- Visit http://localhost:4040
- Should see your tunnel information

### 3. Test Voice Chat

1. Open http://localhost:3000
2. Click "Connect to Agent"
3. Allow microphone access
4. Speak and verify AI responses

### 4. Test Phone Calls

1. Configure Twilio webhook URL: `wss://your-ngrok-url.ngrok-free.app`
2. Call your Twilio number
3. Verify connection and AI responses

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill processes on ports 3000 and 8081
lsof -ti:3000,8081 | xargs kill -9
```

**Database connection failed:**
- Verify PostgreSQL is running
- Check credentials in `.env` files
- Ensure database exists

**ngrok not working:**
- Verify ngrok is authenticated
- Check if port 4040 is accessible
- Try restarting ngrok

**OpenAI API errors:**
- Verify API key is correct
- Check account has Realtime API access
- Verify billing is set up

### Getting Help

- Check [Common Issues](../troubleshooting/common-issues.md)
- Review [Debug Guide](../troubleshooting/debugging.md)
- Open an issue in the repository

## ✅ Installation Complete!

If all tests pass, your installation is complete! 

**Next steps:**
- [Configuration Guide](./configuration.md)
- [Quick Start Guide](./quick-start.md)
- [User Guides](../user-guides/web-interface.md)
