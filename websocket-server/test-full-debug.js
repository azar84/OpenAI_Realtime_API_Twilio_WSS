const WebSocket = require('ws');

console.log('🧪 Testing FULL call flow with debug messages...\n');

// Test connecting as a call (what Twilio would do)
const ws = new WebSocket('ws://localhost:8081/call');

let step = 0;

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server as /call');
  console.log('⏰ Waiting 2 seconds before sending START event...\n');
  
  setTimeout(() => {
    step++;
    console.log(`STEP ${step}: Sending Twilio START event`);
    
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
    
    ws.send(JSON.stringify(startEvent));
    console.log('📞 START event sent!\n');
  }, 2000);
  
  // Send media event after START
  setTimeout(() => {
    step++;
    console.log(`STEP ${step}: Sending MEDIA event`);
    
    const mediaEvent = {
      event: "media",
      sequenceNumber: "2",
      media: {
        track: "inbound",
        chunk: "1", 
        timestamp: "1234567890",
        payload: "dGVzdC1hdWRpby1wYXlsb2FkLWJhc2U2NA==" // base64 test payload
      },
      streamSid: "test-stream-sid-12345"
    };
    
    ws.send(JSON.stringify(mediaEvent));
    console.log('🎵 MEDIA event sent!\n');
  }, 5000);
  
  // Send close event
  setTimeout(() => {
    step++;
    console.log(`STEP ${step}: Sending CLOSE event`);
    
    const closeEvent = {
      event: "close",
      sequenceNumber: "3",
      streamSid: "test-stream-sid-12345"
    };
    
    ws.send(JSON.stringify(closeEvent));
    console.log('🔚 CLOSE event sent!');
    
    setTimeout(() => {
      ws.close();
    }, 1000);
  }, 8000);
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 RESPONSE from server:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('📥 RAW RESPONSE from server:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('\n🔚 Test completed - WebSocket connection closed');
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Terminating test...');
  ws.close();
  process.exit(0);
});

console.log('🔄 Test will run for ~10 seconds...');
console.log('📊 Watch the server logs in the other terminal!\n');
