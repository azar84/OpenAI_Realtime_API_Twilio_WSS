import { WebSocket } from 'ws';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { agentTools } from './agent-tools';
import { getActiveAgentConfig } from './db';

export async function handleVoiceChatConnection(ws: WebSocket, apiKey: string) {
  console.log('Handling voice chat connection...');
  
  // Get agent configuration from database
  const agentConfig = await getActiveAgentConfig();
  const enabledTools = agentConfig?.enabled_tools || [];
  
  // Filter tools based on enabled tools from database
  const toolsToUse = agentTools.filter(tool => 
    enabledTools.includes(tool.name)
  );
  
  // Create agent with configuration from database
  const agent = new RealtimeAgent({
    name: agentConfig?.name || 'Voice Chat Agent',
    instructions: agentConfig?.instructions || 'You are a helpful assistant.',
    tools: toolsToUse,
  });

  // Create session for tool calling (but not for audio)
  const session = new RealtimeSession(agent, {
    model: 'gpt-realtime',
    config: {
      audio: {
        output: {
          voice: agentConfig?.voice || 'verse',
        },
      },
    },
  });

  // Connect to OpenAI for tool calling
  await session.connect({ apiKey });

  let isRecording = false;
  let audioChunks: ArrayBuffer[] = [];

  ws.on('message', async (data) => {
    try {
      const message = data.toString();
      
      // Check if it's a JSON message (control message)
      if (message.startsWith('{')) {
        const controlMessage = JSON.parse(message);
        console.log('Voice chat control message:', controlMessage);
        
        if (controlMessage.type === 'start_recording') {
          console.log('Starting voice chat recording...');
          isRecording = true;
          audioChunks = [];
        } else if (controlMessage.type === 'stop_recording') {
          console.log('Stopping voice chat recording...');
          isRecording = false;
          
          // Process accumulated audio buffer
          if (audioChunks.length > 0) {
            console.log('Processing accumulated audio buffer...');
            
            // Combine all audio chunks
            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            const combinedBuffer = new ArrayBuffer(totalLength);
            const combinedView = new Uint8Array(combinedBuffer);
            let offset = 0;
            
            for (const chunk of audioChunks) {
              combinedView.set(new Uint8Array(chunk), offset);
              offset += chunk.byteLength;
            }
            
            // For now, send a simple response
            // In a real implementation, you would process the audio with the Agent SDK
            const response = "I received your voice message. How can I help you?";
            
            // Send text response back
            ws.send(JSON.stringify({
              type: "transcript",
              text: response,
              isUser: false
            }));
            
            // Clear the audio chunks
            audioChunks = [];
          }
        }
      } else {
        // It's audio data (base64 encoded PCM16)
        if (isRecording) {
          console.log('Received audio data for voice chat, length:', message.length);
          
          // Convert base64 to ArrayBuffer
          const binaryString = atob(message);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBuffer = bytes.buffer;
          
          // Store audio data for processing
          audioChunks.push(audioBuffer);
        }
      }
    } catch (error) {
      console.error('Error handling voice chat message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Voice chat connection closed');
    // The Agent SDK doesn't have a disconnect method, just close the WebSocket
  });

  ws.on('error', (error) => {
    console.error('Voice chat connection error:', error);
  });

  console.log('Voice chat handler ready');
}
