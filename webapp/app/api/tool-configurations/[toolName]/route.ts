import { NextRequest, NextResponse } from 'next/server';

const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET(
  request: NextRequest,
  { params }: { params: { toolName: string } }
) {
  try {
    const { toolName } = params;
    
    const response = await fetch(`${WEBSOCKET_SERVER_URL}/api/tool-configurations/${encodeURIComponent(toolName)}?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tool configuration: ${response.status}`);
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
    console.error('Error fetching tool configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool configuration' },
      { status: 500 }
    );
  }
}
