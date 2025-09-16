"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Database, Settings, History } from "lucide-react";
import ConfigurationManagementPanel from "./configuration-management-panel";
import ToolsConfigurationPanel from "./tools-configuration-panel";
import VoiceChatWebRTC from "./voice-chat-webrtc";
import PhoneNumberChecklist from "./phone-number-checklist";
import Transcript from "./transcript";
import FunctionCallsPanel from "./function-calls-panel";
import ConversationHistory from "./conversation-history";
import { Item } from "./types";

interface SidebarInterfaceProps {
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (phone: string) => void;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  callStatus: string;
  ws: WebSocket | null;
  onSaveConfiguration: (config: any) => Promise<void>;
  onSavePersonality?: (personality: any) => Promise<void>;
  personalityConfig?: any;
  agentName?: string;
}

type TabType = "personas" | "conversation" | "tools" | "history";

const SidebarInterface: React.FC<SidebarInterfaceProps> = ({
  selectedPhoneNumber,
  setSelectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
  items,
  setItems,
  callStatus,
  ws,
  onSaveConfiguration,
  onSavePersonality,
  personalityConfig,
  agentName,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("conversation");
  const [webrtcSessionId, setWebrtcSessionId] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const webrtcSessionIdRef = useRef<number | null>(null);
  const sessionCreationPromiseRef = useRef<Promise<number | null> | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const webrtcWebSocketRef = useRef<WebSocket | null>(null);

  // Function to connect to WebRTC WebSocket
  const connectWebRTCWebSocket = () => {
    if (webrtcWebSocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebRTC WebSocket already connected');
      return;
    }
    
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
      const ws = new WebSocket(`${wsUrl}/webrtc`);
      
      ws.onopen = () => {
        console.log('🔌 WebRTC WebSocket connected');
        webrtcWebSocketRef.current = ws;
      };
      
      ws.onclose = () => {
        console.log('🔌 WebRTC WebSocket disconnected');
        webrtcWebSocketRef.current = null;
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebRTC WebSocket error:', error);
      };
      
      webrtcWebSocketRef.current = ws;
    } catch (error) {
      console.error('❌ Error connecting to WebRTC WebSocket:', error);
    }
  };

  // Function to reset session (call this when conversation ends)
  const resetWebRTCSession = () => {
    console.log('🔄 Resetting WebRTC session');
    setWebrtcSessionId(null);
    webrtcSessionIdRef.current = null;
    setIsCreatingSession(false);
    sessionCreationPromiseRef.current = null;
    processedMessagesRef.current.clear();
    
    // Close WebSocket connection
    if (webrtcWebSocketRef.current) {
      webrtcWebSocketRef.current.close();
      webrtcWebSocketRef.current = null;
    }
  };

  // Function to create a WebRTC session
  const createWebRTCSession = async () => {
    // If we already have a session, return it
    if (webrtcSessionIdRef.current) {
      console.log('✅ Session already exists:', webrtcSessionIdRef.current);
      return webrtcSessionIdRef.current;
    }
    
    // If we're already creating a session, wait for that promise
    if (sessionCreationPromiseRef.current) {
      console.log('⏳ Session creation already in progress, waiting...');
      return await sessionCreationPromiseRef.current;
    }
    
    // Create a new session creation promise
    sessionCreationPromiseRef.current = (async () => {
      setIsCreatingSession(true);
      try {
        console.log('🔄 Creating WebRTC session...');
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: `webrtc-${Date.now()}`,
            config_id: null, // Will be set when we have an active config
            twilio_stream_sid: null
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // Update both state and ref immediately
          setWebrtcSessionId(data.id);
          webrtcSessionIdRef.current = data.id;
          console.log('✅ Created WebRTC session:', data.id);
          
          // Connect to WebSocket and send session start message
          connectWebRTCWebSocket();
          
          // Send session start message to WebSocket
          setTimeout(() => {
            if (webrtcWebSocketRef.current?.readyState === WebSocket.OPEN) {
              webrtcWebSocketRef.current.send(JSON.stringify({
                type: 'session_start',
                sessionId: data.id,
                configId: null
              }));
              console.log('📤 Sent session start message to WebSocket');
            }
          }, 100);
          
          return data.id;
        } else {
          console.error('❌ Failed to create WebRTC session:', response.status, response.statusText);
          return null;
        }
      } catch (error) {
        console.error('❌ Error creating WebRTC session:', error);
        return null;
      } finally {
        setIsCreatingSession(false);
        sessionCreationPromiseRef.current = null;
      }
    })();
    
    return await sessionCreationPromiseRef.current;
  };

  // Function to save message via WebSocket
  const saveMessageToDatabase = async (text: string, isUser: boolean, sessionId?: number) => {
    const targetSessionId = sessionId || webrtcSessionIdRef.current;
    if (!targetSessionId) {
      console.log('⚠️ No WebRTC session ID, skipping message save');
      return;
    }
    
    // Ensure WebSocket is connected
    if (!webrtcWebSocketRef.current || webrtcWebSocketRef.current.readyState !== WebSocket.OPEN) {
      console.log('🔄 WebSocket not connected, connecting...');
      connectWebRTCWebSocket();
      
      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!webrtcWebSocketRef.current || webrtcWebSocketRef.current.readyState !== WebSocket.OPEN) {
        console.error('❌ Failed to connect to WebSocket');
        return;
      }
    }
    
    try {
      console.log('🔄 Sending WebRTC message via WebSocket:', { text: text.substring(0, 50) + '...', isUser, sessionId: targetSessionId });
      
      webrtcWebSocketRef.current.send(JSON.stringify({
        type: 'transcript',
        sessionId: targetSessionId,
        text: text,
        isUser: isUser,
        metadata: { source: 'webrtc' }
      }));
      
      console.log('✅ Sent WebRTC message to WebSocket');
    } catch (error) {
      console.error('❌ Error sending WebRTC message via WebSocket:', error);
    }
  };

  const tabs = [
    {
      id: "conversation" as TabType,
      label: "Conversation",
      icon: MessageSquare,
      description: "Chat history and voice interaction"
    },
    {
      id: "history" as TabType,
      label: "History",
      icon: History,
      description: "View conversation history"
    },
    {
      id: "personas" as TabType,
      label: "Personas",
      icon: Database,
      description: "Manage agent personas"
    },
    {
      id: "tools" as TabType,
      label: "Tools",
      icon: Settings,
      description: "Configure agent tools"
    }
  ];

  const renderMainContent = () => {
    switch (activeTab) {
      case "personas":
        return (
          <div className="h-full flex flex-col">
            <ConfigurationManagementPanel />
          </div>
        );
      
      case "tools":
        return (
          <div className="h-full flex flex-col">
            <ToolsConfigurationPanel />
          </div>
        );
      
      case "history":
        return (
          <div className="h-full flex flex-col">
            <ConversationHistory />
          </div>
        );
      
      case "conversation":
        return (
          <div className="h-full flex flex-col">
            <PhoneNumberChecklist
              selectedPhoneNumber={selectedPhoneNumber}
              allConfigsReady={allConfigsReady}
              setAllConfigsReady={setAllConfigsReady}
            />
            <div className="flex-1 grid grid-cols-12 gap-4 h-full overflow-hidden">
              {/* Main conversation area */}
              <div className="col-span-8 flex flex-col h-full overflow-hidden">
                <Transcript items={items} />
              </div>
              
              {/* Function calls sidebar */}
              <div className="col-span-4 flex flex-col h-full overflow-hidden">
                <FunctionCallsPanel items={items} ws={ws} />
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar Navigation */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full justify-start h-auto p-3 ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0 text-current" />
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {tab.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </nav>

        {/* Voice Chat in sidebar */}
        <div className="p-4 border-t border-gray-200">
          <VoiceChatWebRTC 
            onTranscript={async (text, isUser) => {
              console.log("📥 Received transcript in sidebar:", { text: text.substring(0, 50) + '...', isUser, currentSessionId: webrtcSessionIdRef.current });
              
              // Create a unique message key for deduplication (without timestamp to catch duplicates)
              const messageKey = `${isUser ? 'user' : 'assistant'}-${text.substring(0, 100)}`;
              
              // Check if we've already processed this message recently (within last 5 seconds)
              if (processedMessagesRef.current.has(messageKey)) {
                console.log("⚠️ Message already processed recently, skipping:", messageKey.substring(0, 50) + '...');
                return;
              }
              
              // Mark message as processed
              processedMessagesRef.current.add(messageKey);
              
              // Clear old messages after 10 seconds to prevent memory buildup
              setTimeout(() => {
                processedMessagesRef.current.delete(messageKey);
              }, 10000);
              
              // Create session if it doesn't exist
              let sessionId = webrtcSessionIdRef.current;
              if (!sessionId) {
                console.log("🔄 No session exists, creating new WebRTC session...");
                sessionId = await createWebRTCSession();
                if (!sessionId) {
                  console.error("❌ Failed to create session, skipping message save");
                  return;
                }
              }
              
              // Save message to database using the session ID directly
              console.log("🔄 Attempting to save message to database...");
              await saveMessageToDatabase(text, isUser, sessionId);
              
              // Add voice transcripts to the items list
              const newItem: Item = {
                id: `voice-${Date.now()}`,
                object: "realtime.item",
                type: "message",
                role: isUser ? "user" : "assistant",
                content: [{ type: "text", text: text }],
                timestamp: new Date().toISOString()
              };
              console.log("📝 Adding new item to conversation:", newItem);
              setItems(prev => {
                const updated = [...prev, newItem];
                console.log("📊 Updated items count:", updated.length);
                return updated;
              });
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-hidden">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default SidebarInterface;
