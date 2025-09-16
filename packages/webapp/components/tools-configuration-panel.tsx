import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save } from 'lucide-react';

interface ToolConfigurations {
  [key: string]: string;
}

interface AvailableTool {
  name: string;
  description: string;
}

const ToolsConfigurationPanel: React.FC = () => {
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load available tools and current configuration
  useEffect(() => {
    loadToolsConfiguration();
  }, []);

  const loadToolsConfiguration = async () => {
    setLoading(true);
    try {
      // Load available tools
      const toolsResponse = await fetch(`/api/tools?t=${Date.now()}`);
      if (toolsResponse.ok) {
        const tools = await toolsResponse.json();
        setAvailableTools(tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description
        })));
      }

      // Load current enabled tools from agent config
      const configResponse = await fetch(`/api/agent-config?active=true&t=${Date.now()}`);
      if (configResponse.ok) {
        const config = await configResponse.json();
        setEnabledTools(config.enabled_tools || []);
      }
    } catch (error) {
      console.error('Error loading tools configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToolsConfiguration = async () => {
    setSaving(true);
    try {
      // First get the active config to get the ID
      const configResponse = await fetch('/api/agent-config?active=true');
      if (!configResponse.ok) {
        throw new Error('Failed to get active configuration');
      }
      
      const activeConfig = await configResponse.json();
      
      // Update the configuration with new enabled tools
      const response = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: activeConfig.id,
          enabled_tools: enabledTools,
          tools_enabled: enabledTools.length > 0
        }),
      });

      if (response.ok) {
        console.log('✅ Tools configuration saved successfully');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save tools configuration:', errorData);
      }
    } catch (error) {
      console.error('Error saving tools configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (toolName: string) => {
    setEnabledTools(prev => 
      prev.includes(toolName) 
        ? prev.filter(name => name !== toolName)
        : [...prev, toolName]
    );
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div>Loading tools configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="tools" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="tools">Available Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tool Configuration
              </CardTitle>
              <CardDescription>
                Enable or disable tools for the AI agent. Only enabled tools will be available during conversations.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-4 flex-1">
                <div className="space-y-3">
                  {availableTools.map((tool) => (
                    <div key={tool.name} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          id={`tool-${tool.name}`}
                          checked={enabledTools.includes(tool.name)}
                          onChange={() => toggleTool(tool.name)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label 
                          htmlFor={`tool-${tool.name}`}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {tool.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {availableTools.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tools available
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {enabledTools.length} of {availableTools.length} tools enabled
                </div>
                <Button
                  onClick={saveToolsConfiguration}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ToolsConfigurationPanel;