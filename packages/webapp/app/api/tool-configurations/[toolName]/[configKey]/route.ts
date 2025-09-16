import { NextRequest, NextResponse } from 'next/server';

const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function PUT(
  request: NextRequest,
  { params }: { params: { toolName: string; configKey: string } }
) {
  try {
    const { toolName, configKey } = params;
    const body = await request.json();
    const { configValue } = body;
    
    if (!configValue) {
      return NextResponse.json(
        { error: 'configValue is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${WEBSOCKET_SERVER_URL}/api/tool-configurations/${encodeURIComponent(toolName)}/${encodeURIComponent(configKey)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ configValue }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update tool configuration: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error updating tool configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update tool configuration' },
      { status: 500 }
    );
  }
}
