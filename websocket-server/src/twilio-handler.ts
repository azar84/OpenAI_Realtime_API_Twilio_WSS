import { RawData, WebSocket } from "ws";
import functions from "./functionHandlers";
import { getActiveAgentConfig } from "./db";
import { normalizeConfig } from "./agent-config-mapper";
import agentInstructions from "./agent-instructions";

interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  modelConn?: WebSocket;
  streamSid?: string;
  saved_config?: any;
  lastAssistantItem?: string;
  responseStartTimestamp?: number;
  latestMediaTimestamp?: number;
  openAIApiKey?: string;
}

let session: Session = {};

export function handleCallConnection(ws: WebSocket, openAIApiKey: string) {
  // Clean up any existing connections and reset session
  closeAllConnections();
  
  // Initialize fresh session for new call
  session.twilioConn = ws;
  session.openAIApiKey = openAIApiKey;
  session.streamSid = undefined;
  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
  session.latestMediaTimestamp = undefined;
  session.saved_config = undefined;

  ws.on("message", handleTwilioMessage);
  ws.on("error", ws.close);
  ws.on("close", () => {
    cleanupConnection(session.modelConn);
    cleanupConnection(session.twilioConn);
    session.twilioConn = undefined;
    session.modelConn = undefined;
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    if (!session.frontendConn) session = {};
  });
}

export function handleFrontendConnection(ws: WebSocket) {
  cleanupConnection(session.frontendConn);
  session.frontendConn = ws;

  ws.on("message", handleFrontendMessage);
  ws.on("close", () => {
    cleanupConnection(session.frontendConn);
    session.frontendConn = undefined;
    if (!session.twilioConn && !session.modelConn) session = {};
  });
}

async function handleFunctionCall(item: { name: string; arguments: string }) {
  console.log("Handling function call:", item);
  
  try {
    // Get the tool from our registry
    const { TOOL_REGISTRY } = await import('./agent-tools');
    const tool = TOOL_REGISTRY[item.name];
    
    if (!tool) {
      throw new Error(`No handler found for function: ${item.name}`);
    }

    let args: unknown;
    try {
      args = JSON.parse(item.arguments);
    } catch {
      return JSON.stringify({
        error: "Invalid JSON arguments for function call.",
      });
    }

    console.log("Calling function:", tool.schema.name, args);
    const result = await tool.handler(args as any);
    return result;
  } catch (err: any) {
    console.error("Error running function:", err);
    return JSON.stringify({
      error: `Error running function ${item.name}: ${err.message}`,
    });
  }
}

function handleTwilioMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) return;

  switch (msg.event) {
    case "start":
      session.streamSid = msg.start.streamSid;
      session.latestMediaTimestamp = 0;
      session.lastAssistantItem = undefined;
      session.responseStartTimestamp = undefined;
      tryConnectModel().catch(console.error);
      break;
    case "media":
      session.latestMediaTimestamp = msg.media.timestamp;
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
          type: "input_audio_buffer.append",
          audio: msg.media.payload,
        });
      }
      break;
    case "close":
      closeAllConnections();
      break;
  }
}

function handleFrontendMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) return;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, msg);
  }

  if (msg.type === "session.update") {
    session.saved_config = msg.session;
  }
}

async function tryConnectModel() {
  if (!session.twilioConn || !session.streamSid || !session.openAIApiKey)
    return;
  if (isOpen(session.modelConn)) return;

  // Get the model from database configuration
  const agentConfig = await getActiveAgentConfig();
  const model = agentConfig?.model || 'gpt-4o-realtime-preview-2024-12-17';
  
  console.log('🔗 Connecting Twilio to OpenAI with model:', model);

  session.modelConn = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    {
      headers: {
        Authorization: `Bearer ${session.openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  session.modelConn.on("open", async () => {
    const config = session.saved_config || {};
    
    // Get agent configuration from database
    console.log('🔍 Fetching agent configuration for Twilio...');
    const agentConfig = await getActiveAgentConfig();
    if (!agentConfig) {
      console.error('❌ No active agent configuration found for Twilio');
      return;
    }
    
    // Normalize config and get fresh template-based instructions (same as WebRTC)
    const normalizedConfig = await normalizeConfig(agentConfig);
    console.log('📝 Generating fresh instructions from template for Twilio...');
    const freshInstructions = await agentInstructions();
    
    const validTemperature = Math.max(0.6, Math.min(1.0, normalizedConfig.temperature));
    
    console.log('🤖 Twilio Agent Config:', {
      model: normalizedConfig.model,
      voice: normalizedConfig.voice,
      temperature: validTemperature,
      maxTokens: normalizedConfig.max_output_tokens,
      turnDetection: normalizedConfig.turn_detection,
      instructions: freshInstructions.substring(0, 100) + '...',
    });
    
    // First, configure the session
    jsonSend(session.modelConn, {
      type: "session.update",
      session: {
        model: normalizedConfig.model,
        voice: normalizedConfig.voice,
        instructions: freshInstructions,
        temperature: validTemperature,
        max_response_output_tokens: normalizedConfig.max_output_tokens || undefined,
        turn_detection: normalizedConfig.turn_detection,
        modalities: normalizedConfig.modalities,
        input_audio_transcription: { 
          model: 'whisper-1'
        },
        input_audio_format: "g711_ulaw", // Twilio uses g711_ulaw
        output_audio_format: "g711_ulaw", // Twilio uses g711_ulaw
        tools: normalizedConfig.toolsEnabled ? normalizedConfig.enabledToolsForTwilio : [],
        ...config,
      },
    });
    
    // Then send initial greeting after a short delay
    console.log('🎤 Scheduling initial greeting for Twilio caller...');
    setTimeout(async () => {
      if (isOpen(session.modelConn)) {
        const agentName = agentConfig?.name || 'Assistant';
        
        console.log(`🎤 Sending initial greeting as ${agentName}...`);
        
        jsonSend(session.modelConn, {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Hello ${agentName}, the call has started. Please greet the caller naturally and introduce yourself.`
              }
            ]
          }
        });
        
        // Trigger a response to the greeting
        jsonSend(session.modelConn, {
          type: "response.create",
          response: {
            modalities: ["text", "audio"]
          }
        });
      }
    }, 2000); // Give session time to be fully configured
  });

  session.modelConn.on("message", handleModelMessage);
  session.modelConn.on("error", closeModel);
  session.modelConn.on("close", closeModel);
}

function handleModelMessage(data: RawData) {
  const event = parseMessage(data);
  if (!event) return;

  jsonSend(session.frontendConn, event);

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      handleTruncation();
      break;

    case "response.audio.delta":
      if (session.twilioConn && session.streamSid) {
        if (session.responseStartTimestamp === undefined) {
          session.responseStartTimestamp = session.latestMediaTimestamp || 0;
        }
        if (event.item_id) session.lastAssistantItem = event.item_id;

        jsonSend(session.twilioConn, {
          event: "media",
          streamSid: session.streamSid,
          media: { payload: event.delta },
        });

        jsonSend(session.twilioConn, {
          event: "mark",
          streamSid: session.streamSid,
        });
      }
      break;

    case "response.output_item.done": {
      const { item } = event;
      if (item.type === "function_call") {
        handleFunctionCall(item)
          .then((output) => {
            if (session.modelConn) {
              jsonSend(session.modelConn, {
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: item.call_id,
                  output: JSON.stringify(output),
                },
              });
              jsonSend(session.modelConn, { type: "response.create" });
            }
          })
          .catch((err) => {
            console.error("Error handling function call:", err);
          });
      }
      break;
    }
  }
}

function handleTruncation() {
  if (
    !session.lastAssistantItem ||
    session.responseStartTimestamp === undefined
  )
    return;

  const elapsedMs =
    (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
  const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, {
      type: "conversation.item.truncate",
      item_id: session.lastAssistantItem,
      content_index: 0,
      audio_end_ms,
    });
  }

  if (session.twilioConn && session.streamSid) {
    jsonSend(session.twilioConn, {
      event: "clear",
      streamSid: session.streamSid,
    });
  }

  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
}

function closeModel() {
  cleanupConnection(session.modelConn);
  session.modelConn = undefined;
  if (!session.twilioConn && !session.frontendConn) session = {};
}

function closeAllConnections() {
  if (session.twilioConn) {
    session.twilioConn.close();
    session.twilioConn = undefined;
  }
  if (session.modelConn) {
    session.modelConn.close();
    session.modelConn = undefined;
  }
  if (session.frontendConn) {
    session.frontendConn.close();
    session.frontendConn = undefined;
  }
  session.streamSid = undefined;
  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
  session.latestMediaTimestamp = undefined;
  session.saved_config = undefined;
}

function cleanupConnection(ws?: WebSocket) {
  if (isOpen(ws)) ws.close();
}

function parseMessage(data: RawData): any {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function jsonSend(ws: WebSocket | undefined, obj: unknown) {
  if (!isOpen(ws)) return;
  ws.send(JSON.stringify(obj));
}

function isOpen(ws?: WebSocket): ws is WebSocket {
  return !!ws && ws.readyState === WebSocket.OPEN;
}
