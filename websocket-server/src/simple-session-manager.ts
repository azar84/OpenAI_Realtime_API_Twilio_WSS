import { WebSocket } from 'ws';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { agentTools } from './agent-tools';
import { getActiveAgentConfig } from './db';

// Helper function to build turn detection config from database
function buildTurnDetectionConfig(agentConfig: any) {
  const turnDetectionType = agentConfig?.turn_detection_type || 'server_vad';
  
  if (turnDetectionType === 'semantic_vad') {
    return {
      type: 'semantic_vad' as const,
      eagerness: 'medium' as const,
      createResponse: true,
      interruptResponse: true,
    };
  } else if (turnDetectionType === 'server_vad') {
    return {
      type: 'server_vad' as const,
      threshold: agentConfig?.turn_detection_threshold || 0.5,
      prefixPaddingMs: agentConfig?.turn_detection_prefix_padding_ms || 300,
      silenceDurationMs: agentConfig?.turn_detection_silence_duration_ms || 200,
    };
  } else {
    return { type: 'none' as const };
  }
}


export async function handleVoiceChatConnection(ws: WebSocket, apiKey: string) {
  console.log('Creating Voice Chat connection with Agent SDK (using WebSocket transport like Twilio)...');
  
  try {
    // Get agent configuration from database
    const agentConfig = await getActiveAgentConfig();
    const enabledTools = agentConfig?.enabled_tools || [];
    
    // Filter tools based on enabled tools from database
    const toolsToUse = agentTools.filter(tool => 
      enabledTools.includes(tool.name)
    );
    
    // Create agent with configuration from database
    const voiceChatAgentName = agentConfig?.name || 'Voice Chat Agent';
    const voiceChatInstructions = agentConfig?.instructions || 'You are a helpful assistant.';
    console.log('🤖 Voice Chat Agent Instructions:', voiceChatInstructions);
    const agent = new RealtimeAgent({
      name: voiceChatAgentName,
      instructions: voiceChatInstructions,
      tools: toolsToUse,
    });

    // Create session with simplified config to avoid errors
    const session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
      config: {
        voice: agentConfig?.voice || 'ash',
        inputAudioFormat: 'pcm16',
        outputAudioFormat: 'pcm16',
        modalities: ['text', 'audio'],
        turnDetection: { type: 'server_vad' }, // Start with working config
      },
    });

    // Set up history tracking for frontend
    session.on('history_updated', (history) => {
      console.log('Voice Chat History updated:', history.length, 'items');
      
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
      // Forward audio data to frontend WebSocket
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const audioData = audioEvent.data;
          const base64Audio = Buffer.from(audioData).toString('base64');
          ws.send(base64Audio);
          console.log('✅ Audio data sent to frontend, size:', audioData.byteLength);
        } catch (error) {
          console.error('❌ Error sending audio to frontend:', error);
        }
      }
    });

    // Add error handling before connecting
    session.on('error', (error) => {
      console.error('❌ Session error:', error);
    });

    // Connect to OpenAI with error handling
    try {
      await session.connect({ apiKey });
      console.log('Voice Chat connected with Agent SDK');
      
      // Check if session has send method
      console.log('🔍 Session methods available:', Object.getOwnPropertyNames(session));
      console.log('🔍 Session send method:', typeof (session as any).send);
    } catch (connectionError) {
      console.error('❌ Failed to connect to OpenAI:', connectionError);
      ws.close();
      return;
    }

    let isRecording = false;

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
          } else if (controlMessage.type === 'stop_recording') {
            console.log('Stopping voice chat recording...');
            isRecording = false;
          }
        } else {
          // It's audio data - stream in real-time for interruption
          if (isRecording) {
            console.log('🔍 Received audio data for voice chat, length:', message.length);
            console.log('🔍 Audio data preview:', message.substring(0, 50) + '...');
            
            // Send audio directly to Agent SDK session for real-time processing
            try {
              const audioMessage = {
                type: "input_audio_buffer.append",
                audio: message
              };
              console.log('🔍 Sending audio message:', audioMessage.type);
              
              (session as any).send?.(audioMessage);
              console.log('✅ Real-time audio sent to Agent SDK successfully');
            } catch (error) {
              console.error('❌ Error sending real-time audio to Agent SDK:', error);
            }
          } else {
            console.log('🔍 Skipping audio data - not recording');
          }
        }
      } catch (error) {
        console.error('Error handling voice chat message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Voice Chat connection closed');
    });

    ws.on('error', (error) => {
      console.error('Voice Chat connection error:', error);
    });

    console.log('Voice chat handler ready');

  } catch (error) {
    console.error('Error creating Voice Chat connection:', error);
    ws.close();
  }
}
