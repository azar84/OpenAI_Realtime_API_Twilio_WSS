import { NextRequest, NextResponse } from 'next/server';
import { ToolDefinitionDB } from '@/lib/db';

// GET /api/tools - Get all available tools
export async function GET(request: NextRequest) {
  try {
    const tools = await ToolDefinitionDB.getAll();
    return NextResponse.json(tools);
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Note: getToolByName function removed as it's not a valid Next.js route export
// If needed, this should be implemented as a dynamic route: app/api/tools/[name]/route.ts
