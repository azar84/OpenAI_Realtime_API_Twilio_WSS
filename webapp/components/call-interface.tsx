"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/top-bar";
import ChecklistAndConfig from "@/components/checklist-and-config";
import SessionConfigurationPanel from "@/components/session-configuration-panel";
import Transcript from "@/components/transcript";
import FunctionCallsPanel from "@/components/function-calls-panel";
import VoiceChat from "@/components/voice-chat";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";
import PhoneNumberChecklist from "@/components/phone-number-checklist";

const CallInterface = () => {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [allConfigsReady, setAllConfigsReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (allConfigsReady && !ws) {
      const newWs = new WebSocket("ws://localhost:8081/logs");

      newWs.onopen = () => {
        console.log("Connected to logs websocket");
        setCallStatus("connected");
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received logs event:", data);
        handleRealtimeEvent(data, setItems);
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);
        setCallStatus("disconnected");
      };

      setWs(newWs);
    }
  }, [allConfigsReady, ws]);

  return (
    <div className="h-screen bg-white flex flex-col">
      <ChecklistAndConfig
        ready={allConfigsReady}
        setReady={setAllConfigsReady}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
      />
      <TopBar />
      <div className="flex-grow p-4 h-full overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left Column */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden space-y-4">
            <SessionConfigurationPanel
              callStatus={callStatus}
              onSave={async (config) => {
                try {
                  // 1. Save to database first
                  console.log("Saving configuration to database:", config);
                  
                  // Get current active config to update it
                  const activeConfigResponse = await fetch('/api/agent-config?active=true');
                  let configId;
                  
                  if (activeConfigResponse.ok) {
                    const activeConfig = await activeConfigResponse.json();
                    configId = activeConfig.id;
                    
                    // Update existing configuration
                    const updateResponse = await fetch('/api/agent-config', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        id: configId,
                        instructions: config.instructions,
                        voice: config.voice,
                        enabled_tools: config.tools?.map((tool: any) => tool.function?.name || tool.name) || [],
                        tools_enabled: config.tools && config.tools.length > 0,
                      }),
                    });
                    
                    if (!updateResponse.ok) {
                      throw new Error('Failed to update configuration');
                    }
                    
                    console.log("✅ Configuration updated in database");
                  } else {
                    // Create new configuration if none exists
                    const createResponse = await fetch('/api/agent-config', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        name: 'Agent Configuration',
                        instructions: config.instructions,
                        voice: config.voice,
                        enabled_tools: config.tools?.map((tool: any) => tool.function?.name || tool.name) || [],
                        tools_enabled: config.tools && config.tools.length > 0,
                        is_active: true,
                      }),
                    });
                    
                    if (!createResponse.ok) {
                      throw new Error('Failed to create configuration');
                    }
                    
                    console.log("✅ New configuration created in database");
                  }
                  
                  // 2. Send to WebSocket server for real-time update
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    const updateEvent = {
                      type: "session.update",
                      session: {
                        ...config,
                      },
                    };
                    console.log("Sending update event to WebSocket:", updateEvent);
                    ws.send(JSON.stringify(updateEvent));
                  }
                  
                } catch (error) {
                  console.error("❌ Error saving configuration:", error);
                  // Still try to send to WebSocket even if database save fails
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    const updateEvent = {
                      type: "session.update",
                      session: {
                        ...config,
                      },
                    };
                    console.log("Sending update event to WebSocket (fallback):", updateEvent);
                    ws.send(JSON.stringify(updateEvent));
                  }
                  throw error; // Re-throw to let the component handle the error state
                }
              }}
            />
            
            <VoiceChat 
              onTranscript={(text, isUser) => {
                // Add voice transcripts to the items list
                const newItem: Item = {
                  id: `voice-${Date.now()}`,
                  object: "realtime.item",
                  type: "message",
                  role: isUser ? "user" : "assistant",
                  content: [{ type: "text", text: text }],
                  timestamp: new Date().toISOString()
                };
                setItems(prev => [...prev, newItem]);
              }}
            />
          </div>

          {/* Middle Column: Transcript */}
          <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden">
            <PhoneNumberChecklist
              selectedPhoneNumber={selectedPhoneNumber}
              allConfigsReady={allConfigsReady}
              setAllConfigsReady={setAllConfigsReady}
            />
            <Transcript items={items} />
          </div>

          {/* Right Column: Function Calls */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden">
            <FunctionCallsPanel items={items} ws={ws} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
