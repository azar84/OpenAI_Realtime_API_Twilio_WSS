import { query } from './db';
import { AgentConfig, DBAgentConfig } from './types';

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
        enabled_tools, primary_language, secondary_languages, 
        personality_config, personality_instructions, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
        config.primary_language || null,
        JSON.stringify(config.secondary_languages || []),
        JSON.stringify(config.personality_config || {}),
        config.personality_instructions || null,
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
        if (key === 'modalities' || key === 'enabled_tools' || key === 'secondary_languages' || key === 'personality_config') {
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
      primary_language: row.primary_language,
      secondary_languages: typeof row.secondary_languages === 'string' ? JSON.parse(row.secondary_languages) : (row.secondary_languages || []),
      personality_config: typeof row.personality_config === 'string' ? JSON.parse(row.personality_config) : (row.personality_config || {}),
      personality_instructions: row.personality_instructions,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
