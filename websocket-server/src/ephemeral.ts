import { Request, Response } from 'express';
import { getActiveAgentConfig } from './db';
import { normalizeConfig } from './agent-config-mapper';

export const getEphemeralKey = async (_req: Request, res: Response) => {
  try {
    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    console.log('🔑 Creating ephemeral client key...');
    
    // Get agent configuration from database
    console.log('🔍 Fetching agent configuration from database...');
    const agentConfig = await getActiveAgentConfig();
    if (!agentConfig) {
      console.error('❌ No active agent configuration found in database');
      throw new Error('No active agent configuration found');
    }
    console.log('✅ Agent configuration found:', agentConfig.name);
    
    // Normalize the configuration to get proper settings
    const normalizedConfig = normalizeConfig(agentConfig);
    
    // Ensure temperature is within valid range (0.6 <= temperature <= 1.0)
    const validTemperature = Math.max(0.6, Math.min(1.0, normalizedConfig.temperature));
    
    console.log('🔧 Using agent configuration:');
    console.log('  - Model:', normalizedConfig.model);
    console.log('  - Voice:', normalizedConfig.voice);
    console.log('  - Temperature:', validTemperature, '(original:', normalizedConfig.temperature, ')');
    console.log('  - VAD:', normalizedConfig.turn_detection);
    console.log('  - Modalities:', normalizedConfig.modalities);
    
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: normalizedConfig.model,
        voice: normalizedConfig.voice,
        instructions: normalizedConfig.instructions,
        temperature: validTemperature,
        turn_detection: normalizedConfig.turn_detection,
        modalities: normalizedConfig.modalities,
        input_audio_transcription: { model: 'whisper-1' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      console.error('❌ Request body was:', JSON.stringify({
        model: normalizedConfig.model,
        voice: normalizedConfig.voice,
        instructions: normalizedConfig.instructions,
        temperature: validTemperature,
        turn_detection: normalizedConfig.turn_detection,
        modalities: normalizedConfig.modalities
      }, null, 2));
      return res.status(response.status).json({ error: 'Failed to create ephemeral key', details: errorText });
    }

    const json = await response.json();
    console.log('✅ Ephemeral key created successfully');
    
    res.json(json);
  } catch (error) {
    console.error('❌ Error creating ephemeral key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
