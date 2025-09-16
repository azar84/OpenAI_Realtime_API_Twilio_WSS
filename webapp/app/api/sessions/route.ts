import { NextRequest, NextResponse } from 'next/server';

const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET /api/sessions ===');
    console.log('Server URL:', serverUrl);
    
    const response = await fetch(`${serverUrl}/api/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Websocket server response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Websocket server error response:', errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Websocket server response data count:', data.length);
    return NextResponse.json(data);
  } catch (error) {
    console.error('=== ERROR in GET /api/sessions ===');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/sessions ===');
    console.log('Server URL:', serverUrl);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const response = await fetch(`${serverUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Websocket server response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Websocket server error response:', errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Websocket server response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('=== ERROR in POST /api/sessions ===');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
