const WebSocket = require('ws');

console.log('🧪 Testing WebSocket connection to simulate Twilio call...');

// Test connecting as a call (what Twilio would do)
const ws = new WebSocket('ws://localhost:8081/call');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server as /call');
  
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
  ws.send(JSON.stringify(startEvent));
  
  // Simulate some media packets after a short delay
  setTimeout(() => {
    const mediaEvent = {
      event: "media",
      sequenceNumber: "2",
      media: {
        track: "inbound",
        chunk: "1",
        timestamp: "1234567890",
        payload: "test-audio-payload-base64"
      },
      streamSid: "test-stream-sid-12345"
    };
    
    console.log('🎵 Sending MEDIA event...');
    ws.send(JSON.stringify(mediaEvent));
  }, 2000);
  
  // Close after 5 seconds
  setTimeout(() => {
    console.log('🔚 Sending CLOSE event...');
    const closeEvent = {
      event: "close",
      sequenceNumber: "3",
      streamSid: "test-stream-sid-12345"
    };
    ws.send(JSON.stringify(closeEvent));
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  console.log('📥 Received from server:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
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
