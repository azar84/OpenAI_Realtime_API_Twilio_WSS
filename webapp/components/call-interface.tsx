"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/top-bar";
import ChecklistAndConfig from "@/components/checklist-and-config";
import SidebarInterface from "@/components/sidebar-interface";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";

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

  const handleSaveConfiguration = async (config: any) => {
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
            name: config.name,
            instructions: config.instructions,
            model: config.model,
            voice: config.voice,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            turn_detection_type: config.turn_detection_type,
            turn_detection_threshold: config.turn_detection_threshold,
            turn_detection_prefix_padding_ms: config.turn_detection_prefix_padding_ms,
            turn_detection_silence_duration_ms: config.turn_detection_silence_duration_ms,
            enabled_tools: config.tools?.map((tool: any) => tool.function?.name || tool.name) || [],
            tools_enabled: config.tools && config.tools.length > 0,
            primary_language: config.primary_language,
            secondary_languages: config.secondary_languages,
          }),
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          console.error('Update response error:', errorData);
          throw new Error(`Failed to update configuration: ${errorData.error || updateResponse.statusText}`);
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
            name: config.name || 'Agent Configuration',
            instructions: config.instructions,
            voice: config.voice,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            turn_detection_type: config.turn_detection_type,
            turn_detection_threshold: config.turn_detection_threshold,
            turn_detection_prefix_padding_ms: config.turn_detection_prefix_padding_ms,
            turn_detection_silence_duration_ms: config.turn_detection_silence_duration_ms,
            enabled_tools: config.tools?.map((tool: any) => tool.function?.name || tool.name) || [],
            tools_enabled: config.tools && config.tools.length > 0,
            primary_language: config.primary_language,
            secondary_languages: config.secondary_languages,
            is_active: true,
          }),
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Create response error:', errorData);
          throw new Error(`Failed to create configuration: ${errorData.error || createResponse.statusText}`);
        }
        
        console.log("✅ New configuration created in database");
      }
      
      // 2. Reload configuration for active sessions
      try {
        const reloadResponse = await fetch('/api/agent-config', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (reloadResponse.ok) {
          console.log("✅ Configuration reloaded for active sessions");
        } else {
          console.warn("⚠️ Failed to reload configuration for active sessions");
        }
      } catch (reloadError) {
        console.warn("⚠️ Error reloading configuration for active sessions:", reloadError);
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
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      <ChecklistAndConfig
        ready={allConfigsReady}
        setReady={setAllConfigsReady}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
      />
      <TopBar />
      <div className="flex-grow h-full overflow-hidden">
        <SidebarInterface
          selectedPhoneNumber={selectedPhoneNumber}
          setSelectedPhoneNumber={setSelectedPhoneNumber}
          allConfigsReady={allConfigsReady}
          setAllConfigsReady={setAllConfigsReady}
          items={items}
          setItems={setItems}
          callStatus={callStatus}
          ws={ws}
          onSaveConfiguration={handleSaveConfiguration}
        />
      </div>
    </div>
  );
};

export default CallInterface;
