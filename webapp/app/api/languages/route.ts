import { NextRequest, NextResponse } from 'next/server';

const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function GET() {
  try {
    const response = await fetch(`${serverUrl}/api/languages`, {
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
    console.error('Error fetching languages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch languages' },
      { status: 500 }
    );
  }
}
