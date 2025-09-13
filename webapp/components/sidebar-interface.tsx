"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Database } from "lucide-react";
import ConfigurationManagementPanel from "./configuration-management-panel";
import VoiceChatWebRTC from "./voice-chat-webrtc";
import PhoneNumberChecklist from "./phone-number-checklist";
import Transcript from "./transcript";
import FunctionCallsPanel from "./function-calls-panel";
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

type TabType = "personas" | "conversation";

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

  const tabs = [
    {
      id: "conversation" as TabType,
      label: "Conversation",
      icon: MessageSquare,
      description: "Chat history and voice interaction"
    },
    {
      id: "personas" as TabType,
      label: "Personas",
      icon: Database,
      description: "Manage agent personas"
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
            onTranscript={(text, isUser) => {
              console.log("📥 Received transcript in sidebar:", { text, isUser });
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
