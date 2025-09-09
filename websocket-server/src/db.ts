import { Pool, PoolClient } from 'pg';
import { DBAgentConfig } from './agent-config-mapper';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'openai_realtime_db',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
  max: 10, // Smaller pool for websocket server
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Database connection helper
export async function getDbClient(): Promise<PoolClient> {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

// Query helper function
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await getDbClient();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Legacy interface for backward compatibility (deprecated)
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
  is_active: boolean;
}

// Get active agent configuration (returns proper DBAgentConfig type)
export async function getActiveAgentConfig(): Promise<DBAgentConfig | null> {
  try {
    const result = await query(
      'SELECT * FROM agent_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No active agent configuration found in database');
      return null;
    }
    
    const row = result.rows[0];
    const config: DBAgentConfig = {
      id: row.id,
      name: row.name,
      instructions: row.instructions,
      voice: row.voice,
      model: row.model,
      temperature: row.temperature ? parseFloat(row.temperature) : null,
      max_tokens: row.max_tokens ? parseInt(row.max_tokens) : null,
      input_audio_format: row.input_audio_format,
      output_audio_format: row.output_audio_format,
      turn_detection_type: row.turn_detection_type,
      turn_detection_threshold: row.turn_detection_threshold ? parseFloat(row.turn_detection_threshold) : null,
      turn_detection_prefix_padding_ms: row.turn_detection_prefix_padding_ms ? parseInt(row.turn_detection_prefix_padding_ms) : null,
      turn_detection_silence_duration_ms: row.turn_detection_silence_duration_ms ? parseInt(row.turn_detection_silence_duration_ms) : null,
      modalities: typeof row.modalities === 'string' ? JSON.parse(row.modalities) : row.modalities,
      tools_enabled: row.tools_enabled,
      enabled_tools: typeof row.enabled_tools === 'string' ? JSON.parse(row.enabled_tools) : row.enabled_tools,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    console.log('✅ Loaded active agent configuration from database:', config.name);
    return config;
  } catch (error) {
    console.error('❌ Error fetching active agent configuration:', error);
    return null;
  }
}

// Legacy function for backward compatibility (deprecated)
export async function getActiveAgentConfigLegacy(): Promise<AgentConfig | null> {
  try {
    const result = await query(
      'SELECT * FROM agent_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No active agent configuration found in database');
      return null;
    }
    
    const row = result.rows[0];
    const config: AgentConfig = {
      id: row.id,
      name: row.name,
      instructions: row.instructions,
      voice: row.voice,
      model: row.model,
      temperature: row.temperature ? parseFloat(row.temperature) : undefined,
      max_tokens: row.max_tokens ? parseInt(row.max_tokens) : undefined,
      input_audio_format: row.input_audio_format,
      output_audio_format: row.output_audio_format,
      turn_detection_type: row.turn_detection_type,
      turn_detection_threshold: row.turn_detection_threshold ? parseFloat(row.turn_detection_threshold) : undefined,
      turn_detection_prefix_padding_ms: row.turn_detection_prefix_padding_ms ? parseInt(row.turn_detection_prefix_padding_ms) : undefined,
      turn_detection_silence_duration_ms: row.turn_detection_silence_duration_ms ? parseInt(row.turn_detection_silence_duration_ms) : undefined,
      modalities: typeof row.modalities === 'string' ? JSON.parse(row.modalities) : row.modalities,
      tools_enabled: row.tools_enabled,
      enabled_tools: typeof row.enabled_tools === 'string' ? JSON.parse(row.enabled_tools) : row.enabled_tools,
      is_active: row.is_active
    };
    
    console.log('✅ Loaded active agent configuration from database (legacy):', config.name);
    return config;
  } catch (error) {
    console.error('❌ Error fetching active agent configuration:', error);
    return null;
  }
}

// Get tool definitions for enabled tools
export async function getEnabledToolDefinitions(enabledTools: string[]): Promise<any[]> {
  if (!enabledTools || enabledTools.length === 0) {
    return [];
  }
  
  try {
    const placeholders = enabledTools.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `SELECT name, description, parameters FROM tool_definitions WHERE name = ANY($1) AND enabled = true`,
      [enabledTools]
    );
    
    return result.rows.map((row: any) => ({
      type: "function",
      name: row.name,
      description: row.description,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters
    }));
  } catch (error) {
    console.error('❌ Error fetching tool definitions:', error);
    return [];
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    console.log('✅ WebSocket server database connection successful');
    return true;
  } catch (error) {
    console.error('❌ WebSocket server database connection failed:', error);
    return false;
  }
}

// Close pool (for cleanup)
export async function closePool(): Promise<void> {
  await pool.end();
}
