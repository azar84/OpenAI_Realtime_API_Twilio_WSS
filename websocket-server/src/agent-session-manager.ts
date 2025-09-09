import { WebSocket } from 'ws';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { agentTools } from './agent-tools';
import { getActiveAgentConfig, getEnabledToolDefinitions } from './db';

export interface AgentSession {
  session: RealtimeSession;
  agent: RealtimeAgent;
  type: 'twilio' | 'voice-chat' | 'frontend';
  ws: WebSocket;
}

const activeSessions = new Map<string, AgentSession>();

export async function createTwilioSession(ws: WebSocket, apiKey: string): Promise<AgentSession> {
  console.log('Creating Twilio session with Agent SDK...');
  
  // Get agent configuration from database
  const agentConfig = await getActiveAgentConfig();
  const enabledTools = agentConfig?.enabled_tools || [];
  
  // Filter tools based on enabled tools from database
  const toolsToUse = agentTools.filter(tool => 
    enabledTools.includes(tool.name)
  );
  
  // Create agent with configuration from database
  const agent = new RealtimeAgent({
    name: agentConfig?.name || 'Twilio Agent',
    instructions: agentConfig?.instructions || 'You are a helpful assistant.',
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

  // Set up event listeners
  setupSessionEventListeners(session, 'twilio', ws);

  // Connect to OpenAI
  await session.connect({ apiKey });

  const agentSession: AgentSession = {
    session,
    agent,
    type: 'twilio',
    ws,
  };

  const sessionId = `twilio-${Date.now()}`;
  activeSessions.set(sessionId, agentSession);

  console.log('Twilio session created and connected');
  return agentSession;
}


function setupSessionEventListeners(session: RealtimeSession, type: string, ws?: WebSocket) {
  // Tool call events - using any type for now as the Agent SDK types may not be fully exposed
  (session as any).on('tool_call_started', (toolCall: any) => {
    console.log(`[${type}] Tool call started:`, toolCall?.name);
    
    // Send to frontend for transcript display
    if (ws && type === 'twilio') {
      ws.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call",
          id: toolCall?.id || `call_${Date.now()}`,
          call_id: toolCall?.id || `call_${Date.now()}`,
          name: toolCall?.name,
          arguments: JSON.stringify(toolCall?.parameters || {}),
          status: "running"
        }
      }));
    }
  });

  (session as any).on('tool_call_completed', (toolCall: any) => {
    console.log(`[${type}] Tool call completed:`, toolCall?.name);
    
    // Send completion to frontend
    if (ws && type === 'twilio') {
      ws.send(JSON.stringify({
        type: "conversation.item.update",
        item: {
          type: "function_call",
          id: toolCall?.id || `call_${Date.now()}`,
          call_id: toolCall?.id || `call_${Date.now()}`,
          name: toolCall?.name,
          status: "completed"
        }
      }));
    }
  });

  (session as any).on('tool_call_failed', (toolCall: any, error: any) => {
    console.error(`[${type}] Tool call failed:`, toolCall?.name, error);
    
    // Send failure to frontend
    if (ws && type === 'twilio') {
      ws.send(JSON.stringify({
        type: "conversation.item.update",
        item: {
          type: "function_call",
          id: toolCall?.id || `call_${Date.now()}`,
          call_id: toolCall?.id || `call_${Date.now()}`,
          name: toolCall?.name,
          status: "failed"
        }
      }));
    }
  });

  // Session events
  (session as any).on('session_updated', (sessionData: any) => {
    console.log(`[${type}] Session updated:`, sessionData?.id);
  });

  (session as any).on('session_ended', (sessionData: any) => {
    console.log(`[${type}] Session ended:`, sessionData?.id);
  });

  // Error handling
  (session as any).on('error', (error: any) => {
    console.error(`[${type}] Session error:`, error);
  });

  // For Twilio sessions, listen to raw Twilio events
  if (type === 'twilio') {
    (session as any).on('transport_event', (event: any) => {
      if (event?.type === 'twilio_message') {
        console.log(`[${type}] Twilio event:`, event?.message);
      }
    });
  }

  // Listen for transcript events and forward to frontend
  (session as any).on('response.audio_transcript.delta', (event: any) => {
    console.log(`[${type}] Transcript delta:`, event);
    if (ws && type === 'twilio') {
      ws.send(JSON.stringify({
        type: "response.audio_transcript.delta",
        item_id: event?.item_id || `item_${Date.now()}`,
        delta: event?.delta || '',
        output_index: event?.output_index || 0
      }));
    }
  });

  (session as any).on('response.audio_transcript.done', (event: any) => {
    console.log(`[${type}] Transcript done:`, event);
    if (ws && type === 'twilio') {
      ws.send(JSON.stringify({
        type: "response.audio_transcript.done",
        item_id: event?.item_id || `item_${Date.now()}`,
        transcript: event?.transcript || ''
      }));
    }
  });

  (session as any).on('response.output_item.done', (event: any) => {
    console.log(`[${type}] Output item done:`, event);
    if (ws && type === 'twilio' && event?.item?.type === 'function_call') {
      ws.send(JSON.stringify({
        type: "response.output_item.done",
        item: event.item
      }));
    }
  });
}

export function getActiveSession(type: 'twilio' | 'voice-chat' | 'frontend'): AgentSession | undefined {
  return Array.from(activeSessions.values()).find(session => session.type === type);
}

export function closeSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    // Close the WebSocket connection instead of calling disconnect
    session.ws.close();
    activeSessions.delete(sessionId);
    console.log(`Session ${sessionId} closed`);
  }
}

export function closeAllSessions(): void {
  for (const [sessionId, session] of activeSessions) {
    // Close the WebSocket connection instead of calling disconnect
    session.ws.close();
    console.log(`Session ${sessionId} closed`);
  }
  activeSessions.clear();
}

// Legacy function for frontend logs (keeping for compatibility)
export function handleFrontendConnection(ws: WebSocket): void {
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
