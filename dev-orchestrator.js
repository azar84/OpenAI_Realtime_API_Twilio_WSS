#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

class DevOrchestrator {
  constructor() {
    this.processes = new Map();
    this.ngrokUrl = null;
    this.envFile = path.resolve(__dirname, '.env');
  }

  async cleanup() {
    log('yellow', '🧹 Stopping all existing processes...');
    
    // Kill all related processes
    const killCommands = [
      'pkill -f "ts-node.*server.ts"',
      'pkill -f "npm.*ts-node.*server.ts"',
      'pkill -f "next dev"',
      'pkill -f "npm.*next dev"',
      'pkill -f ngrok',
      'killall ngrok'
    ];

    for (const cmd of killCommands) {
      try {
        await this.execCommand(cmd);
      } catch (e) {
        // Ignore errors - processes might not exist
      }
    }

    // Force kill processes on specific ports
    try {
      await this.execCommand('lsof -ti:3000,8081 | xargs kill -9');
    } catch (e) {
      // Ignore errors - ports might be free
    }

    await this.sleep(3000);
    log('green', '✅ All existing processes stopped');
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getNgrokUrl() {
    const maxAttempts = 10;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get('http://localhost:4040/api/tunnels');
        const tunnels = response.data.tunnels;
        
        if (tunnels && tunnels.length > 0) {
          const url = tunnels[0].public_url;
          if (url && url.startsWith('https://')) {
            return url;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      log('yellow', `⏳ Waiting for ngrok to start... (attempt ${attempt}/${maxAttempts})`);
      await this.sleep(3000);
    }
    
    throw new Error('Failed to get ngrok URL after maximum attempts');
  }

  async updateEnvFile(ngrokUrl) {
    log('blue', '📝 Updating unified .env file with ngrok URL...');
    
    if (!fs.existsSync(this.envFile)) {
      throw new Error(`Root .env file not found at ${this.envFile}`);
    }

    // Backup existing .env file
    fs.copyFileSync(this.envFile, `${this.envFile}.backup`);
    
    // Read current .env content
    let content = fs.readFileSync(this.envFile, 'utf8');
    
    // Remove existing PUBLIC_URL and ngrok URLs
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => 
      !line.startsWith('PUBLIC_URL=') && 
      !line.startsWith('NGROK_') &&
      !line.startsWith('# Auto-generated ngrok URLs')
    );
    
    // Add new environment variables
    const wsUrl = ngrokUrl.replace('https://', 'wss://');
    const newEnvVars = [
      '',
      '# Auto-generated ngrok URLs (for reference)',
      `PUBLIC_URL="${ngrokUrl}"`,
      `NGROK_URL=${ngrokUrl}`,
      `NGROK_WS_URL=${wsUrl}`,
      `NGROK_HTTPS_URL=${ngrokUrl}`,
      `NEXT_PUBLIC_WS_URL=${wsUrl}`,
      `NEXT_PUBLIC_WEBSOCKET_URL=${wsUrl}`
    ];
    
    const newContent = [...filteredLines, ...newEnvVars].join('\n');
    fs.writeFileSync(this.envFile, newContent);
    
    log('green', '✅ Updated unified .env file with:');
    log('blue', `   PUBLIC_URL: ${ngrokUrl}`);
    log('blue', `   HTTPS URL: ${ngrokUrl}`);
    log('blue', `   WebSocket URL: ${wsUrl}`);
    log('blue', '   Backup saved as .env.backup');
  }

  async waitForService(url, serviceName, maxAttempts = 10) {
    log('yellow', `   Waiting for ${serviceName} to start...`);
    
    for (let i = 1; i <= maxAttempts; i++) {
      try {
        await axios.get(url, { timeout: 5000 });
        log('green', `✅ ${serviceName} ready`);
        return true;
      } catch (e) {
        if (i === maxAttempts) {
          log('red', `❌ ${serviceName} failed to start after ${maxAttempts * 3} seconds`);
          return false;
        }
        await this.sleep(3000);
      }
    }
    return false;
  }

  async startWebSocketServer() {
    log('blue', '🔌 Starting WebSocket Server...');
    
    const wsProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, 'packages/websocket-server'),
      stdio: 'pipe'
    });
    
    this.processes.set('websocket', wsProcess);
    
    // Wait for WebSocket server to be ready
    const isReady = await this.waitForService('http://localhost:8081/tools', 'WebSocket Server');
    if (!isReady) {
      throw new Error('WebSocket Server failed to start');
    }
    
    return wsProcess;
  }

  async startNgrok() {
    log('blue', '🌍 Starting Ngrok...');
    
    const ngrokProcess = spawn('ngrok', ['http', '8081', '--log=stdout'], {
      stdio: 'pipe'
    });
    
    this.processes.set('ngrok', ngrokProcess);
    
    // Wait for ngrok and get URL
    this.ngrokUrl = await this.getNgrokUrl();
    log('green', `✅ Ngrok ready with URL: ${this.ngrokUrl}`);
    
    return ngrokProcess;
  }

  async startWebApp() {
    log('blue', '🌐 Starting Web App...');
    
    const webProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, 'packages/webapp'),
      stdio: 'pipe'
    });
    
    this.processes.set('webapp', webProcess);
    
    // Wait for web app to be ready
    const isReady = await this.waitForService('http://localhost:3000/api/twilio', 'Web App');
    if (!isReady) {
      throw new Error('Web App failed to start');
    }
    
    return webProcess;
  }

  async restartWebSocketServer() {
    log('yellow', '   Restarting WebSocket Server to load new PUBLIC_URL...');
    
    // Kill existing WebSocket server
    const wsProcess = this.processes.get('websocket');
    if (wsProcess) {
      wsProcess.kill();
      await this.sleep(2000);
    }
    
    // Start new WebSocket server
    const newWsProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, 'packages/websocket-server'),
      stdio: 'pipe'
    });
    
    this.processes.set('websocket', newWsProcess);
    
    // Wait for WebSocket server to restart
    const isReady = await this.waitForService('http://localhost:8081/tools', 'WebSocket Server (restarted)');
    if (!isReady) {
      throw new Error('WebSocket Server failed to restart');
    }
    
    return newWsProcess;
  }

  displayStatus() {
    log('green', '🎉 All services started successfully!');
    console.log('================================================');
    log('blue', '📊 Service Status:');
    console.log(`  ✅ WebSocket Server: http://localhost:8081`);
    console.log(`  ✅ Web App: http://localhost:3000`);
    console.log(`  ✅ Ngrok: ${this.ngrokUrl}`);
    console.log('');
    log('blue', '🌐 Access URLs:');
    console.log('  Web App: http://localhost:3000');
    console.log('  Ngrok Dashboard: http://localhost:4040');
    console.log(`  Public HTTPS: ${this.ngrokUrl}`);
    console.log(`  Public WebSocket: ${this.ngrokUrl.replace('https://', 'wss://')}`);
    console.log('');
    log('blue', '📋 For Twilio Configuration:');
    console.log(`  Webhook URL: ${this.ngrokUrl}/twiml`);
    console.log(`  Status Callback: ${this.ngrokUrl}/status`);
    console.log('');
    log('blue', '🔍 Service Health Check:');
    console.log('  WebSocket Server Tools: http://localhost:8081/tools');
    console.log('  WebApp API: http://localhost:3000/api/twilio');
    console.log('');
    log('yellow', '💡 To stop all services, press Ctrl+C');
  }

  async cleanupOnExit() {
    log('yellow', '🛑 Stopping all services...');
    
    for (const [name, process] of this.processes) {
      if (process && !process.killed) {
        process.kill();
      }
    }
    
    log('green', '✅ All services stopped');
    process.exit(0);
  }

  async start() {
    try {
      log('blue', '🚀 Starting OpenAI Realtime + Twilio Demo');
      console.log('================================================');
      
      // Cleanup existing processes
      await this.cleanup();
      
      // Start WebSocket Server
      await this.startWebSocketServer();
      
      // Start Ngrok
      await this.startNgrok();
      
      // Update .env file with ngrok URL
      await this.updateEnvFile(this.ngrokUrl);
      
      // Restart WebSocket Server to pick up new environment variables
      await this.restartWebSocketServer();
      
      // Start Web App (only after everything is ready)
      await this.startWebApp();
      
      // Display final status
      this.displayStatus();
      
      // Set up cleanup on exit
      process.on('SIGINT', () => this.cleanupOnExit());
      process.on('SIGTERM', () => this.cleanupOnExit());
      
      // Keep the process running
      setInterval(() => {}, 1000);
      
    } catch (error) {
      log('red', `❌ Error: ${error.message}`);
      await this.cleanupOnExit();
      process.exit(1);
    }
  }
}

// Start the orchestrator
const orchestrator = new DevOrchestrator();
orchestrator.start();
