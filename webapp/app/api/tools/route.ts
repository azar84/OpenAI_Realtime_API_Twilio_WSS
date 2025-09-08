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

// GET /api/tools/[name] - Get specific tool by name
export async function getToolByName(name: string) {
  try {
    const tool = await ToolDefinitionDB.getByName(name);
    if (!tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(tool);
  } catch (error) {
    console.error('Error fetching tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
