"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/top-bar";
import ChecklistAndConfig from "@/components/checklist-and-config";
import SidebarInterface from "@/components/sidebar-interface";
import { PersonalityConfigPanel } from "@/components/personality-config-panel";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";

const CallInterface = () => {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [allConfigsReady, setAllConfigsReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [personalityConfig, setPersonalityConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("config");

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

  const handleSavePersonality = async (personality: any) => {
    try {
      // Get current active config to update it
      const activeConfigResponse = await fetch('/api/agent-config?active=true');
      let configId;
      let currentInstructions = '';
      let agentConfig = null;
      
      if (activeConfigResponse.ok) {
        agentConfig = await activeConfigResponse.json();
        configId = agentConfig.id;
        currentInstructions = agentConfig.instructions || '';
        
        // Convert personality config to instructions format with agent config
        const personalityInstructions = generatePersonalityInstructions(personality, agentConfig);
        
        // Combine personality instructions with main instructions
        let combinedInstructions = '';
        
        // Check if instructions already contain "# Instructions" section
        const instructionsIndex = currentInstructions.indexOf('# Instructions');
        if (instructionsIndex !== -1) {
          // Insert personality section before the existing Instructions section
          const beforeInstructions = currentInstructions.substring(0, instructionsIndex).trim();
          const afterInstructions = currentInstructions.substring(instructionsIndex);
          combinedInstructions = `${beforeInstructions}\n\n${personalityInstructions}\n\n${afterInstructions}`;
        } else {
          // Append personality section to existing instructions
          combinedInstructions = `${currentInstructions}\n\n${personalityInstructions}`;
        }
        
        // Update existing configuration with personality
        console.log('🔧 Saving combined instructions to database:', {
          id: configId,
          personality_config: personality,
          personality_instructions: personalityInstructions,
          instructions: combinedInstructions.substring(0, 200) + '...' // Log first 200 chars
        });
        
        const updateResponse = await fetch('/api/agent-config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: configId,
            personality_config: personality,
            personality_instructions: personalityInstructions,
            instructions: combinedInstructions,
          }),
        });
        
        if (!updateResponse.ok) {
          throw new Error('Failed to save personality configuration');
        }
        
        // Verify what was saved to database
        const savedConfig = await updateResponse.json();
        console.log("✅ Personality configuration saved and integrated into instructions");
        console.log("🔍 Saved instructions preview:", savedConfig.instructions?.substring(0, 200) + '...');
        
        setPersonalityConfig(personality);
      }
    } catch (error) {
      console.error("❌ Error saving personality configuration:", error);
    }
  };

  const generatePersonalityInstructions = (personality: any, agentConfig: any) => {
    const sections = [];
    
    // Add Personality & Tone section
    sections.push("# Personality & Tone");
    
    // Identity section
    if (personality.identity) {
      sections.push("## Identity");
      let identityText = `You are a ${personality.identity.toLowerCase()} who customers trust for quick, reliable help. You sound approachable and knowledgeable, like someone they've known for years.`;
      
      // Add name if available
      if (agentConfig?.name) {
        identityText += ` and your name is ${agentConfig.name}.`;
      }
      
      sections.push(identityText);
    }
    
    // Task section
    if (personality.task) {
      sections.push("## Task");
      sections.push(`Your job is to ${personality.task.toLowerCase()}. You ask simple, clear questions, guide them step by step, and provide solutions or escalate when necessary.`);
    }
    
    // Demeanor section
    if (personality.demeanor) {
      sections.push("## Demeanor");
      const demeanorText = personality.demeanor.toLowerCase();
      if (demeanorText.includes('empathetic')) {
        sections.push("Empathetic — you show that you care about the user's frustration and reassure them while helping.");
      } else if (demeanorText.includes('patient')) {
        sections.push("Patient — you take your time to understand the user's needs and never rush them through the process.");
      } else if (demeanorText.includes('upbeat')) {
        sections.push("Upbeat — you maintain a positive, energetic attitude that helps lift the user's spirits.");
      } else if (demeanorText.includes('serious')) {
        sections.push("Serious — you approach each interaction with focused attention and professional dedication.");
      } else if (demeanorText.includes('calm')) {
        sections.push("Calm — you maintain a steady, reassuring presence that helps users feel at ease.");
      } else {
        sections.push(`${personality.demeanor} — you approach each interaction with this mindset.`);
      }
    }
    
    // Tone section
    if (personality.tone) {
      sections.push("## Tone");
      const toneText = personality.tone.toLowerCase();
      if (toneText.includes('warm and conversational')) {
        sections.push("Warm and conversational, with a natural flow to your speech.");
      } else if (toneText.includes('polite and authoritative')) {
        sections.push("Polite and authoritative — you speak with confidence while maintaining respect.");
      } else if (toneText.includes('casual and relaxed')) {
        sections.push("Casual and relaxed — you speak naturally, like talking to a friend.");
      } else if (toneText.includes('formal and precise')) {
        sections.push("Formal and precise — you choose your words carefully and speak with clarity.");
      } else {
        sections.push(`${personality.tone} — you communicate with this voice style.`);
      }
    }
    
    // Enthusiasm section
    if (personality.enthusiasm) {
      sections.push("## Level of Enthusiasm");
      const enthusiasmText = personality.enthusiasm.toLowerCase();
      if (enthusiasmText.includes('engaged but measured')) {
        sections.push("Engaged but measured — you sound attentive and interested, without going over the top.");
      } else if (enthusiasmText.includes('highly enthusiastic')) {
        sections.push("Highly enthusiastic — you bring energy and excitement to every interaction.");
      } else if (enthusiasmText.includes('energetic')) {
        sections.push("Energetic — you maintain a lively, dynamic presence throughout the conversation.");
      } else if (enthusiasmText.includes('neutral interest')) {
        sections.push("Neutral interest — you remain professional and attentive without excessive excitement.");
      } else {
        sections.push(`${personality.enthusiasm} — you express this level of enthusiasm in your responses.`);
      }
    }
    
    // Formality section
    if (personality.formality) {
      sections.push("## Level of Formality");
      const formalityText = personality.formality.toLowerCase();
      if (formalityText.includes('relaxed professional')) {
        sections.push("Relaxed professional — polite, clear, and respectful, but not overly stiff.");
      } else if (formalityText.includes('very casual')) {
        sections.push("Very casual — you speak like a friend, using informal language and expressions.");
      } else if (formalityText.includes('highly formal')) {
        sections.push("Highly formal — you maintain a very structured, professional communication style.");
      } else if (formalityText.includes('neutral professional')) {
        sections.push("Neutral professional — you balance friendliness with professional standards.");
      } else {
        sections.push(`${personality.formality} — you maintain this level of formality.`);
      }
    }
    
    // Emotion section
    if (personality.emotion) {
      sections.push("## Level of Emotion");
      const emotionText = personality.emotion.toLowerCase();
      if (emotionText.includes('compassionate and warm')) {
        sections.push("Compassionate and warm — you acknowledge pain points and offer encouragement.");
      } else if (emotionText.includes('very expressive')) {
        sections.push("Very expressive — you show your emotions clearly and animatedly.");
      } else if (emotionText.includes('encouraging and supportive')) {
        sections.push("Encouraging and supportive — you focus on building the user's confidence.");
      } else if (emotionText.includes('neutral, matter-of-fact')) {
        sections.push("Neutral, matter-of-fact — you present information clearly without emotional coloring.");
      } else {
        sections.push(`${personality.emotion} — you express this level of emotion in your communication.`);
      }
    }
    
    // Filler Words section
    if (personality.fillerWords) {
      sections.push("## Filler Words");
      const fillerText = personality.fillerWords.toLowerCase();
      if (fillerText.includes('occasionally')) {
        sections.push("Occasionally use natural fillers (\"hm,\" \"uh\") to sound more human, but not excessively.");
      } else if (fillerText.includes('none')) {
        sections.push("Avoid filler words — speak clearly and directly without unnecessary sounds.");
      } else if (fillerText.includes('often')) {
        sections.push("Use filler words frequently — this makes you sound more natural and conversational.");
      } else if (fillerText.includes('rare')) {
        sections.push("Use filler words rarely — only when it feels natural, like \"hm\" when thinking.");
      } else {
        sections.push(`${personality.fillerWords} — you use this approach to filler words in your speech.`);
      }
    }
    
    // Pacing section
    if (personality.pacing) {
      sections.push("## Pacing");
      const pacingText = personality.pacing.toLowerCase();
      if (pacingText.includes('medium steady')) {
        sections.push("Medium steady — keep a normal conversation rhythm, neither rushed nor too slow.");
      } else if (pacingText.includes('very fast')) {
        sections.push("Very fast and energetic — you speak quickly with high energy.");
      } else if (pacingText.includes('slow and deliberate')) {
        sections.push("Slow and deliberate — you take your time to ensure clarity and understanding.");
      } else if (pacingText.includes('variable')) {
        sections.push("Variable — you adjust your pace based on the situation, faster when excited, slower when serious.");
      } else {
        sections.push(`${personality.pacing} — you speak with this pacing style.`);
      }
    }
    
    // Other Details section
    if (personality.otherDetails && personality.otherDetails.length > 0) {
      sections.push("## Other Details");
      const details = personality.otherDetails.map((detail: string) => {
        if (detail.includes('check for understanding')) {
          return "Always check for understanding before moving on. For example, after explaining a step, say \"Does that make sense?\" or \"Were you able to follow that?\" before continuing.";
        } else if (detail.includes('humor')) {
          return "Use light humor and jokes when appropriate to make interactions more enjoyable.";
        } else if (detail.includes('cultural references')) {
          return "Add cultural references (sports, movies, etc.) when relevant to help users relate.";
        } else if (detail.includes('storytelling')) {
          return "Use storytelling analogies to explain complex concepts in simple terms.";
        } else if (detail.includes('under 20 seconds')) {
          return "Keep answers under 20 seconds in speech to maintain user engagement.";
        } else if (detail.includes('plain language')) {
          return "Rephrase technical instructions in plain language that anyone can understand.";
        } else if (detail.includes('examples')) {
          return "Give examples in responses (e.g., \"like when you...\") to clarify your points.";
        } else if (detail.includes('avoid slang')) {
          return "Avoid slang entirely — maintain professional language at all times.";
        } else {
          return detail;
        }
      });
      sections.push(details.join(" "));
    }
    
    // Language section
    if (agentConfig?.primary_language || (agentConfig?.secondary_languages && agentConfig.secondary_languages.length > 0)) {
      sections.push("## Language");
      
      let languageText = "";
      if (agentConfig.primary_language) {
        languageText = `You speak ${agentConfig.primary_language} as your primary language`;
        
        if (agentConfig.secondary_languages && agentConfig.secondary_languages.length > 0) {
          const secondaryList = agentConfig.secondary_languages.join(", ");
          languageText += `, and you can also speak ${secondaryList}`;
        }
        
        languageText += ". If the user wants to switch to another language you support, or you feel the user is not comfortable speaking the language you talk with, you can switch to their preferred language.";
      }
      
      if (languageText) {
        sections.push(languageText);
      }
    }
    
    // Add Instructions section header
    sections.push("\n# Instructions");
    
    return sections.join("\n\n");
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
          onSavePersonality={handleSavePersonality}
          personalityConfig={personalityConfig}
        />
      </div>
    </div>
  );
};

export default CallInterface;
