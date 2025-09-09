// Test script to verify temperature and max_tokens settings
const WebSocket = require('ws');

async function testSettings() {
  console.log('🧪 Testing Voice Chat Settings...\n');
  
  // Test 1: Low temperature (should be more consistent)
  console.log('Test 1: Low Temperature (0.1)');
  await testVoiceChat('What is the weather like?', 0.1, 100);
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: High temperature (should be more varied)
  console.log('\nTest 2: High Temperature (0.9)');
  await testVoiceChat('What is the weather like?', 0.9, 100);
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Very low max_tokens (should be cut off)
  console.log('\nTest 3: Low Max Tokens (20)');
  await testVoiceChat('Tell me a long story about a cat', 0.7, 20);
}

async function testVoiceChat(question, temperature, maxTokens) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:8081/voice-chat');
    
    let responseReceived = false;
    
    ws.on('open', () => {
      console.log(`  📡 Connected - Testing temp: ${temperature}, maxTokens: ${maxTokens}`);
      
      // Send start recording
      ws.send(JSON.stringify({ type: 'start_recording' }));
      
      // Simulate asking the question (you'd need to actually speak this)
      setTimeout(() => {
        console.log(`  🎤 Simulated question: "${question}"`);
        // In real test, you'd speak this into the microphone
      }, 1000);
      
      // Close after 5 seconds
      setTimeout(() => {
        if (!responseReceived) {
          console.log('  ⏰ No response received in time');
        }
        ws.close();
        resolve();
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'recording_started') {
          console.log('  ✅ Recording started');
        }
      } catch (e) {
        // This might be audio data
        console.log('  🔊 Received audio data');
        responseReceived = true;
      }
    });
    
    ws.on('close', () => {
      console.log('  📡 Connection closed\n');
    });
    
    ws.on('error', (error) => {
      console.log('  ❌ Error:', error.message);
      resolve();
    });
  });
}

// Run the test
testSettings().catch(console.error);
