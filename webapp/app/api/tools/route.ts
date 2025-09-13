import { NextRequest, NextResponse } from 'next/server';

// GET /api/tools - Get all available tools from the simple tool registry
export async function GET(request: NextRequest) {
  try {
    // Fetch tools from the backend websocket server
    const response = await fetch('http://localhost:8081/api/tools');
    if (!response.ok) {
      throw new Error(`Backend server responded with ${response.status}`);
    }
    
    const tools = await response.json();
    return NextResponse.json(tools);
  } catch (error) {
    console.error('Error fetching tools from backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools from backend server' },
      { status: 500 }
    );
  }
}

// Note: getToolByName function removed as it's not a valid Next.js route export
// If needed, this should be implemented as a dynamic route: app/api/tools/[name]/route.ts
