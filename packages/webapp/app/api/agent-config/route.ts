import { NextRequest, NextResponse } from 'next/server';
import { AgentConfigDB, testConnection } from '../../../lib/db';

// GET /api/agent-config - Get all configurations or active configuration
export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build
    if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database operations not available during build' },
        { status: 503 }
      );
    }

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const id = searchParams.get('id');

    let result;
    if (id) {
      result = await AgentConfigDB.getById(parseInt(id));
      if (!result) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }
    } else if (active === 'true') {
      result = await AgentConfigDB.getActive();
      if (!result) {
        return NextResponse.json(
          { error: 'No active configuration found' },
          { status: 404 }
        );
      }
    } else {
      result = await AgentConfigDB.getAll();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching agent configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/agent-config - Create new configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    console.log('POST request body:', body);
    if (!body.name || !body.instructions || !body.voice) {
      console.error('Missing required fields:', { 
        name: body.name, 
        instructions: body.instructions, 
        voice: body.voice 
      });
      return NextResponse.json(
        { error: 'Missing required fields: name, instructions, voice' },
        { status: 400 }
      );
    }

    // Clamp temperature to [0.0, 1.0]
    const temperature: number = typeof body.temperature === 'number'
      ? Math.max(0.0, Math.min(1.0, body.temperature))
      : 0.8;

    // Set defaults for missing fields
    const config = {
      name: body.name,
      instructions: body.instructions,
      voice: body.voice || 'ash',
      model: body.model || 'gpt-4o-realtime-preview-2024-12-17',
      temperature,
      max_tokens: body.max_tokens || null,
      input_audio_format: body.input_audio_format || 'g711_ulaw',
      output_audio_format: body.output_audio_format || 'g711_ulaw',
      turn_detection_type: body.turn_detection_type || 'server_vad',
      turn_detection_threshold: body.turn_detection_threshold || 0.5,
      turn_detection_prefix_padding_ms: body.turn_detection_prefix_padding_ms || 300,
      turn_detection_silence_duration_ms: body.turn_detection_silence_duration_ms || 200,
      modalities: body.modalities || ['text', 'audio'],
      tools_enabled: body.tools_enabled !== undefined ? body.tools_enabled : true,
      enabled_tools: body.enabled_tools || [],
      primary_language: body.primary_language || null,
      secondary_languages: body.secondary_languages || [],
      personality_config: body.personality_config || {},
      personality_instructions: body.personality_instructions || null,
      is_active: body.is_active !== undefined ? body.is_active : true
    };

    const result = await AgentConfigDB.create(config);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating agent configuration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/agent-config - Update configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('PUT request body:', body);
    
    if (!body.id) {
      console.error('Missing configuration ID in PUT request');
      return NextResponse.json(
        { error: 'Missing configuration ID' },
        { status: 400 }
      );
    }

    const { id, ...updateData } = body;

    // Clamp temperature in updates to [0.0, 1.0] if provided
    if (Object.prototype.hasOwnProperty.call(updateData, 'temperature')) {
      const t = Number(updateData.temperature);
      if (!Number.isNaN(t)) {
        updateData.temperature = Math.max(0.0, Math.min(1.0, t));
      } else {
        delete updateData.temperature;
      }
    }
    const result = await AgentConfigDB.update(id, updateData);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating agent configuration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/agent-config - Delete configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing configuration ID' },
        { status: 400 }
      );
    }

    const success = await AgentConfigDB.delete(parseInt(id));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/agent-config - Reload configuration for active sessions
export async function PATCH(request: NextRequest) {
  try {
    // Call the WebSocket server to reload configuration
    const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';
    const response = await fetch(`${serverUrl}/reload-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WebSocket server responded with ${response.status}`);
    }

    return NextResponse.json({ success: true, message: 'Configuration reloaded for active sessions' });
  } catch (error) {
    console.error('Error reloading configuration:', error);
    return NextResponse.json(
      { error: 'Failed to reload configuration for active sessions' },
      { status: 500 }
    );
  }
}
