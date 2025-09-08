import { RawData, WebSocket } from "ws";
import functions from "./functionHandlers";
import { getActiveAgentConfig, testConnection } from "./db";

interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  voiceChatConn?: WebSocket;
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
  cleanupConnection(session.twilioConn);
  session.twilioConn = ws;
  session.openAIApiKey = openAIApiKey;

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
    if (!session.twilioConn && !session.modelConn && !session.voiceChatConn) session = {};
  });
}

export function handleVoiceChatConnection(ws: WebSocket, openAIApiKey: string) {
  console.log("🎙️ New voice chat connection established");
  cleanupConnection(session.voiceChatConn);
  session.voiceChatConn = ws;
  session.openAIApiKey = openAIApiKey;
  
  console.log("📝 Setting up voice chat WebSocket event handlers");

  ws.on("message", handleVoiceChatMessage);
  ws.on("error", (error) => {
    console.error("❌ Voice chat WebSocket error:", error);
    ws.close();
  });
  ws.on("close", () => {
    console.log("🔚 Voice chat WebSocket connection closed");
    cleanupConnection(session.modelConn);
    cleanupConnection(session.voiceChatConn);
    session.voiceChatConn = undefined;
    session.modelConn = undefined;
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    if (!session.twilioConn && !session.frontendConn) session = {};
  });

  // Auto-connect to OpenAI when voice chat connects
  tryConnectModel().catch(console.error);
}

async function handleFunctionCall(item: { name: string; arguments: string }) {
  console.log("Handling function call:", item);
  const fnDef = functions.find((f) => f.schema.name === item.name);
  if (!fnDef) {
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

  try {
    console.log("Calling function:", fnDef.schema.name, args);
    const result = await fnDef.handler(args as any);
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
      console.log("🚀 Call START event received");
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

function handleVoiceChatMessage(data: RawData) {
  let dataSize: number | string = 'unknown';
  if (data instanceof ArrayBuffer) {
    dataSize = data.byteLength;
  } else if (data instanceof Buffer) {
    dataSize = data.length;
  } else {
    const strData = data.toString();
    dataSize = strData.length;
  }
  console.log("🎵 Received voice chat data, size:", dataSize);
  
  // Convert data to string for processing
  const stringData = data.toString();
  
  try {
    // Try to parse as JSON first (control messages)
    const msg = JSON.parse(stringData);
    console.log("📨 Voice chat control message:", msg.type);
    
    if (msg.type === "start_recording") {
      console.log("🎙️  Voice chat recording started");
      // Mirror Twilio flow: cancel current response and clear input buffer
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, { type: "response.cancel" });
        jsonSend(session.modelConn, { type: "input_audio_buffer.clear" });
        console.log("🧹 Cleared input buffer and cancelled any running response");
      }
    } else if (msg.type === "stop_recording") {
      console.log("🛑 Voice chat recording stopped - committing and requesting response");
      // Mirror Twilio flow: commit audio buffer then request response
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, { type: "input_audio_buffer.commit" });
        jsonSend(session.modelConn, { type: "response.create" });
        console.log("✅ Committed audio buffer and triggered response generation");
      }
    }
  } catch (parseError) {
    // Not JSON, assume it's base64 PCM16 audio data
    console.log("📤 Processing base64 PCM16 audio for OpenAI");
    
    if (isOpen(session.modelConn)) {
      try {
        // Data is already base64, send directly to OpenAI
        console.log("📡 Sending PCM16 audio buffer to OpenAI, length:", stringData.length);
        
        jsonSend(session.modelConn, {
          type: "input_audio_buffer.append",
          audio: stringData,
        });
        
        console.log("✅ PCM16 audio buffer sent to OpenAI successfully");
      } catch (error) {
        console.error("❌ Error sending PCM16 audio to OpenAI:", error);
      }
    } else {
      console.warn("⚠️  OpenAI model connection not open, dropping voice chat audio");
      console.log("🔍 Session state:", {
        hasVoiceChat: !!session.voiceChatConn,
        hasModel: !!session.modelConn,
        modelOpen: isOpen(session.modelConn)
      });
    }
  }
}

async function tryConnectModel() {
  console.log("🤖 tryConnectModel() called");
  
  // Check if we have either a Twilio connection or voice chat connection
  const hasConnection = session.twilioConn || session.voiceChatConn;
  if (!hasConnection || !session.openAIApiKey) {
    console.log("⚠️  Missing connection or API key");
    return;
  }
  if (isOpen(session.modelConn)) {
    console.log("ℹ️  Model connection already open");
    return;
  }

  // Fetch database configuration
  console.log("🗃️  Fetching agent configuration from database...");
  let dbConfig = null;
  try {
    dbConfig = await getActiveAgentConfig();
    if (dbConfig) {
      console.log("✅ Database config loaded:", dbConfig.name);
      console.log("📝 Instructions:", dbConfig.instructions ? "Present" : "Missing");
      console.log("🔊 Voice:", dbConfig.voice);
      console.log("🗃️  COMPLETE DB CONFIG:");
      console.log(JSON.stringify(dbConfig, null, 2));
    } else {
      console.log("⚠️  No active configuration found in database");
    }
  } catch (error) {
    console.error("❌ Failed to fetch agent config:", error);
  }

  session.modelConn = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
    {
      headers: {
        Authorization: `Bearer ${session.openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  session.modelConn.on("open", () => {
    console.log("🎉 OpenAI WebSocket connection opened!");
    
    const frontendConfig = session.saved_config || {};
    
    // Build base configuration - ONLY difference is audio format for voice chat vs Twilio
    const isVoiceChat = !!session.voiceChatConn && !session.twilioConn;
    const sessionConfig: any = {
      modalities: ["text", "audio"],
      turn_detection: { 
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      voice: "ash", // Default, will be overridden by database config
      input_audio_transcription: { model: "whisper-1" },
      input_audio_format: isVoiceChat ? "pcm16" : "g711_ulaw", // ONLY difference
      output_audio_format: isVoiceChat ? "pcm16" : "g711_ulaw", // ONLY difference
    };
    
    console.log(`🎵 Configuring for ${isVoiceChat ? 'voice chat' : 'Twilio'} with ${sessionConfig.input_audio_format} format`);

    // Apply database configuration if available
    if (dbConfig) {
      console.log("🗃️  Applying database configuration");
      
      if (dbConfig.instructions) {
        sessionConfig.instructions = dbConfig.instructions;
        console.log("✅ Instructions applied:");
        console.log("📝 FULL INSTRUCTIONS:", dbConfig.instructions);
      } else {
        console.log("⚠️  No instructions found in database config");
      }
      
      sessionConfig.voice = dbConfig.voice || "ash";
      sessionConfig.temperature = dbConfig.temperature || 0.8;
      
      console.log("🎤 Voice setting:", sessionConfig.voice);
      console.log("🌡️  Temperature:", sessionConfig.temperature);
      
      if (dbConfig.max_tokens) {
        sessionConfig.max_response_output_tokens = dbConfig.max_tokens;
        console.log("🎯 Max tokens:", dbConfig.max_tokens);
      }
    } else {
      console.log("⚠️  No database configuration available - using defaults");
      sessionConfig.instructions = "You are a helpful AI assistant. Please respond clearly in English.";
      console.log("📝 Using default instructions:", sessionConfig.instructions);
    }

    // Apply frontend overrides (highest priority)
    if (Object.keys(frontendConfig).length > 0) {
      console.log("🖥️  Applying frontend overrides:");
      console.log("🔧 Frontend config:", JSON.stringify(frontendConfig, null, 2));
      Object.assign(sessionConfig, frontendConfig);
    } else {
      console.log("ℹ️  No frontend overrides to apply");
    }
    
    console.log("📡 FINAL SESSION CONFIG BEING SENT TO OPENAI:");
    console.log("🎤 Voice:", sessionConfig.voice);
    console.log("📝 Instructions:", sessionConfig.instructions || "❌ NO INSTRUCTIONS SET");
    console.log("🌡️  Temperature:", sessionConfig.temperature);
    console.log("🎯 Max tokens:", sessionConfig.max_response_output_tokens || "default");
    console.log("🔧 COMPLETE CONFIG:");
    console.log(JSON.stringify(sessionConfig, null, 2));
    
    jsonSend(session.modelConn, {
      type: "session.update",
      session: sessionConfig,
    });
  });

  session.modelConn.on("message", handleModelMessage);
  session.modelConn.on("error", closeModel);
  session.modelConn.on("close", closeModel);
}

function handleModelMessage(data: RawData) {
  const event = parseMessage(data);
  if (!event) return;

  // Log important OpenAI events
  if (event.type === 'session.created') {
    console.log("✅ OpenAI session created");
  } else if (event.type === 'session.updated') {
    console.log("✅ OpenAI session updated");
  } else if (event.type === 'input_audio_buffer.speech_started') {
    console.log("🎙️  OpenAI detected speech start");
  } else if (event.type === 'input_audio_buffer.speech_stopped') {
    console.log("🛑 OpenAI detected speech stop");
  } else if (event.type === 'response.created') {
    console.log("💭 OpenAI creating response...");
  } else if (event.type === 'response.audio.delta') {
    console.log("🔊 OpenAI sending audio response");
  } else if (event.type === 'error') {
    console.error("❌ OpenAI error:", event.error);
  }

  jsonSend(session.frontendConn, event);

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      handleTruncation();
      break;
    case "input_audio_buffer.speech_stopped":
      // For continuous streaming, request a response automatically when VAD detects end of speech
      if (isOpen(session.modelConn)) {
        console.log("🧠 VAD detected speech stop -> requesting response");
        jsonSend(session.modelConn, { type: "response.create" });
      }
      break;

    case "response.audio.delta":
      // Handle Twilio audio output
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
      
      // Handle voice chat audio output
      if (session.voiceChatConn) {
        console.log("🔊 Sending PCM16 audio response to voice chat");
        // Send audio data directly to voice chat client
        if (event.delta) {
          try {
            // For voice chat, we're getting PCM16 base64 data from OpenAI
            // Send it directly as binary to the browser
            const audioBuffer = Buffer.from(event.delta, 'base64');
            session.voiceChatConn.send(audioBuffer);
            console.log("✅ Sent", audioBuffer.length, "bytes of PCM16 audio to browser");
          } catch (error) {
            console.error("❌ Error sending audio to voice chat:", error);
          }
        }
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
  if (session.voiceChatConn) {
    session.voiceChatConn.close();
    session.voiceChatConn = undefined;
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
