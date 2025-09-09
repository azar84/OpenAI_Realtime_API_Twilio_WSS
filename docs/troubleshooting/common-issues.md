# Common Issues & Solutions

This document covers the most frequently encountered issues and their solutions.

## 🚨 Critical Issues

### 1. WebSocket Server Won't Start

**Symptoms:**
- Server fails to start with error messages
- Port 8081 is already in use
- Database connection errors

**Solutions:**

**Port Already in Use:**
```bash
# Kill processes on port 8081
lsof -ti:8081 | xargs kill -9

# Or use the cleanup script
cd webapp
./stop-all.sh
```

**Database Connection Failed:**
```bash
# Check if PostgreSQL is running
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Verify database exists
psql -U postgres -c "\l" | grep openai_realtime_db

# Create database if missing
createdb openai_realtime_db
psql openai_realtime_db < database/schema.sql
```

**Missing Environment Variables:**
```bash
# Check .env file exists
ls -la websocket-server/.env

# Verify required variables
cat websocket-server/.env | grep OPENAI_API_KEY
```

### 2. OpenAI API Errors

**Symptoms:**
- "Invalid API key" errors
- "Rate limit exceeded" messages
- No AI responses

**Solutions:**

**Invalid API Key:**
```bash
# Verify API key format
echo $OPENAI_API_KEY | grep "sk-proj-"

# Check key in .env file
grep OPENAI_API_KEY websocket-server/.env
```

**Rate Limit Exceeded:**
- Wait for rate limit to reset
- Check your OpenAI usage limits
- Consider upgrading your OpenAI plan

**No AI Responses:**
```bash
# Check server logs for errors
cd websocket-server
npm run dev

# Verify WebSocket connection to OpenAI
# Look for "OpenAI WebSocket connection opened!" in logs
```

### 3. Twilio Connection Issues

**Symptoms:**
- Phone calls don't connect
- "Webhook URL not accessible" errors
- No audio in phone calls

**Solutions:**

**Webhook URL Not Accessible:**
```bash
# Check ngrok is running
curl http://localhost:4040/api/tunnels

# Verify WebSocket server is accessible
curl http://localhost:8081/tools
```

**TwiML Generation Issues:**
```bash
# Check PUBLIC_URL is set correctly
grep PUBLIC_URL websocket-server/.env

# Restart WebSocket server after updating PUBLIC_URL
cd websocket-server
npm run dev
```

**No Audio in Calls:**
- Verify Twilio phone number has voice capabilities
- Check webhook URL is set to WSS (not HTTPS)
- Ensure ngrok tunnel is active

## 🔧 Configuration Issues

### 4. Environment Variables Not Loading

**Symptoms:**
- Configuration changes don't take effect
- Default values being used
- Database connection fails

**Solutions:**

**Check .env File Location:**
```bash
# WebSocket server .env
ls -la websocket-server/.env

# Web app .env
ls -la webapp/.env
```

**Verify Environment Variables:**
```bash
# Check all required variables
cd websocket-server
cat .env | grep -E "(OPENAI_API_KEY|DB_|PORT)"

cd ../webapp
cat .env | grep -E "(TWILIO_|DB_)"
```

**Restart Services:**
```bash
# Restart WebSocket server
cd websocket-server
npm run dev

# Restart web app
cd ../webapp
npm run dev
```

### 5. Database Connection Problems

**Symptoms:**
- "Database connection failed" errors
- Configuration not saving
- Session data not persisting

**Solutions:**

**Check PostgreSQL Status:**
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

**Verify Database Credentials:**
```bash
# Test connection
psql -h localhost -U your_username -d openai_realtime_db -c "SELECT 1;"
```

**Check Database Exists:**
```bash
# List databases
psql -U postgres -c "\l"

# Create if missing
createdb openai_realtime_db
```

## 🎵 Audio Issues

### 6. Voice Chat Not Working

**Symptoms:**
- No audio input/output
- Microphone permission denied
- Audio quality issues

**Solutions:**

**Microphone Permission:**
- Check browser permissions
- Allow microphone access when prompted
- Try refreshing the page

**Audio Context Issues:**
```javascript
// Check audio context state
console.log(audioContext.state);

// Resume if suspended
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}
```

**Audio Format Problems:**
- Ensure browser supports Web Audio API
- Check for audio codec support
- Try different browsers

### 7. Phone Call Audio Issues

**Symptoms:**
- No audio in phone calls
- Distorted audio
- One-way audio

**Solutions:**

**Check Twilio Configuration:**
- Verify phone number has voice capabilities
- Check webhook URL format (WSS not HTTPS)
- Ensure ngrok tunnel is active

**Audio Format Issues:**
- Verify G.711 μ-law format is being used
- Check sample rate (8kHz for Twilio)
- Monitor server logs for audio processing errors

## 🌐 Network Issues

### 8. Ngrok Problems

**Symptoms:**
- Ngrok tunnel not starting
- URL not accessible
- Tunnel disconnects frequently

**Solutions:**

**Ngrok Authentication:**
```bash
# Check if authenticated
ngrok config check

# Add authtoken if missing
ngrok config add-authtoken YOUR_AUTHTOKEN
```

**Port Conflicts:**
```bash
# Check if port 4040 is in use
lsof -ti:4040

# Kill conflicting processes
lsof -ti:4040 | xargs kill -9
```

**Tunnel Stability:**
- Use paid ngrok plan for better stability
- Check internet connection
- Try restarting ngrok

### 9. CORS Issues

**Symptoms:**
- "CORS error" in browser console
- API requests blocked
- WebSocket connections fail

**Solutions:**

**Check CORS Configuration:**
```javascript
// Verify CORS is enabled in server
app.use(cors());
```

**Browser Security:**
- Try different browsers
- Disable browser security features for testing
- Use HTTPS in production

## 🔍 Debugging Tools

### 10. Logging and Monitoring

**Enable Debug Logging:**
```bash
# Set debug environment variable
export DEBUG=true

# Or add to .env file
echo "DEBUG=true" >> websocket-server/.env
```

**Check Service Health:**
```bash
# WebSocket server
curl http://localhost:8081/tools

# Web app
curl http://localhost:3000/api/twilio

# Ngrok
curl http://localhost:4040/api/tunnels
```

**Monitor Logs:**
```bash
# WebSocket server logs
cd websocket-server
npm run dev

# Web app logs
cd webapp
npm run dev
```

## 🚀 Performance Issues

### 11. High Latency

**Symptoms:**
- Slow audio responses
- Delayed AI replies
- Poor user experience

**Solutions:**

**Audio Buffer Optimization:**
- Reduce audio buffer sizes
- Use server-side VAD
- Optimize audio format conversion

**Network Optimization:**
- Check internet connection speed
- Use closer OpenAI regions
- Optimize ngrok configuration

**Resource Monitoring:**
```bash
# Check CPU usage
top -p $(pgrep -f "ts-node.*server.ts")

# Check memory usage
ps aux | grep "ts-node.*server.ts"
```

### 12. Memory Issues

**Symptoms:**
- High memory usage
- Server crashes
- Slow performance

**Solutions:**

**Audio Buffer Management:**
- Clear audio buffers regularly
- Limit concurrent sessions
- Monitor memory usage

**Database Connection Pool:**
```javascript
// Check connection pool settings
const pool = new Pool({
  max: 10, // Reduce if needed
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## 🛠️ Development Issues

### 13. TypeScript Compilation Errors

**Symptoms:**
- TypeScript compilation fails
- Type errors in code
- Build process fails

**Solutions:**

**Check TypeScript Configuration:**
```bash
# Verify tsconfig.json
cat websocket-server/tsconfig.json
cat webapp/tsconfig.json
```

**Install Dependencies:**
```bash
# Reinstall dependencies
cd websocket-server
rm -rf node_modules package-lock.json
npm install

cd ../webapp
rm -rf node_modules package-lock.json
npm install
```

**Type Checking:**
```bash
# Check types
cd websocket-server
npx tsc --noEmit

cd ../webapp
npx tsc --noEmit
```

### 14. Package Version Conflicts

**Symptoms:**
- Dependency conflicts
- Version mismatch errors
- Build failures

**Solutions:**

**Check Package Versions:**
```bash
# Check for outdated packages
npm outdated

# Update packages
npm update
```

**Clean Install:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Getting Help

### When to Seek Help

- Issues persist after trying solutions
- Error messages are unclear
- System behavior is unexpected
- Performance is severely degraded

### Information to Provide

When seeking help, include:

1. **Error messages** (full text)
2. **System information** (OS, Node.js version)
3. **Steps to reproduce** the issue
4. **Logs** from relevant services
5. **Configuration** (sanitized .env files)

### Support Channels

- **GitHub Issues:** For bug reports and feature requests
- **Documentation:** Check other troubleshooting guides
- **Community:** For general questions and discussions

## 🔄 Prevention

### Best Practices

1. **Regular Updates:** Keep dependencies updated
2. **Monitoring:** Monitor system health regularly
3. **Backups:** Backup configuration and data
4. **Testing:** Test changes in development first
5. **Documentation:** Keep configuration documented

### Maintenance

1. **Log Rotation:** Implement log rotation
2. **Resource Monitoring:** Monitor CPU, memory, disk
3. **Security Updates:** Keep system updated
4. **Performance Tuning:** Optimize based on usage
5. **Backup Strategy:** Regular backups of important data
