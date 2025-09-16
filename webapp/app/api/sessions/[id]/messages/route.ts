import { NextRequest, NextResponse } from 'next/server';

const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    console.log(`=== GET /api/sessions/${id}/messages ===`);
    console.log('Server URL:', serverUrl);
    
    const response = await fetch(`${serverUrl}/api/sessions/${id}/messages`, {
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
    console.log('Websocket server response data (preview):', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    return NextResponse.json(data);
  } catch (error) {
    console.error(`=== ERROR in GET /api/sessions/${params.id}/messages ===`);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    console.log(`=== POST /api/sessions/${id}/messages ===`);
    console.log('Session ID:', id);
    console.log('Request body:', body);
    console.log('Server URL:', serverUrl);
    
    const response = await fetch(`${serverUrl}/api/sessions/${id}/messages`, {
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
    console.error(`=== ERROR in POST /api/sessions/${params.id}/messages ===`);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
