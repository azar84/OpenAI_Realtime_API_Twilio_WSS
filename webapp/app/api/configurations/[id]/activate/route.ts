import { NextRequest, NextResponse } from 'next/server';

const serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8081';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const response = await fetch(`${serverUrl}/api/configurations/${id}/activate`, {
      method: 'POST',
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
    console.error('Error activating configuration:', error);
    return NextResponse.json(
      { error: 'Failed to activate configuration' },
      { status: 500 }
    );
  }
}
