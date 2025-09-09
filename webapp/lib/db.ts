import { Pool, PoolClient } from 'pg';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'openai_realtime_db',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
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

// Agent configuration types
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

// Agent configuration database operations
export class AgentConfigDB {
  // Get all active configurations
  static async getAll(): Promise<AgentConfig[]> {
    const result = await query(
      'SELECT * FROM agent_configs WHERE is_active = true ORDER BY updated_at DESC'
    );
    return result.rows.map(this.mapDbRowToConfig);
  }

  // Get configuration by ID
  static async getById(id: number): Promise<AgentConfig | null> {
    const result = await query(
      'SELECT * FROM agent_configs WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows.length > 0 ? this.mapDbRowToConfig(result.rows[0]) : null;
  }

  // Get active configuration (most recently updated)
  static async getActive(): Promise<AgentConfig | null> {
    const result = await query(
      'SELECT * FROM agent_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
    );
    return result.rows.length > 0 ? this.mapDbRowToConfig(result.rows[0]) : null;
  }

  // Create new configuration
  static async create(config: Omit<AgentConfig, 'id' | 'created_at' | 'updated_at'>): Promise<AgentConfig> {
    const result = await query(
      `INSERT INTO agent_configs (
        name, instructions, voice, model, temperature, max_tokens,
        input_audio_format, output_audio_format, turn_detection_type,
        turn_detection_threshold, turn_detection_prefix_padding_ms, 
        turn_detection_silence_duration_ms, modalities, tools_enabled, 
        enabled_tools, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        config.name,
        config.instructions,
        config.voice,
        config.model,
        config.temperature,
        config.max_tokens,
        config.input_audio_format,
        config.output_audio_format,
        config.turn_detection_type,
        config.turn_detection_threshold,
        config.turn_detection_prefix_padding_ms,
        config.turn_detection_silence_duration_ms,
        JSON.stringify(config.modalities),
        config.tools_enabled,
        JSON.stringify(config.enabled_tools),
        config.is_active
      ]
    );
    return this.mapDbRowToConfig(result.rows[0]);
  }

  // Update configuration
  static async update(id: number, config: Partial<AgentConfig>): Promise<AgentConfig | null> {
    console.log('🔧 Database update called with:', { id, config });
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.entries(config).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && value !== undefined) {
        if (key === 'modalities' || key === 'enabled_tools') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const queryString = `UPDATE agent_configs SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    console.log('🔧 Database query:', queryString);
    console.log('🔧 Database values:', values);
    
    try {
      const result = await query(queryString, values);
      console.log('✅ Database update successful');
      return result.rows.length > 0 ? this.mapDbRowToConfig(result.rows[0]) : null;
    } catch (error) {
      console.error('❌ Database update error:', error);
      throw error;
    }
  }

  // Delete (soft delete by setting is_active = false)
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'UPDATE agent_configs SET is_active = false WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // Map database row to AgentConfig
  private static mapDbRowToConfig(row: any): AgentConfig {
    return {
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
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

// Tool definitions database operations
export class ToolDefinitionDB {
  // Get all enabled tools
  static async getAll(): Promise<ToolDefinition[]> {
    const result = await query(
      'SELECT * FROM tool_definitions WHERE enabled = true ORDER BY name'
    );
    return result.rows.map((row: any) => ({
      ...row,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters
    }));
  }

  // Get tool by name
  static async getByName(name: string): Promise<ToolDefinition | null> {
    const result = await query(
      'SELECT * FROM tool_definitions WHERE name = $1',
      [name]
    );
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters
    };
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Close pool (for cleanup)
export async function closePool(): Promise<void> {
  await pool.end();
}
