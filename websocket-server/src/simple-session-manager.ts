import { WebSocket } from 'ws';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { agentTools } from './agent-tools';
import { getActiveAgentConfig } from './db';

export async function handleCallConnection(ws: WebSocket, apiKey: string) {
  console.log('Creating Twilio call connection with Agent SDK...');
  
  try {
    // Get agent configuration from database
    const agentConfig = await getActiveAgentConfig();
    const enabledTools = agentConfig?.enabled_tools || [];
    
    // Filter tools based on enabled tools from database
    const toolsToUse = agentTools.filter(tool => 
      enabledTools.includes(tool.name)
    );
    
    // Create agent with configuration from database
    const twilioAgentName = agentConfig?.name || 'Twilio Agent';
    const twilioBaseInstructions = agentConfig?.instructions || 'You are a helpful assistant.';
    const twilioInstructions = `Your name is ${twilioAgentName}. ${twilioBaseInstructions}`;
    const agent = new RealtimeAgent({
      name: twilioAgentName,
      instructions: twilioInstructions,
      tools: toolsToUse,
    });

    // Create Twilio transport layer
    const twilioTransport = new TwilioRealtimeTransportLayer({
      twilioWebSocket: ws,
    });

    // Create session with Twilio transport
    const session = new RealtimeSession(agent, {
      transport: twilioTransport,
      model: 'gpt-realtime',
      config: {
        audio: {
          output: {
            voice: agentConfig?.voice || 'verse',
          },
        },
      },
    });

    // Set up history tracking for frontend
    session.on('history_updated', (history) => {
      console.log('Twilio History updated:', history.length, 'items');
      
      // Send history updates to frontend via logs WebSocket
      const broadcastToLogs = (global as any).broadcastToLogs;
      if (broadcastToLogs) {
        broadcastToLogs({
          type: 'history_updated',
          history: history
        });
      }
    });

    // Connect to OpenAI
    await session.connect({ apiKey });
    console.log('Twilio call connected with Agent SDK');

    // Set up WebSocket event forwarding for logs
    ws.on('close', () => {
      console.log('Twilio call connection closed');
    });

    ws.on('error', (error) => {
      console.error('Twilio call connection error:', error);
    });

  } catch (error) {
    console.error('Error creating Twilio call connection:', error);
    ws.close();
  }
}

export function handleFrontendConnection(ws: WebSocket) {
  console.log('Frontend connection established (logs)');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Frontend message:', message);
    } catch (error) {
      console.error('Error parsing frontend message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Frontend connection closed');
  });

  ws.on('error', (error) => {
    console.error('Frontend connection error:', error);
  });
}

export async function handleVoiceChatConnection(ws: WebSocket, apiKey: string) {
  console.log('Handling voice chat connection...');
  
  try {
    // Get agent configuration from database
    const agentConfig = await getActiveAgentConfig();
    const enabledTools = agentConfig?.enabled_tools || [];
    
    // Filter tools based on enabled tools from database
    const toolsToUse = agentTools.filter(tool => 
      enabledTools.includes(tool.name)
    );
    
    // Create agent with configuration from database
    const voiceAgentName = agentConfig?.name || 'Voice Chat Agent';
    const voiceBaseInstructions = agentConfig?.instructions || 'You are a helpful assistant.';
    const voiceInstructions = `Your name is ${voiceAgentName}. ${voiceBaseInstructions}`;
    const agent = new RealtimeAgent({
      name: voiceAgentName,
      instructions: voiceInstructions,
      tools: toolsToUse,
    });

    // Create session for tool calling
    const session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
      config: {
        audio: {
          input: {
            format: 'pcm16',
          },
          output: {
            voice: agentConfig?.voice || 'verse',
          },
        },
      },
    });

    // Set up history tracking for frontend
    session.on('history_updated', (history) => {
      console.log('Voice chat history updated:', history);
      
      // Send history updates to frontend via logs WebSocket
      const broadcastToLogs = (global as any).broadcastToLogs;
      if (broadcastToLogs) {
        broadcastToLogs({
          type: 'history_updated',
          history: history
        });
      }
    });

    // Set up audio event handling for frontend playback
    session.on('audio', (audioEvent) => {
      console.log('🎵 Voice chat audio event received:', audioEvent);
      console.log('🎵 Audio event type:', typeof audioEvent);
      console.log('🎵 Audio event keys:', Object.keys(audioEvent));
      
      // Forward audio data to frontend WebSocket
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // The audioEvent should be a TransportLayerAudio with data property
          const audioData = audioEvent.data;
          console.log('🎵 Audio data type:', typeof audioData);
          console.log('🎵 Audio data constructor:', audioData.constructor.name);
          console.log('🎵 Audio data byteLength:', audioData.byteLength);
          
          // Convert ArrayBuffer to base64 and send to frontend
          const base64Audio = Buffer.from(audioData).toString('base64');
          ws.send(base64Audio);
          console.log('✅ Audio data sent to frontend, size:', audioData.byteLength, 'base64 length:', base64Audio.length);
        } catch (error) {
          console.error('❌ Error sending audio to frontend:', error);
        }
      } else {
        console.log('⚠️ WebSocket not ready, cannot send audio');
      }
    });

    // Connect to OpenAI
    await session.connect({ apiKey });
    
    // Add debugging for all session events
    console.log('Setting up session event listeners...');
    session.on('audio_start', () => console.log('🎵 Audio started'));
    session.on('audio_stopped', () => console.log('🎵 Audio stopped'));
    session.on('audio_interrupted', () => console.log('🎵 Audio interrupted'));
    session.on('error', (error) => console.error('❌ Session error:', error));

    let isRecording = false;
    let audioChunks: ArrayBuffer[] = [];
    let lastProcessTime = 0;

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
            lastProcessTime = Date.now();
          } else if (controlMessage.type === 'stop_recording') {
            console.log('Stopping voice chat recording...');
            isRecording = false;
            
            // Process accumulated audio buffer
            if (audioChunks.length > 0) {
              console.log('Processing accumulated audio buffer...');
              
              // Combine audio chunks
              const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
              const combinedBuffer = new ArrayBuffer(totalLength);
              const combinedView = new Uint8Array(combinedBuffer);
              let offset = 0;
              
              for (const chunk of audioChunks) {
                combinedView.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
              }
              
              // Send audio to Agent SDK for processing
              try {
                console.log('Sending final audio to Agent SDK...');
                (session as any).sendAudio?.(combinedBuffer);
                console.log('Final audio sent to Agent SDK successfully');
              } catch (error) {
                console.error('Error sending final audio to Agent SDK:', error);
              }
              
              // Clear the audio chunks
              audioChunks = [];
            }
          }
        } else {
          // It's audio data (base64 encoded PCM16) - process continuously
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
          
          // Process audio every 2 seconds or when we have enough data
          const now = Date.now();
          if (now - lastProcessTime > 2000 || audioChunks.length > 10) {
            console.log('Processing audio chunks...');
            
            // Combine audio chunks
            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            const combinedBuffer = new ArrayBuffer(totalLength);
            const combinedView = new Uint8Array(combinedBuffer);
            let offset = 0;
            
            for (const chunk of audioChunks) {
              combinedView.set(new Uint8Array(chunk), offset);
              offset += chunk.byteLength;
            }
            
            // Send audio to Agent SDK for processing
            try {
              console.log('Sending audio to Agent SDK...');
              (session as any).sendAudio?.(combinedBuffer);
              console.log('Audio sent to Agent SDK successfully');
            } catch (error) {
              console.error('Error sending audio to Agent SDK:', error);
            }
            
            // Clear the audio chunks
            audioChunks = [];
            lastProcessTime = now;
          }
        }
      } catch (error) {
        console.error('Error handling voice chat message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Voice chat connection closed');
    });

    ws.on('error', (error) => {
      console.error('Voice chat connection error:', error);
    });

    console.log('Voice chat handler ready');
  } catch (error) {
    console.error('Error creating voice chat connection:', error);
    ws.close();
  }
}
