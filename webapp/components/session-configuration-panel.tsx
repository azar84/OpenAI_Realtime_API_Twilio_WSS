import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [name, setName] = useState("Default Assistant");
  const [instructions, setInstructions] = useState(
    "You are a helpful assistant in a phone call."
  );
  const [model, setModel] = useState("gpt-realtime");
  const [voice, setVoice] = useState("ash");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [turnDetectionType, setTurnDetectionType] = useState("server_vad");
  const [turnDetectionThreshold, setTurnDetectionThreshold] = useState(0.5);
  const [turnDetectionPrefixPadding, setTurnDetectionPrefixPadding] = useState(300);
  const [turnDetectionSilenceDuration, setTurnDetectionSilenceDuration] = useState(200);
  const [tools, setTools] = useState<string[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState<string>("");
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>([]);
  const [personalityConfig, setPersonalityConfig] = useState<any>(null);
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
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);
  const baseInstructionsRef = useRef<string>("");

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
          console.log("🔍 Language data from API:", {
            primary: config.primary_language,
            secondary: config.secondary_languages
          });
          
          setName(config.name || "Default Assistant");
          
          // Store the base instructions (without name prefix and language block)
          let baseInstructions = config.instructions || "You are a helpful assistant in a phone call.";
          // Remove all name prefixes
          baseInstructions = baseInstructions.replace(/^Your name is [^.]*\.\s*\n\s*/gm, '');
          // Remove language block
          baseInstructions = stripLanguageInstruction(baseInstructions).trim();
          baseInstructionsRef.current = baseInstructions;
          
          setInstructions(config.instructions || "You are a helpful assistant in a phone call.");
          setModel(config.model || "gpt-realtime");
          setVoice(config.voice || "ash");
          // Clamp temperature to [0.0, 1.0]
          const t = typeof config.temperature === 'number' ? config.temperature : 0.7;
          setTemperature(Math.max(0, Math.min(1, t)));
          setMaxTokens(config.max_tokens || 4096);
          setTurnDetectionType(config.turn_detection_type || "server_vad");
          setTurnDetectionThreshold(config.turn_detection_threshold || 0.5);
          setTurnDetectionPrefixPadding(config.turn_detection_prefix_padding_ms || 300);
          setTurnDetectionSilenceDuration(config.turn_detection_silence_duration_ms || 200);
          
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
          
          // Load selected languages from database
          console.log('📥 Loading languages from database:', { 
            primary: config.primary_language, 
            secondary: config.secondary_languages 
          });
          const primaryLang = config.primary_language || "";
          const secondaryLangs = config.secondary_languages || [];
          console.log('📥 Setting state with:', { primaryLang, secondaryLangs });
          
          // Set languages immediately
          console.log('📥 About to set languages:', { primaryLang, secondaryLangs });
          setPrimaryLanguage(primaryLang);
          setSecondaryLanguages(secondaryLangs);
          console.log('📥 Languages set, checking state...');
          
          // Debug: Check state after a short delay
          setTimeout(() => {
            console.log('📥 State after 100ms delay:', { 
              primaryLanguage, 
              secondaryLanguages 
            });
          }, 100);
          
          // Debug: Check state after a longer delay
          setTimeout(() => {
            console.log('📥 State after 500ms delay:', { 
              primaryLanguage, 
              secondaryLanguages 
            });
          }, 500);
          
          // Load personality config
          if (config.personality_config) {
            setPersonalityConfig(config.personality_config);
          }
          
          setHasUnsavedChanges(false);
          setHasLoadedInitially(true);
        } else {
          console.log("No active configuration found, using defaults");
          setHasLoadedInitially(true);
        }
      } catch (error) {
        console.error("❌ Error loading configuration:", error);
        setHasLoadedInitially(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  // Track changes to determine if there are unsaved modifications
  // Only set unsaved changes if we're not in the initial loading phase
  useEffect(() => {
    if (hasLoadedInitially) {
      setHasUnsavedChanges(true);
    }
  }, [voice, tools, primaryLanguage, secondaryLanguages, hasLoadedInitially]); // Removed instructions to avoid circular dependency

  // Update instructions immediately when name changes
  useEffect(() => {
    if (hasLoadedInitially) {
      updateInstructionsWithNameAndLanguages();
    }
  }, [name, hasLoadedInitially]);

  // Update instructions when languages change (separate effect to avoid circular dependency)
  useEffect(() => {
    if (hasLoadedInitially) {
      updateInstructionsWithNameAndLanguages();
    }
  }, [primaryLanguage, secondaryLanguages, hasLoadedInitially]);

  // Force re-render when baseInstructionsRef changes to update preview
  const [previewKey, setPreviewKey] = useState(0);
  useEffect(() => {
    setPreviewKey(prev => prev + 1);
  }, [baseInstructionsRef.current]);

  // Force re-render when languages change to ensure UI updates
  const [languageKey, setLanguageKey] = useState(0);
  useEffect(() => {
    setLanguageKey(prev => prev + 1);
  }, [primaryLanguage, secondaryLanguages]);

  const updateInstructionsWithNameAndLanguages = () => {
    // Use the stored base instructions
    let baseInstructions = baseInstructionsRef.current;
    
    // Add name prefix if name is provided
    if (name && name.trim()) {
      baseInstructions = `Your name is ${name}.\n\n${baseInstructions}`;
    }
    
    // Add language block
    const languageBlock = buildLanguageInstruction(primaryLanguage, secondaryLanguages);
    const finalInstructions = languageBlock
      ? `${baseInstructions}\n\n${languageBlock}`
      : baseInstructions;
    
    // Update the instructions field with complete instructions
    setInstructions(finalInstructions);
  };

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
      console.log('💾 Saving with languages:', { primary: primaryLanguage, secondary: secondaryLanguages });
      const saveData = {
        name,
        instructions, // Instructions already contain the final content
        model,
        voice,
        temperature,
        max_tokens: maxTokens,
        turn_detection_type: turnDetectionType,
        turn_detection_threshold: turnDetectionThreshold,
        turn_detection_prefix_padding_ms: turnDetectionPrefixPadding,
        turn_detection_silence_duration_ms: turnDetectionSilenceDuration,
        tools: tools.map((tool) => JSON.parse(tool)),
        primary_language: primaryLanguage,
        secondary_languages: secondaryLanguages,
      };
      console.log('💾 Full save data:', saveData);
      await onSave(saveData);
      
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
    } catch (error) {
      setSaveStatus("error");
    }
  };

  // Language options
  const LANGUAGE_OPTIONS: string[] = [
    "English (US, UK, AU, CA varieties)",
    "Spanish (Latin American & European)",
    "French (France & Canadian French)",
    "German",
    "Portuguese (Brazilian & European)",
    "Italian",
    "Mandarin Chinese (Simplified, with strong support)",
    "Japanese",
    "Korean",
    "Arabic (Modern Standard + regional variants reasonably supported)",
  ];

  const toggleSecondaryLanguage = (lang: string, checked: boolean | string) => {
    const isChecked = checked === true;
    console.log('🔄 Toggling secondary language:', { lang, isChecked, currentSecondary: secondaryLanguages });
    setSecondaryLanguages((prev) => {
      const newSelection = isChecked
        ? (prev.includes(lang) ? prev : [...prev, lang])
        : prev.filter((l) => l !== lang);
      console.log('🔄 New secondary language selection:', newSelection);
      return newSelection;
    });
  };

  const buildLanguageInstruction = (primary: string, secondary: string[]): string => {
    if (!primary) return "";
    if (!secondary || secondary.length === 0) {
      return `You speak ${primary}. You will use it as your primary language. If the user prefers a different supported language, you can switch accordingly.`;
    }
    const othersList = secondary.join(", ");
    return `You speak ${primary} which you will use as your primary language. You can also speak ${othersList}. If the user wants to switch to another supported language, or you feel the user is not comfortable with the current language, you should switch accordingly.`;
  };

  const generatePersonalityPreview = useMemo(() => {
    console.log('🎭 generatePersonalityPreview called with:', { 
      primaryLanguage, 
      secondaryLanguages, 
      name,
      personalityConfig: !!personalityConfig 
    });
    
    const sections = [];
    
    // Add Personality & Tone section
    sections.push("# Personality & Tone");
    
    if (!personalityConfig) {
      sections.push("\n*[No personality configuration set. Configure personality in the Personality tab.]*");
    } else {
      // Identity section
      sections.push("\n## Identity");
      if (personalityConfig.identity) {
        let identityText = `You are a ${personalityConfig.identity.toLowerCase()} who customers trust for quick, reliable help. You sound approachable and knowledgeable, like someone they've known for years.`;
        
        // Add name if available
        if (name) {
          identityText += ` and your name is ${name}.`;
        }
        
        sections.push(identityText);
      } else {
        sections.push("*[Select an identity in Personality tab]*");
      }
      
      // Task section
      sections.push("\n## Task");
      if (personalityConfig.task) {
        sections.push(`Your job is to ${personalityConfig.task.toLowerCase()}. You ask simple, clear questions, guide them step by step, and provide solutions or escalate when necessary.`);
      } else {
        sections.push("*[Select a task in Personality tab]*");
      }
      
      // Demeanor section
      sections.push("\n## Demeanor");
      if (personalityConfig.demeanor) {
        const demeanorText = personalityConfig.demeanor.toLowerCase();
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
          sections.push(`${personalityConfig.demeanor} — you approach each interaction with this mindset.`);
        }
      } else {
        sections.push("*[Select a demeanor in Personality tab]*");
      }
      
      // Tone section
      sections.push("\n## Tone");
      if (personalityConfig.tone) {
        const toneText = personalityConfig.tone.toLowerCase();
        if (toneText.includes('warm and conversational')) {
          sections.push("Warm and conversational, with a natural flow to your speech.");
        } else if (toneText.includes('polite and authoritative')) {
          sections.push("Polite and authoritative — you speak with confidence while maintaining respect.");
        } else if (toneText.includes('casual and relaxed')) {
          sections.push("Casual and relaxed — you speak naturally, like talking to a friend.");
        } else if (toneText.includes('formal and precise')) {
          sections.push("Formal and precise — you choose your words carefully and speak with clarity.");
        } else {
          sections.push(`${personalityConfig.tone} — you communicate with this voice style.`);
        }
      } else {
        sections.push("*[Select a tone in Personality tab]*");
      }
      
      // Enthusiasm section
      sections.push("\n## Level of Enthusiasm");
      if (personalityConfig.enthusiasm) {
        const enthusiasmText = personalityConfig.enthusiasm.toLowerCase();
        if (enthusiasmText.includes('engaged but measured')) {
          sections.push("Engaged but measured — you sound attentive and interested, without going over the top.");
        } else if (enthusiasmText.includes('highly enthusiastic')) {
          sections.push("Highly enthusiastic — you bring energy and excitement to every interaction.");
        } else if (enthusiasmText.includes('energetic')) {
          sections.push("Energetic — you maintain a lively, dynamic presence throughout the conversation.");
        } else if (enthusiasmText.includes('neutral interest')) {
          sections.push("Neutral interest — you remain professional and attentive without excessive excitement.");
        } else {
          sections.push(`${personalityConfig.enthusiasm} — you express this level of enthusiasm in your responses.`);
        }
      } else {
        sections.push("*[Select an enthusiasm level in Personality tab]*");
      }
      
      // Formality section
      sections.push("\n## Level of Formality");
      if (personalityConfig.formality) {
        const formalityText = personalityConfig.formality.toLowerCase();
        if (formalityText.includes('relaxed professional')) {
          sections.push("Relaxed professional — polite, clear, and respectful, but not overly stiff.");
        } else if (formalityText.includes('very casual')) {
          sections.push("Very casual — you speak like a friend, using informal language and expressions.");
        } else if (formalityText.includes('highly formal')) {
          sections.push("Highly formal — you maintain a very structured, professional communication style.");
        } else if (formalityText.includes('neutral professional')) {
          sections.push("Neutral professional — you balance friendliness with professional standards.");
        } else {
          sections.push(`${personalityConfig.formality} — you maintain this level of formality.`);
        }
      } else {
        sections.push("*[Select a formality level in Personality tab]*");
      }
      
      // Emotion section
      sections.push("\n## Level of Emotion");
      if (personalityConfig.emotion) {
        const emotionText = personalityConfig.emotion.toLowerCase();
        if (emotionText.includes('compassionate and warm')) {
          sections.push("Compassionate and warm — you acknowledge pain points and offer encouragement.");
        } else if (emotionText.includes('very expressive')) {
          sections.push("Very expressive — you show your emotions clearly and animatedly.");
        } else if (emotionText.includes('encouraging and supportive')) {
          sections.push("Encouraging and supportive — you focus on building the user's confidence.");
        } else if (emotionText.includes('neutral, matter-of-fact')) {
          sections.push("Neutral, matter-of-fact — you present information clearly without emotional coloring.");
        } else {
          sections.push(`${personalityConfig.emotion} — you express this level of emotion in your communication.`);
        }
      } else {
        sections.push("*[Select an emotion level in Personality tab]*");
      }
      
      // Filler Words section
      sections.push("\n## Filler Words");
      if (personalityConfig.fillerWords) {
        const fillerText = personalityConfig.fillerWords.toLowerCase();
        if (fillerText.includes('occasionally')) {
          sections.push("Occasionally use natural fillers (\"hm,\" \"uh\") to sound more human, but not excessively.");
        } else if (fillerText.includes('none')) {
          sections.push("Avoid filler words — speak clearly and directly without unnecessary sounds.");
        } else if (fillerText.includes('often')) {
          sections.push("Use filler words frequently — this makes you sound more natural and conversational.");
        } else if (fillerText.includes('rare')) {
          sections.push("Use filler words rarely — only when it feels natural, like \"hm\" when thinking.");
        } else {
          sections.push(`${personalityConfig.fillerWords} — you use this approach to filler words in your speech.`);
        }
      } else {
        sections.push("*[Select a filler word style in Personality tab]*");
      }
      
      // Pacing section
      sections.push("\n## Pacing");
      if (personalityConfig.pacing) {
        const pacingText = personalityConfig.pacing.toLowerCase();
        if (pacingText.includes('medium steady')) {
          sections.push("Medium steady — keep a normal conversation rhythm, neither rushed nor too slow.");
        } else if (pacingText.includes('very fast')) {
          sections.push("Very fast and energetic — you speak quickly with high energy.");
        } else if (pacingText.includes('slow and deliberate')) {
          sections.push("Slow and deliberate — you take your time to ensure clarity and understanding.");
        } else if (pacingText.includes('variable')) {
          sections.push("Variable — you adjust your pace based on the situation, faster when excited, slower when serious.");
        } else {
          sections.push(`${personalityConfig.pacing} — you speak with this pacing style.`);
        }
      } else {
        sections.push("*[Select a pacing style in Personality tab]*");
      }
      
      // Other Details section
      sections.push("\n## Other Details");
      if (personalityConfig.otherDetails && personalityConfig.otherDetails.length > 0) {
        const details = personalityConfig.otherDetails.map((detail: string) => {
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
      sections.push("\n## Language");
      console.log('🎭 Language section - checking values:', { 
        primaryLanguage, 
        secondaryLanguages, 
        hasPrimary: !!primaryLanguage,
        hasSecondary: !!(secondaryLanguages && secondaryLanguages.length > 0)
      });
      
      if (primaryLanguage || (secondaryLanguages && secondaryLanguages.length > 0)) {
        let languageText = "";
        if (primaryLanguage) {
          languageText = `You speak ${primaryLanguage} as your primary language`;
          
          if (secondaryLanguages && secondaryLanguages.length > 0) {
            const secondaryList = secondaryLanguages.join(", ");
            languageText += `, and you can also speak ${secondaryList}`;
          }
          
          languageText += ". If the user wants to switch to another language you support, or you feel the user is not comfortable speaking the language you talk with, you can switch to their preferred language.";
        }
        
        console.log('🎭 Generated language text:', languageText);
        
        if (languageText) {
          sections.push(languageText);
        } else {
          sections.push("*[Configure languages above]*");
        }
      } else {
        console.log('🎭 No languages found, showing placeholder');
        sections.push("*[Configure languages above]*");
      }
    }
    
    // Instructions section
    sections.push("\n# Instructions");
    if (baseInstructionsRef.current && baseInstructionsRef.current.trim()) {
      sections.push(baseInstructionsRef.current);
    } else {
      sections.push("*[Enter your main instructions below]*");
    }
    
    const result = sections.join("\n");
    console.log('🎭 Final preview result:', result.substring(0, 500) + '...');
    return result;
  }, [personalityConfig, primaryLanguage, secondaryLanguages, name, baseInstructionsRef.current]);


  // Remove any previously appended language paragraph starting with "You speak"
  const stripLanguageInstruction = (text: string): string => {
    if (!text) return text;
    const pattern = /\n\nYou speak[\s\S]*$/i;
    return text.replace(pattern, "");
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
    <Card className="flex flex-col h-full w-full mx-auto min-h-0">
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
      <CardContent className="flex-1 p-3 sm:p-5 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-gray-600">Loading configuration...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 m-1 pb-8">
            {/* Personality Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                🎭 Personality & Tone Preview
              </label>
              <div className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap border max-h-96 overflow-y-auto" key={previewKey}>
                <div className="prose prose-sm max-w-none">
                  {(() => {
                    const preview = generatePersonalityPreview;
                    console.log('🎭 Rendering preview in UI:', preview.substring(0, 200) + '...');
                    return preview;
                  })()}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                This preview shows how your personality configuration will appear in the agent's instructions. 
                Configure personality settings in the Personality tab.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Instructions
              </label>
              <Textarea
                placeholder="Enter your main instructions here"
                className="min-h-[200px] resize-y"
                value={baseInstructionsRef.current || ""}
                onChange={(e) => {
                  const newBaseInstructions = e.target.value;
                  baseInstructionsRef.current = newBaseInstructions;
                  
                  // Update the full instructions with name and language
                  updateInstructionsWithNameAndLanguages();
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Agent Name</label>
              <Input
                placeholder="Enter agent name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "gpt-4o-realtime-preview",
                    "gpt-realtime-2025-08-28", 
                    "gpt-realtime",
                    "gpt-4o-realtime-preview-2025-06-03",
                    "gpt-4o-realtime-preview-2024-12-17",
                    "gpt-4o-realtime-preview-2024-10-01",
                    "gpt-4o-mini-realtime-preview-2024-12-17",
                    "gpt-4o-mini-realtime-preview"
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Voice</label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {["alloy", "ash", "ballad", "cedar", "coral", "echo", "marin", "sage", "shimmer", "verse"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium leading-none">Languages</label>
              
              {/* Primary Language Selection */}
              <div className="space-y-2" key={`primary-${languageKey}`}>
                <label className="text-xs font-medium text-gray-600">Primary Language</label>
                <div className="text-xs text-gray-500">Debug: primaryLanguage = "{primaryLanguage}" (length: {primaryLanguage.length})</div>
                <div className="text-xs text-gray-500">Debug: hasLoadedInitially = {hasLoadedInitially.toString()}</div>
                <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Secondary Languages Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Secondary Languages (Optional)</label>
                <div className="text-xs text-gray-500">Debug: secondaryLanguages = {JSON.stringify(secondaryLanguages)} (length: {secondaryLanguages.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <div key={lang} className="flex items-center space-x-2">
                      <Checkbox
                        id={`secondary-${lang}`}
                        checked={secondaryLanguages.includes(lang)}
                        onCheckedChange={(checked) => toggleSecondaryLanguage(lang, checked)}
                        disabled={lang === primaryLanguage}
                      />
                      <Label htmlFor={`secondary-${lang}`} className="text-sm">
                        {lang}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Language Summary */}
              {(primaryLanguage || secondaryLanguages.length > 0) && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Language Configuration:</strong><br/>
                  {primaryLanguage && (
                    <>Primary: {primaryLanguage}<br/></>
                  )}
                  {secondaryLanguages.length > 0 && (
                    <>Secondary: {secondaryLanguages.join(", ")}</>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Temperature</label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  placeholder="0.7"
                  value={temperature}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    const safe = Number.isNaN(raw) ? 0.7 : raw;
                    const clamped = Math.max(0, Math.min(1, safe));
                    setTemperature(clamped);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Max Tokens</label>
                <Input
                  type="number"
                  min="1"
                  max="8192"
                  placeholder="4096"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Turn Detection</label>
              <Select value={turnDetectionType} onValueChange={setTurnDetectionType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select turn detection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Manual)</SelectItem>
                  <SelectItem value="server_vad">Server VAD (Silence-based)</SelectItem>
                  <SelectItem value="semantic_vad">Semantic VAD (Model-based)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {turnDetectionType === "server_vad" && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Threshold (0-1)</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    placeholder="0.5"
                    value={turnDetectionThreshold}
                    onChange={(e) => setTurnDetectionThreshold(parseFloat(e.target.value) || 0.5)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Prefix Padding (ms)</label>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      placeholder="300"
                      value={turnDetectionPrefixPadding}
                      onChange={(e) => setTurnDetectionPrefixPadding(parseInt(e.target.value) || 300)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Silence Duration (ms)</label>
                    <Input
                      type="number"
                      min="0"
                      max="2000"
                      placeholder="200"
                      value={turnDetectionSilenceDuration}
                      onChange={(e) => setTurnDetectionSilenceDuration(parseInt(e.target.value) || 200)}
                    />
                  </div>
                </div>
              </div>
            )}

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

          </div>
          )}
        </div>
        
        {/* Fixed Submit Button */}
        <div className="mt-4 pt-4 border-t border-gray-200 bg-white">
          <Button
            className="w-full"
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
