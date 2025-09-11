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
  const [liveInstructions, setLiveInstructions] = useState<string>("");
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

  // Load live instructions and personality config on component mount
  useEffect(() => {
    loadLiveInstructions();
    loadPersonalityConfig();
  }, []);

  // Function to load personality config from database
  const loadPersonalityConfig = async () => {
    try {
      const response = await fetch('/api/agent-config?active=true');
      if (response.ok) {
        const config = await response.json();
        console.log("🔍 Loaded personality config from DB:", config.personality_config);
        if (config.personality_config) {
          setPersonalityConfig(config.personality_config);
        }
      }
    } catch (error) {
      console.error("Error loading personality config:", error);
    }
  };

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

  // Function to load live instructions from database
  const loadLiveInstructions = async () => {
    try {
      const response = await fetch('/api/agent-config?active=true');
      if (response.ok) {
        const config = await response.json();
        setLiveInstructions(config.instructions || "");
      }
    } catch (error) {
      console.error("Error loading live instructions:", error);
    }
  };

  // Function to generate complete personality instructions
  const generatePersonalityInstructions = (personality: any, agentConfig: any) => {
    const sections = [];
    
    // Add Personality & Tone section
    sections.push("# Personality & Tone");
    
    // Identity section
    sections.push("## Identity");
    if (personality.identity) {
      let identityText = `You are a ${personality.identity.toLowerCase()} who customers trust for quick, reliable help. You sound approachable and knowledgeable, like someone they've known for years.`;
      
      // Add name if available
      if (agentConfig?.name) {
        identityText += ` and your name is ${agentConfig.name}.`;
      }
      
      sections.push(identityText);
    } else {
      sections.push("*[Select an identity in Personality tab]*");
    }
    
    // Task section
    sections.push("## Task");
    if (personality.task) {
      sections.push(`Your job is to ${personality.task.toLowerCase()}. You ask simple, clear questions, guide them step by step, and provide solutions or escalate when necessary.`);
    } else {
      sections.push("*[Select a task in Personality tab]*");
    }
    
    // Demeanor section
    sections.push("## Demeanor");
    if (personality.demeanor) {
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
    } else {
      sections.push("*[Select a demeanor in Personality tab]*");
    }
    
    // Tone section
    sections.push("## Tone");
    if (personality.tone) {
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
    } else {
      sections.push("*[Select a tone in Personality tab]*");
    }
    
    // Enthusiasm section
    sections.push("## Level of Enthusiasm");
    if (personality.enthusiasm) {
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
    } else {
      sections.push("*[Select an enthusiasm level in Personality tab]*");
    }
    
    // Formality section
    sections.push("## Level of Formality");
    if (personality.formality) {
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
    } else {
      sections.push("*[Select a formality level in Personality tab]*");
    }
    
    // Emotion section
    sections.push("## Level of Emotion");
    if (personality.emotion) {
      const emotionText = personality.emotion.toLowerCase();
      if (emotionText.includes('compassionate and warm')) {
        sections.push("Compassionate and warm — you show genuine care and understanding in your responses.");
      } else if (emotionText.includes('neutral and professional')) {
        sections.push("Neutral and professional — you maintain a balanced, business-like approach.");
      } else if (emotionText.includes('enthusiastic and encouraging')) {
        sections.push("Enthusiastic and encouraging — you bring positive energy and motivation to interactions.");
      } else if (emotionText.includes('calm and reassuring')) {
        sections.push("Calm and reassuring — you provide a steady, comforting presence.");
      } else {
        sections.push(`${personality.emotion} — you express this level of emotion in your responses.`);
      }
    } else {
      sections.push("*[Select an emotion level in Personality tab]*");
    }
    
    // Filler Words section
    sections.push("## Filler Words");
    if (personality.fillerWords) {
      const fillerText = personality.fillerWords.toLowerCase();
      if (fillerText.includes('minimal use')) {
        sections.push("Minimal use of filler words — you speak clearly and directly without unnecessary pauses.");
      } else if (fillerText.includes('natural use')) {
        sections.push("Natural use of filler words — you speak conversationally with occasional 'um', 'uh', or 'you know'.");
      } else if (fillerText.includes('frequent use')) {
        sections.push("Frequent use of filler words — you speak naturally with common conversational fillers.");
      } else if (fillerText.includes('no filler words')) {
        sections.push("No filler words — you speak with complete clarity and precision.");
      } else {
        sections.push(`${personality.fillerWords} — you use filler words in this manner.`);
      }
    } else {
      sections.push("*[Select a filler word style in Personality tab]*");
    }
    
    // Pacing section
    sections.push("## Pacing");
    if (personality.pacing) {
      const pacingText = personality.pacing.toLowerCase();
      if (pacingText.includes('moderate pace')) {
        sections.push("Moderate pace — you speak at a comfortable speed that's easy to follow.");
      } else if (pacingText.includes('slow and deliberate')) {
        sections.push("Slow and deliberate — you take your time to ensure clarity and understanding.");
      } else if (pacingText.includes('quick and efficient')) {
        sections.push("Quick and efficient — you provide information rapidly while maintaining clarity.");
      } else if (pacingText.includes('varies based on context')) {
        sections.push("Varies based on context — you adjust your speaking pace based on the situation and user needs.");
      } else {
        sections.push(`${personality.pacing} — you maintain this speaking pace.`);
      }
    } else {
      sections.push("*[Select a pacing style in Personality tab]*");
    }
    
    // Other Details section
    sections.push("## Other Details");
    if (personality.otherDetails && personality.otherDetails.length > 0) {
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
    } else {
      sections.push("*[Select other details in Personality tab]*");
    }
    
    // Language section
    sections.push("## Language");
    if (personality.primaryLanguage || (personality.secondaryLanguages && personality.secondaryLanguages.length > 0)) {
      let languageText = "";
      if (personality.primaryLanguage) {
        languageText = `You speak ${personality.primaryLanguage} as your primary language`;
        
        if (personality.secondaryLanguages && personality.secondaryLanguages.length > 0) {
          const secondaryList = personality.secondaryLanguages.join(", ");
          languageText += `, and you can also speak ${secondaryList}`;
        }
        
        languageText += ". If the user wants to switch to another language you support, or you feel the user is not comfortable speaking the language you talk with, you can switch to their preferred language.";
      }
      
      if (languageText) {
        sections.push(languageText);
      } else {
        sections.push("*[Select languages in Personality tab]*");
      }
    } else {
      sections.push("*[Select languages in Personality tab]*");
    }
    
    // Instructions section
    sections.push("\n# Instructions");
    if (personality.instructions && personality.instructions.length > 0) {
      personality.instructions.forEach((instruction: string) => {
        sections.push(`- ${instruction}`);
      });
    } else {
      sections.push("*[Add instructions in Personality tab]*");
    }
    
    return sections.join("\n\n");
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
        
        // Generate complete personality instructions
        const personalityInstructions = generatePersonalityInstructions(personality, agentConfig);
        
        // Update existing configuration with personality, languages, and instructions
        console.log('🔧 Saving updated instructions to database:', {
          id: configId,
          personality_config: personality,
          primary_language: personality.primaryLanguage,
          secondary_languages: personality.secondaryLanguages,
          instructions: personalityInstructions.substring(0, 200) + '...' // Log first 200 chars
        });
        
        const updateResponse = await fetch('/api/agent-config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: configId,
            personality_config: personality,
            primary_language: personality.primaryLanguage || '',
            secondary_languages: personality.secondaryLanguages || [],
            instructions: personalityInstructions,
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
        
        // Update live instructions with the saved content
        setLiveInstructions(savedConfig.instructions || "");
      }
    } catch (error) {
      console.error("❌ Error saving personality configuration:", error);
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
          onSavePersonality={handleSavePersonality}
          personalityConfig={personalityConfig}
        />
      </div>
    </div>
  );
};

export default CallInterface;
