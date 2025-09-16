import { NextRequest, NextResponse } from 'next/server';

const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET() {
  try {
    const response = await fetch(`${serverUrl}/api/personality-options`, {
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
    console.error('Error fetching personality options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personality options' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${serverUrl}/api/personality-options`, {
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
    console.error('Error creating personality option:', error);
    return NextResponse.json(
      { error: 'Failed to create personality option' },
      { status: 500 }
    );
  }
}
