import { NextRequest, NextResponse } from 'next/server';

const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolName = searchParams.get('toolName');
    
    const url = toolName 
      ? `${WEBSOCKET_SERVER_URL}/api/tool-configurations?toolName=${encodeURIComponent(toolName)}&t=${Date.now()}`
      : `${WEBSOCKET_SERVER_URL}/api/tool-configurations?t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tool configurations: ${response.status}`);
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
    console.error('Error fetching tool configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool configurations' },
      { status: 500 }
    );
  }
}
