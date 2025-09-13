"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, Download } from 'lucide-react';

interface AgentInstructions {
  name: string;
  instructions: string;
  original_instructions: string;
  personality_config: any;
  personality_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<AgentInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/agent-instructions');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setInstructions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instructions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructions();
  }, []);

  const copyToClipboard = async () => {
    if (instructions?.instructions) {
      try {
        await navigator.clipboard.writeText(instructions.instructions);
        alert('Instructions copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const downloadInstructions = () => {
    if (instructions?.instructions) {
      const blob = new Blob([instructions.instructions], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-instructions-${instructions.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading instructions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchInstructions} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!instructions) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>No Instructions Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">No active agent configuration found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Instructions</h1>
            <p className="text-gray-600 mt-2">Current instructions for: <span className="font-semibold">{instructions.name}</span></p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchInstructions} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={downloadInstructions} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Agent Name:</span>
                <p className="mt-1">{instructions.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Updated:</span>
                <p className="mt-1">{new Date(instructions.updated_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <p className="mt-1">{new Date(instructions.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Has Personality Config:</span>
                <p className="mt-1">{instructions.personality_config ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rendered Instructions</CardTitle>
            <p className="text-sm text-gray-600">
              These are the instructions generated from the template with actual values from the database.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                {instructions.instructions}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Original Instructions for comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Instructions (from Database)</CardTitle>
            <p className="text-sm text-gray-600">
              These are the original instructions stored in the database.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg border max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                {instructions.original_instructions}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Personality Config (if exists) */}
        {instructions.personality_config && Object.keys(instructions.personality_config).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personality Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg border max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                  {JSON.stringify(instructions.personality_config, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personality Instructions (if exists) */}
        {instructions.personality_instructions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personality Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg border max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                  {instructions.personality_instructions}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
