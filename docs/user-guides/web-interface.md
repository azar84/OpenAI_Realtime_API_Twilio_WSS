# Web Interface Guide

This guide explains how to use the web interface for the OpenAI Realtime + Twilio Demo system.

## 🌐 Accessing the Web Interface

### Local Development
- **URL:** http://localhost:3000
- **Requirements:** WebSocket server and web app running

### Production
- **URL:** Your deployed domain
- **Requirements:** All services properly configured

## 🏠 Main Dashboard

The web interface is organized into three main columns:

### Left Column: Configuration & Voice Chat
- **Session Configuration Panel** - Agent settings and tools
- **Voice Chat Panel** - Browser-based voice interaction

### Middle Column: Phone Setup & Transcript
- **Phone Number Checklist** - Twilio phone number configuration
- **Transcript Panel** - Real-time conversation display

### Right Column: Function Calls
- **Function Calls Panel** - Tool execution monitoring

## ⚙️ Session Configuration Panel

### Agent Instructions

**Purpose:** Define how the AI agent behaves and responds

**How to Use:**
1. Click in the "Instructions" text area
2. Enter detailed instructions for the agent
3. Be specific about the agent's role and behavior
4. Click "Save Configuration" to apply changes

**Example Instructions:**
```
You are a helpful customer service representative for TechCorp. 
You should:
- Be friendly and professional
- Help customers with their questions
- Use the available tools to look up information
- Escalate complex issues to human agents when needed
- Keep responses concise and helpful
```

### Voice Selection

**Purpose:** Choose the AI agent's voice

**Available Voices:**
- **ash** - Clear, professional (default)
- **ballad** - Warm, conversational
- **coral** - Energetic, upbeat
- **sage** - Calm, authoritative
- **verse** - Expressive, dynamic

**How to Use:**
1. Click the voice dropdown
2. Select your preferred voice
3. Changes take effect immediately

### Tools Management

**Purpose:** Configure which tools the agent can use

**Available Tools:**
- **Weather Tool** - Get current weather information
- **Customer Lookup** - Find customer data by phone number
- **Knowledge Base** - Answer company-related questions

**Adding Tools:**
1. Click "Add Tool" button
2. Select from available templates or create custom
3. Configure tool parameters
4. Save the configuration

**Tool Status Indicators:**
- **Backend Tag** - Tool is implemented in the server
- **No Tag** - Tool is custom/experimental

## 🎙️ Voice Chat Panel

### Connecting to Agent

**Purpose:** Start a voice conversation with the AI agent

**How to Use:**
1. Click "Connect to Agent" button
2. Allow microphone access when prompted
3. Wait for "Connected" status
4. Start speaking naturally

**Connection States:**
- **Disconnected** - Not connected to agent
- **Connecting...** - Establishing connection
- **Connected** - Ready for voice chat
- **Error** - Connection failed

### Audio Controls

**Start/Stop Streaming:**
- **Start Streaming** - Begin continuous audio capture
- **Stop Streaming** - Pause audio capture
- **Mute/Unmute** - Toggle audio output

**Audio Visualization:**
- Real-time voice level indicator
- Shows when you're speaking
- Helps with microphone positioning

### Voice Chat Features

**Continuous Streaming:**
- Audio is captured continuously
- No need to press and hold
- Natural conversation flow

**Real-time Responses:**
- AI responds as you speak
- Low latency audio processing
- High-quality audio output

## 📞 Phone Number Checklist

### Twilio Configuration

**Purpose:** Set up phone number for incoming calls

**Required Steps:**
1. **Get Twilio Credentials** - Account SID and Auth Token
2. **Purchase Phone Number** - Buy a Twilio phone number
3. **Configure Webhook** - Set webhook URL in Twilio console
4. **Test Connection** - Make a test call

**Webhook URL Format:**
```
wss://your-ngrok-url.ngrok-free.app
```

**Status Indicators:**
- ✅ **Green Checkmark** - Step completed
- ⚠️ **Yellow Warning** - Step needs attention
- ❌ **Red X** - Step failed or missing

### Testing Phone Calls

**How to Test:**
1. Ensure all checklist items are green
2. Call your Twilio phone number
3. You should hear "Connected"
4. Speak to the AI agent
5. Verify responses are working

## 💬 Transcript Panel

### Real-time Conversation Display

**Purpose:** Show live conversation between user and AI

**Message Types:**
- **User Messages** - What you said (transcribed)
- **Assistant Messages** - AI responses
- **Tool Messages** - Function call results

**Message Status:**
- **Running** - Message being processed
- **Completed** - Message fully processed
- **Error** - Processing failed

### Transcript Features

**Auto-scroll:** Automatically scrolls to show latest messages
**Message Timestamps:** Shows when each message was sent
**Tool Call Display:** Shows when tools are being used

## 🔧 Function Calls Panel

### Tool Execution Monitoring

**Purpose:** Monitor and manage tool executions

**Tool Call States:**
- **Running** - Tool is being executed
- **Completed** - Tool finished successfully
- **Error** - Tool execution failed

**Tool Information:**
- **Tool Name** - Which tool was called
- **Parameters** - Input parameters used
- **Result** - Tool execution result
- **Timestamp** - When tool was called

### Manual Tool Testing

**Purpose:** Test tools independently

**How to Use:**
1. Select a tool from the list
2. Enter required parameters
3. Click "Test Tool" button
4. View results in the panel

## 🎛️ Advanced Configuration

### Audio Settings

**Voice Chat Audio:**
- **Sample Rate:** 24kHz (optimized for voice)
- **Format:** PCM16 (high quality)
- **Channels:** Mono (single channel)

**Phone Call Audio:**
- **Sample Rate:** 8kHz (Twilio standard)
- **Format:** G.711 μ-law (telephony standard)
- **Channels:** Mono (single channel)

### Turn Detection

**Purpose:** Control when the AI responds

**Settings:**
- **Type:** Server-side VAD (Voice Activity Detection)
- **Threshold:** 0.5 (sensitivity level)
- **Prefix Padding:** 300ms (before speech)
- **Silence Duration:** 500ms (after speech)

### Temperature Control

**Purpose:** Control AI response creativity

**Settings:**
- **0.0** - Very focused, deterministic
- **0.5** - Balanced creativity
- **0.8** - More creative (default)
- **1.0** - Very creative, varied

## 🔍 Troubleshooting Interface Issues

### Common Problems

**Voice Chat Not Working:**
- Check microphone permissions
- Verify browser supports Web Audio API
- Try refreshing the page

**Configuration Not Saving:**
- Check database connection
- Verify all required fields are filled
- Look for error messages

**Phone Calls Not Connecting:**
- Verify Twilio webhook URL
- Check ngrok tunnel is active
- Ensure phone number is configured

### Debug Information

**Connection Status:**
- Shows current connection state
- Displays error messages
- Indicates service health

**Log Messages:**
- Real-time system logs
- Error details and warnings
- Performance information

## 🚀 Best Practices

### Configuration

1. **Clear Instructions:** Write specific, detailed instructions
2. **Appropriate Voice:** Choose voice that matches your use case
3. **Relevant Tools:** Only enable tools you actually need
4. **Test Changes:** Always test configuration changes

### Voice Chat

1. **Good Microphone:** Use a quality microphone
2. **Quiet Environment:** Minimize background noise
3. **Clear Speech:** Speak clearly and at normal pace
4. **Natural Flow:** Allow natural conversation pauses

### Phone Calls

1. **Test Regularly:** Test phone calls frequently
2. **Monitor Quality:** Check audio quality
3. **Update Webhooks:** Keep webhook URLs current
4. **Backup Numbers:** Have backup phone numbers

## 📱 Mobile Compatibility

### Supported Browsers

**iOS Safari:**
- Full voice chat support
- Web Audio API compatible
- Microphone access required

**Android Chrome:**
- Full voice chat support
- Web Audio API compatible
- Microphone access required

### Mobile Considerations

**Audio Quality:**
- Use device microphone
- Minimize background noise
- Consider using headphones

**Interface:**
- Responsive design
- Touch-friendly controls
- Optimized for mobile screens

## 🔒 Security Considerations

### Data Privacy

**Audio Data:**
- Not stored permanently
- Processed in real-time
- Transmitted securely

**Configuration Data:**
- Stored in database
- Access controlled
- Regular backups

### Access Control

**Local Development:**
- No authentication required
- Local network access only

**Production:**
- Implement authentication
- Use HTTPS/WSS
- Monitor access logs
