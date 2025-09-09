import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash, Check, AlertCircle } from "lucide-react";
import { toolTemplates } from "@/lib/tool-templates";
import { ToolConfigurationDialog } from "./tool-configuration-dialog";
import { BackendTag } from "./backend-tag";
import { useBackendTools } from "@/lib/use-backend-tools";

interface SessionConfigurationPanelProps {
  callStatus: string;
  onSave: (config: any) => void;
}

const SessionConfigurationPanel: React.FC<SessionConfigurationPanelProps> = ({
  callStatus,
  onSave,
}) => {
  const [instructions, setInstructions] = useState(
    "You are a helpful assistant in a phone call."
  );
  const [voice, setVoice] = useState("ash");
  const [tools, setTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSchemaStr, setEditingSchemaStr] = useState("");
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom hook to fetch backend tools every 3 seconds
  const backendTools = useBackendTools("http://localhost:8081/tools", 3000);

  // Load saved configuration on component mount
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log("Loading saved configuration...");
        const response = await fetch('/api/agent-config?active=true');
        
        if (response.ok) {
          const config = await response.json();
          console.log("✅ Loaded configuration:", config);
          
          setInstructions(config.instructions || "You are a helpful assistant in a phone call.");
          setVoice(config.voice || "ash");
          
          // Convert enabled tools to the format expected by the tools state
          if (config.enabled_tools && config.enabled_tools.length > 0) {
            // We need to get the full tool definitions from the backend
            const toolsResponse = await fetch('/api/tools');
            if (toolsResponse.ok) {
              const allTools = await toolsResponse.json();
              const enabledToolSchemas = allTools
                .filter((tool: any) => config.enabled_tools.includes(tool.name))
                .map((tool: any) => JSON.stringify({
                  type: "function",
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                  }
                }));
              setTools(enabledToolSchemas);
            }
          } else {
            setTools([]);
          }
          
          setHasUnsavedChanges(false);
        } else {
          console.log("No active configuration found, using defaults");
        }
      } catch (error) {
        console.error("❌ Error loading configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  // Track changes to determine if there are unsaved modifications
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [instructions, voice, tools]);

  // Reset save status after a delay when saved
  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await onSave({
        instructions,
        voice,
        tools: tools.map((tool) => JSON.parse(tool)),
      });
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
    } catch (error) {
      setSaveStatus("error");
    }
  };

  const handleAddTool = () => {
    setEditingIndex(null);
    setEditingSchemaStr("");
    setSelectedTemplate("");
    setIsJsonValid(true);
    setOpenDialog(true);
  };

  const handleEditTool = (index: number) => {
    setEditingIndex(index);
    setEditingSchemaStr(tools[index] || "");
    setSelectedTemplate("");
    setIsJsonValid(true);
    setOpenDialog(true);
  };

  const handleDeleteTool = (index: number) => {
    const newTools = [...tools];
    newTools.splice(index, 1);
    setTools(newTools);
  };

  const handleDialogSave = () => {
    try {
      JSON.parse(editingSchemaStr);
    } catch {
      return;
    }
    const newTools = [...tools];
    if (editingIndex === null) {
      newTools.push(editingSchemaStr);
    } else {
      newTools[editingIndex] = editingSchemaStr;
    }
    setTools(newTools);
    setOpenDialog(false);
  };

  const handleTemplateChange = (val: string) => {
    setSelectedTemplate(val);

    // Determine if the selected template is from local or backend
    let templateObj =
      toolTemplates.find((t) => t.name === val) ||
      backendTools.find((t: any) => t.name === val);

    if (templateObj) {
      setEditingSchemaStr(JSON.stringify(templateObj, null, 2));
      setIsJsonValid(true);
    }
  };

  const onSchemaChange = (value: string) => {
    setEditingSchemaStr(value);
    try {
      JSON.parse(value);
      setIsJsonValid(true);
    } catch {
      setIsJsonValid(false);
    }
  };

  const getToolNameFromSchema = (schema: string): string => {
    try {
      const parsed = JSON.parse(schema);
      return parsed?.name || "Untitled Tool";
    } catch {
      return "Invalid JSON";
    }
  };

  const isBackendTool = (name: string): boolean => {
    return backendTools.some((t: any) => t.name === name);
  };

  return (
    <Card className="flex flex-col h-full w-full mx-auto">
      <CardHeader className="pb-0 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Agent Settings
          </CardTitle>
          <div className="flex items-center gap-2">
            {saveStatus === "error" ? (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Save failed
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-xs text-muted-foreground">Not saved</span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 sm:p-5">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-gray-600">Loading configuration...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 m-1">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Instructions
              </label>
              <Textarea
                placeholder="Enter instructions"
                className="min-h-[200px] resize-y"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Voice</label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {["ash", "ballad", "coral", "sage", "verse"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Tools</label>
              <div className="space-y-2">
                {tools.map((tool, index) => {
                  const name = getToolNameFromSchema(tool);
                  const backend = isBackendTool(name);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border p-2 sm:p-3 gap-2"
                    >
                      <span className="text-sm truncate flex-1 min-w-0 flex items-center">
                        {name}
                        {backend && <BackendTag />}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTool(index)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTool(index)}
                          className="h-8 w-8"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAddTool}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tool
                </Button>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleSave}
              disabled={saveStatus === "saving" || !hasUnsavedChanges}
            >
              {saveStatus === "saving" ? (
                "Saving..."
              ) : saveStatus === "saved" ? (
                <span className="flex items-center">
                  Saved Successfully
                  <Check className="ml-2 h-4 w-4" />
                </span>
              ) : saveStatus === "error" ? (
                "Error Saving"
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
          )}
        </ScrollArea>
      </CardContent>

      <ToolConfigurationDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        editingIndex={editingIndex}
        selectedTemplate={selectedTemplate}
        editingSchemaStr={editingSchemaStr}
        isJsonValid={isJsonValid}
        onTemplateChange={handleTemplateChange}
        onSchemaChange={onSchemaChange}
        onSave={handleDialogSave}
        backendTools={backendTools}
      />
    </Card>
  );
};

export default SessionConfigurationPanel;
