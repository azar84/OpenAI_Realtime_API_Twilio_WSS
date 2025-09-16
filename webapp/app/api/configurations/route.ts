import { NextRequest, NextResponse } from 'next/server';

const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET() {
  try {
    const response = await fetch(`${serverUrl}/api/configurations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${serverUrl}/api/configurations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating configuration:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
}
