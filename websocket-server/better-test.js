const WebSocket = require('ws');

console.log('🧪 Testing complete call flow...');

// Test connecting as a call (what Twilio would do)
const ws = new WebSocket('ws://localhost:8081/call');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server as /call');
  
  // Wait a bit for server to set up handlers
  setTimeout(() => {
    // Simulate Twilio's "start" event
    const startEvent = {
      event: "start",
      sequenceNumber: "1",
      start: {
        streamSid: "test-stream-sid-12345",
        accountSid: "test-account-sid",
        callSid: "test-call-sid",
        tracks: ["inbound"],
        customParameters: {},
        mediaFormat: {
          encoding: "audio/x-mulaw",
          sampleRate: 8000,
          channels: 1
        }
      },
      streamSid: "test-stream-sid-12345"
    };
    
    console.log('📞 Sending START event...');
    console.log('📄 Event data:', JSON.stringify(startEvent, null, 2));
    ws.send(JSON.stringify(startEvent));
  }, 1000);
  
  // Don't close - wait for user input
  console.log('\n🎯 Test running... Press Ctrl+C to exit\n');
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Received from server (parsed):', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('📥 Received from server (raw):', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔚 WebSocket connection closed');
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Terminating test...');
  ws.close();
  process.exit(0);
});
