import { WebSocket } from "ws";

// OpenAI Realtime API Types
export type Item = {
  id: string;
  object: string; // e.g. "realtime.item"
  type: "message" | "function_call" | "function_call_output";
  timestamp?: string;
  status?: "running" | "completed";
  // For "message" items
  role?: "system" | "user" | "assistant" | "tool";
  content?: { type: string; text: string }[];
  // For "function_call" items
  name?: string;
  call_id?: string;
  params?: Record<string, any>;
  // For "function_call_output" items
  output?: string;
};

// Twilio Types
export interface PhoneNumber {
  sid: string;
  friendlyName: string;
  voiceUrl?: string;
}

export type FunctionCall = {
  name: string;
  params: Record<string, any>;
  completed?: boolean;
  response?: string;
  status?: string;
  call_id?: string; // ensure each call has a call_id
};

// WebSocket Session Types
export interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  modelConn?: WebSocket;
  config?: any;
  streamSid?: string;
}

export interface FunctionCallItem {
  name: string;
  arguments: string;
  call_id?: string;
}

export interface FunctionSchema {
  name: string;
  type: "function";
  description?: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
}

export interface FunctionHandler {
  schema: FunctionSchema;
  handler: (args: any, sessionContext?: { streamSid?: string }) => Promise<string>;
}

// Database Types
export interface AgentConfig {
  id?: number;
  name: string;
  instructions: string;
  voice: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  input_audio_format: string;
  output_audio_format: string;
  turn_detection_type: string;
  turn_detection_threshold?: number;
  turn_detection_prefix_padding_ms?: number;
  turn_detection_silence_duration_ms?: number;
  modalities: string[];
  tools_enabled: boolean;
  enabled_tools: string[];
  primary_language?: string;
  secondary_languages: string[];
  personality_config?: any;
  personality_instructions?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ToolDefinition {
  id?: number;
  name: string;
  type: string;
  description: string;
  parameters: object;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Extended Agent Config for newer database schema
export interface DBAgentConfig extends AgentConfig {
  // Personality configuration fields
  config_title?: string;
  config_description?: string;
  identity_option_id?: number;
  task_option_id?: number;
  demeanor_option_id?: number;
  tone_option_id?: number;
  enthusiasm_option_id?: number;
  formality_option_id?: number;
  emotion_option_id?: number;
  filler_words_option_id?: number;
  pacing_option_id?: number;
  custom_instructions?: string[];
  
  // Language configuration fields
  primary_language_id?: number;
  secondary_language_ids?: number[];
  
  // VAD parameters
  turn_detection_eagerness?: number;
  turn_detection_create_response?: boolean;
  turn_detection_interrupt_response?: boolean;
  max_output_tokens?: number;
  
  // Personality values (from JOIN queries)
  identity_value?: string;
  task_value?: string;
  demeanor_value?: string;
  tone_value?: string;
  enthusiasm_value?: string;
  formality_value?: string;
  emotion_value?: string;
  filler_words_value?: string;
  pacing_value?: string;
  
  // Language values (from JOIN queries)
  primary_language_code?: string;
  primary_language_name?: string;
  primary_language_native_name?: string;
  secondary_language_codes?: string[];
  secondary_language_names?: string[];
}

// Session Types
export interface SessionData {
  id: number;
  session_id: string;
  config_id?: number;
  twilio_stream_sid?: string;
  status: 'active' | 'ended' | 'failed';
  started_at: string;
  ended_at?: string;
  agent_name?: string;
  config_title?: string;
  message_count?: number;
}

// Conversation Message Types
export interface ConversationMessage {
  id: number;
  session_id: number;
  message_type: 'user' | 'assistant' | 'function_call' | 'function_output' | 'system';
  content: string;
  stream_sid?: string;
  metadata?: any;
  audio_duration_ms?: number;
  is_audio: boolean;
  created_at: string;
}

// Tool Configuration Types
export interface ToolConfiguration {
  tool_name: string;
  config_key: string;
  config_value: string;
  description?: string;
  is_secret: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Personality Option Types
export interface PersonalityOption {
  id: number;
  category: string;
  value: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Language Types
export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
