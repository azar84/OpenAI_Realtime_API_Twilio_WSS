import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { TwilioRealtimeTransportLayer } from "@openai/agents-extensions";
import { z } from "zod";

// 1) Types that mirror your DB (agent_configs table)
export type DBAgentConfig = {
  id: number;
  name: string | null;
  instructions: string | null;
  voice: string | null; // e.g., 'alloy' | 'verse' | 'ash' | ...
  model: string | null; // e.g., 'gpt-realtime' or 'gpt-4o-realtime-preview-2024-12-17'
  temperature: number | null; // 0.0 - 2.0
  max_tokens: number | null;

  input_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw" | null;
  output_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw" | null;

  turn_detection_type: "server_vad" | "none" | "semantic_vad" | null;
  turn_detection_threshold: number | null;           // server_vad only
  turn_detection_prefix_padding_ms: number | null;   // server_vad only
  turn_detection_silence_duration_ms: number | null; // server_vad only

  modalities: string[] | null; // e.g., ["text","audio"]
  tools_enabled: boolean | null;
  enabled_tools: string[] | null;

  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
};

// Tool registry (name -> tool). Fill with your real tools
const TOOL_REGISTRY: Record<string, ReturnType<typeof tool>> = {
  get_weather_from_coords: tool({
    name: "get_weather_from_coords",
    description: "Get current weather for given coordinates",
    parameters: z.object({ 
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate")
    }),
    async execute(input: { latitude: number; longitude: number }) {
      // This would call your actual weather API
      return `Weather at ${input.latitude}, ${input.longitude}: sunny, 72°F`;
    },
  }),
  lookup_customer: tool({
    name: "lookup_customer",
    description: "Find a customer and recent info by phone number via n8n workflow",
    parameters: z.object({ 
      phone: z.string().describe("E.164 phone number")
    }),
    async execute(input: { phone: string }) {
      // This would call your actual customer lookup API
      return { found: true, id: "cust_123", phone: input.phone, lastOrder: "2024-01-15" };
    },
  }),
};

// 2) Normalize and validate a DB row
export function normalizeConfig(db: DBAgentConfig) {
  // Reasonable fallbacks
  const model = db.model ?? "gpt-realtime";
  const voice = db.voice ?? "alloy";
  const instructions = db.instructions ?? "You are a helpful, concise voice agent. Keep answers short.";

  const inputAudioFormat = db.input_audio_format ?? "g711_ulaw";
  const outputAudioFormat = db.output_audio_format ?? "g711_ulaw";

  // VAD / turn detection mapping
  let turn_detection:
    | { type: "none" }
    | {
        type: "server_vad";
        threshold?: number;
        prefix_padding_ms?: number;
        silence_duration_ms?: number;
      }
    | {
        type: "semantic_vad";
        eagerness?: "low" | "medium" | "high";
        create_response?: boolean;
        interrupt_response?: boolean;
      };

  switch (db.turn_detection_type ?? "server_vad") {
    case "none":
      turn_detection = { type: "none" };
      break;
    case "semantic_vad":
      turn_detection = {
        type: "semantic_vad",
        eagerness: "medium",
        create_response: true,
        interrupt_response: true,
      };
      break;
    default:
      // server_vad default - optimized for low latency
      turn_detection = {
        type: "server_vad",
        threshold: db.turn_detection_threshold ?? 0.5,
        prefix_padding_ms: db.turn_detection_prefix_padding_ms ?? 300,
        silence_duration_ms: db.turn_detection_silence_duration_ms ?? 200,
      };
  }

  // Tools
  const toolsEnabled = db.tools_enabled ?? true;
  const enabledTools = (db.enabled_tools ?? [])
    .map((name) => TOOL_REGISTRY[name])
    .filter(Boolean);

  return {
    model,
    voice,
    instructions,
    temperature: db.temperature ?? 0.7,
    max_output_tokens: db.max_tokens ?? undefined,
    inputAudioFormat,
    outputAudioFormat,
    turn_detection,
    modalities: db.modalities ?? ["text", "audio"],
    toolsEnabled,
    enabledTools,
  };
}

// 3) Build Agent + Session from DB row (for voice chat - uses PCM16)
export function buildAgentFromDB(dbRow: DBAgentConfig) {
  const cfg = normalizeConfig(dbRow);

  const agent = new RealtimeAgent({
    name: dbRow.name ?? "Default Assistant",
    instructions: cfg.instructions,
    voice: cfg.voice,                // choose before first audio output
    tools: cfg.toolsEnabled ? cfg.enabledTools : [],
  });

  const session = new RealtimeSession(agent, {
    model: cfg.model,
    config: {
      audio: {
        input: {
          format: "pcm16", // Browser sends 24kHz PCM16 mono - optimal for Realtime API
          turnDetection: cfg.turn_detection as any,
        },
        output: {
          voice: cfg.voice,
        },
      },
    },
  });

  return { agent, session, cfg };
}

// 4) Build Twilio-specific session from DB row (uses g711_ulaw)
export function buildTwilioSessionFromDB(dbRow: DBAgentConfig, twilioWebSocket: any) {
  const cfg = normalizeConfig(dbRow);

  const agent = new RealtimeAgent({
    name: dbRow.name ?? "Twilio Assistant",
    instructions: cfg.instructions,
    voice: cfg.voice,
    tools: cfg.toolsEnabled ? cfg.enabledTools : [],
  });

  const twilioTransport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: twilioWebSocket,
  });

  const session = new RealtimeSession(agent, {
    transport: twilioTransport,
    model: cfg.model,
    config: {
      audio: {
        output: {
          voice: cfg.voice,
        },
        input: {
          turnDetection: cfg.turn_detection,
        },
      },
    },
  });

  return { agent, session, cfg };
}

// 5) Hot-update mid-call (e.g., user changes settings in UI)
export async function applyLiveUpdateFromDB(
  session: RealtimeSession,
  dbRow: DBAgentConfig
) {
  const cfg = normalizeConfig(dbRow);

  // Build a minimal patch — avoid touching voice if the agent already spoke.
  // If you must change voice mid-call, end the session and start a new one.
  const patch: any = {
    instructions: cfg.instructions,
    temperature: cfg.temperature,
    ...(cfg.max_output_tokens ? { max_output_tokens: cfg.max_output_tokens } : { max_output_tokens: undefined }),
    turn_detection: cfg.turn_detection,
    // audio formats are generally best set at start; change only if you know it's safe
    // input_audio_format: cfg.inputAudioFormat,
    // output_audio_format: cfg.outputAudioFormat,
  };

  // Note: The RealtimeSession doesn't have an update method in the current SDK
  // For now, we'll create a new agent and update it
  const newAgent = new RealtimeAgent({
    name: dbRow.name ?? "Updated Assistant",
    instructions: cfg.instructions,
    voice: cfg.voice,
    tools: cfg.toolsEnabled ? cfg.enabledTools : [],
  });

  await session.updateAgent(newAgent);
}

// 6) Switch voice with restart (when voice changes)
export async function switchVoiceWithRestart(
  oldSession: RealtimeSession,
  dbRow: DBAgentConfig,
  newVoice: string
) {
  // 1) cleanly close current session
  await oldSession.close?.();

  // 2) write to DB (optional) then re-read
  dbRow.voice = newVoice;
  const { session: newSession } = buildAgentFromDB(dbRow);

  // 3) reconnect
  await newSession.connect({ apiKey: process.env.OPENAI_API_KEY! });
  return newSession;
}

// 7) Register a new tool dynamically
export function registerTool(name: string, toolDefinition: ReturnType<typeof tool>) {
  TOOL_REGISTRY[name] = toolDefinition;
}

// 8) Get all available tools
export function getAvailableTools() {
  return Object.keys(TOOL_REGISTRY);
}

// 9) Get tool by name
export function getTool(name: string) {
  return TOOL_REGISTRY[name];
}
