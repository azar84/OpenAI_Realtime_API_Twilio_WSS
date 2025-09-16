"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { RefreshCw, Save, Eye } from 'lucide-react';

export default function TemplateEditorPage() {
  const [template, setTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/instructions-template');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplate(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch template');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/instructions-template', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setSuccess('Template saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading template...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Instructions Template Editor</h1>
            <p className="text-gray-600 mt-2">Edit the template that generates agent instructions with placeholders</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchTemplate} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload
            </Button>
            <Button onClick={saveTemplate} disabled={saving} className="flex items-center gap-2">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Available Placeholders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Placeholders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Basic Info</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><code className="bg-gray-100 px-1 rounded">{'{identity}'}</code> - Agent identity</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{name}'}</code> - Agent name</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{task}'}</code> - Agent task</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Personality</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><code className="bg-gray-100 px-1 rounded">{'{demeanor_description}'}</code> - Demeanor</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{tone_description}'}</code> - Tone</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{enthusiasm_description}'}</code> - Enthusiasm</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{formality_description}'}</code> - Formality</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{emotion_description}'}</code> - Emotion</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{filler_words_description}'}</code> - Filler words</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{pacing_description}'}</code> - Pacing</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Language & Instructions</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><code className="bg-gray-100 px-1 rounded">{'{language_description}'}</code> - Language settings</li>
                  <li><code className="bg-gray-100 px-1 rounded">{'{base_instructions}'}</code> - Base instructions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Content</CardTitle>
            <p className="text-sm text-gray-600">
              Use the placeholders above to create your instructions template. The placeholders will be replaced with actual values when generating instructions.
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Enter your template here..."
            />
          </CardContent>
        </Card>

        {/* Preview Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview Generated Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              After saving your template, you can view the generated instructions with actual values.
            </p>
            <Button 
              onClick={() => window.open('/instructions', '_blank')} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Generated Instructions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
