#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);

// Process IDs for cleanup
let processes = [];

// Cleanup function
const cleanup = () => {
  log(colors.yellow, '🧹 Cleaning up processes...');
  processes.forEach(pid => {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (e) {
      // Process might already be dead
    }
  });
  process.exit(0);
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Function to get ngrok URL
const getNgrokUrl = () => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkUrl = () => {
      attempts++;
      exec('curl -s http://localhost:4040/api/tunnels', (error, stdout) => {
        if (error) {
          if (attempts >= maxAttempts) {
            reject(new Error('Failed to get ngrok URL'));
            return;
          }
          setTimeout(checkUrl, 3000);
          return;
        }
        
        try {
          const data = JSON.parse(stdout);
          if (data.tunnels && data.tunnels.length > 0) {
            resolve(data.tunnels[0].public_url);
          } else {
            if (attempts >= maxAttempts) {
              reject(new Error('No tunnels found'));
              return;
            }
            setTimeout(checkUrl, 3000);
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            reject(new Error('Invalid JSON response'));
            return;
          }
          setTimeout(checkUrl, 3000);
        }
      });
    };
    
    checkUrl();
  });
};

// Function to update .env files
const updateEnv = (ngrokUrl) => {
  const wsEnvPath = path.join(__dirname, '../websocket-server/.env');
  const webappEnvPath = path.join(__dirname, '.env');
  const wsUrl = ngrokUrl.replace('https://', 'wss://');
  
  log(colors.blue, '📝 Updating .env files with ngrok URL...');
  
  // Update WebSocket Server .env file (main one that needs PUBLIC_URL)
  if (fs.existsSync(wsEnvPath)) {
    log(colors.yellow, '   Updating websocket-server/.env...');
    const wsBackupPath = wsEnvPath + '.backup';
    fs.copyFileSync(wsEnvPath, wsBackupPath);
    
    let wsContent = fs.readFileSync(wsEnvPath, 'utf8');
    // Remove existing PUBLIC_URL
    wsContent = wsContent.replace(/^PUBLIC_URL=.*$/gm, '');
    wsContent = wsContent.trim();
    
    // Add new PUBLIC_URL
    wsContent += `\nPUBLIC_URL="${ngrokUrl}"\n`;
    
    fs.writeFileSync(wsEnvPath, wsContent);
    log(colors.green, '   ✅ Updated websocket-server/.env with PUBLIC_URL');
  } else {
    log(colors.yellow, '   Creating websocket-server/.env...');
    fs.writeFileSync(wsEnvPath, `PUBLIC_URL="${ngrokUrl}"\n`);
  }
  
  // Update WebApp .env file (for reference)
  let webappContent = '';
  if (fs.existsSync(webappEnvPath)) {
    log(colors.yellow, '   Updating webapp/.env...');
    const webappBackupPath = webappEnvPath + '.backup';
    fs.copyFileSync(webappEnvPath, webappBackupPath);
    
    webappContent = fs.readFileSync(webappEnvPath, 'utf8');
    // Remove existing auto-generated ngrok URLs
    webappContent = webappContent.replace(/\n# Auto-generated ngrok URLs.*$/s, '');
    webappContent = webappContent.replace(/\nNGROK_URL=.*$/gm, '');
    webappContent = webappContent.replace(/\nNGROK_WS_URL=.*$/gm, '');
    webappContent = webappContent.replace(/\nNGROK_HTTPS_URL=.*$/gm, '');
  }
  
  // Add new ngrok URLs to webapp .env
  webappContent += '\n# Auto-generated ngrok URLs (for reference)\n';
  webappContent += `NGROK_URL=${ngrokUrl}\n`;
  webappContent += `NGROK_WS_URL=${wsUrl}\n`;
  webappContent += `NGROK_HTTPS_URL=${ngrokUrl}\n\n`;
  
  fs.writeFileSync(webappEnvPath, webappContent);
  
  log(colors.green, '✅ Updated .env files with:');
  log(colors.blue, `   PUBLIC_URL (websocket-server): ${ngrokUrl}`);
  log(colors.blue, `   HTTPS URL (webapp): ${ngrokUrl}`);
  log(colors.blue, `   WebSocket URL (webapp): ${wsUrl}`);
  log(colors.green, '   Backups saved as .env.backup');
};

// Function to start a process
const startProcess = (command, args, cwd, name) => {
  return new Promise((resolve, reject) => {
    log(colors.blue, `🔌 Starting ${name}...`);
    
    const child = spawn(command, args, {
      cwd: cwd,
      stdio: 'pipe',
      shell: true
    });
    
    processes.push(child.pid);
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started') || output.includes('running')) {
        log(colors.green, `✅ ${name} started (PID: ${child.pid})`);
        resolve(child);
      }
    });
    
    child.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('Failed')) {
        log(colors.red, `❌ ${name} failed: ${error}`);
        reject(new Error(`${name} failed to start`));
      }
    });
    
    child.on('error', (error) => {
      log(colors.red, `❌ ${name} error: ${error.message}`);
      reject(error);
    });
    
    // Give it some time to start
    setTimeout(() => {
      if (child.exitCode === null) {
        resolve(child);
      }
    }, 5000);
  });
};

// Main function
const main = async () => {
  try {
    log(colors.blue, '🚀 Starting OpenAI Realtime + Twilio Demo');
    console.log('================================================');
    
    // Start WebSocket Server
    const wsServer = await startProcess('npx', ['ts-node', 'src/server.ts'], '../websocket-server', 'WebSocket Server');
    
    // Start Ngrok (before web app)
    const ngrok = await startProcess('ngrok', ['http', '8081'], '.', 'Ngrok');
    
    // Wait for ngrok to initialize and get URL
    log(colors.blue, '⏳ Waiting for ngrok to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get ngrok URL and update .env
    log(colors.blue, '🔗 Getting ngrok URL...');
    const ngrokUrl = await getNgrokUrl();
    log(colors.blue, `📝 Updating .env files with ngrok URL: ${ngrokUrl}`);
    updateEnv(ngrokUrl);
    
    // Verify .env was updated
    const fs = require('fs');
    const wsEnvPath = require('path').join(__dirname, '../websocket-server/.env');
    if (fs.existsSync(wsEnvPath)) {
      const wsEnvContent = fs.readFileSync(wsEnvPath, 'utf8');
      if (wsEnvContent.includes(`PUBLIC_URL="${ngrokUrl}"`)) {
        log(colors.green, '✅ WebSocket Server .env updated successfully');
        
        // Restart WebSocket server to pick up new PUBLIC_URL
        log(colors.yellow, '   Restarting WebSocket Server to load new PUBLIC_URL...');
        try {
          process.kill(wsServer.pid, 'SIGTERM');
        } catch (e) {
          // Process might already be dead
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start new WebSocket server with updated environment
        const newWsServer = await startProcess('npx', ['ts-node', 'src/server.ts'], '../websocket-server', 'WebSocket Server (restarted)');
        processes = processes.filter(pid => pid !== wsServer.pid);
        processes.push(newWsServer.pid);
        
        log(colors.green, '✅ WebSocket Server restarted with updated environment');
      } else {
        log(colors.red, '❌ Failed to update WebSocket Server .env');
        cleanup();
        return;
      }
    }
    
    // Start Web App (ONLY after ngrok is ready and .env is updated)
    log(colors.blue, '🌐 Starting Web App...');
    log(colors.green, '   ✅ Prerequisites ready: WebSocket Server + Ngrok + .env updated');
    const webApp = await startProcess('npm', ['run', 'dev'], '.', 'Web App');
    
    // Display final status
    console.log('');
    log(colors.green, '🎉 All services started successfully!');
    console.log('================================================');
    log(colors.blue, '📊 Service Status:');
    console.log(`  ✅ WebSocket Server: http://localhost:8081 (PID: ${wsServer.pid})`);
    console.log(`  ✅ Web App: http://localhost:3000 (PID: ${webApp.pid})`);
    console.log(`  ✅ Ngrok: ${ngrokUrl} (PID: ${ngrok.pid})`);
    console.log('');
    log(colors.blue, '🌐 Access URLs:');
    console.log('  Web App: http://localhost:3000');
    console.log('  Ngrok Dashboard: http://localhost:4040');
    console.log(`  Public HTTPS: ${ngrokUrl}`);
    console.log(`  Public WebSocket: ${ngrokUrl.replace('https://', 'wss://')}`);
    console.log('');
    log(colors.blue, '📋 For Twilio Configuration:');
    console.log(`  Webhook URL: ${ngrokUrl.replace('https://', 'wss://')}`);
    console.log(`  Status Callback: ${ngrokUrl}/status`);
    console.log('');
    log(colors.yellow, '💡 To stop all services, press Ctrl+C');
    
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    cleanup();
  }
};

// Start the application
main();
