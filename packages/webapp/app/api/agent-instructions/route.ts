import { NextRequest, NextResponse } from 'next/server';
import { AgentConfigDB } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get the active agent configuration
    const config = await AgentConfigDB.getActive();
    
    if (!config) {
      return NextResponse.json(
        { error: 'No active agent configuration found' },
        { status: 404 }
      );
    }

    // Call the websocket server to get rendered instructions
    const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';
    
    const response = await fetch(`${serverUrl}/api/agent-instructions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const serverData = await response.json();

    // Return the instructions
    return NextResponse.json({
      name: config.name,
      instructions: serverData.instructions,
      original_instructions: config.instructions,
      personality_config: config.personality_config,
      personality_instructions: config.personality_instructions,
      created_at: config.created_at,
      updated_at: config.updated_at
    });

  } catch (error) {
    console.error('Error fetching agent instructions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent instructions' },
      { status: 500 }
    );
  }
}
