"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare, Activity, User } from "lucide-react";
import SessionConfigurationPanel from "./session-configuration-panel";
import { PersonalityConfigPanel } from "./personality-config-panel";
import VoiceChat from "./voice-chat";
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
}

type TabType = "agent" | "personality" | "conversation";

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
      id: "agent" as TabType,
      label: "Agent Config",
      icon: Settings,
      description: "AI settings and tools"
    },
    {
      id: "personality" as TabType,
      label: "Personality",
      icon: User,
      description: "Personality and tone configuration"
    }
  ];

  const renderMainContent = () => {
    switch (activeTab) {
      case "agent":
        return (
          <div className="h-full flex flex-col">
            <SessionConfigurationPanel
              callStatus={callStatus}
              onSave={onSaveConfiguration}
            />
          </div>
        );
      case "personality":
        return (
          <div className="h-full flex flex-col">
            <PersonalityConfigPanel
              onSave={onSavePersonality || (() => Promise.resolve())}
              initialConfig={personalityConfig}
            />
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
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
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
                <Icon className="h-5 w-5 mr-3" />
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
