import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Check, X, Plus, Trash2, Edit, Save,
  User, Target, Heart, MessageSquare, Zap, Crown, 
  Brain, Clock, Volume2, MessageCircle, Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PersonalityConfig {
  identity: string;
  task: string;
  demeanor: string;
  tone: string;
  enthusiasm: string;
  formality: string;
  emotion: string;
  fillerWords: string;
  pacing: string;
  customItems: {
    identity: string[];
    task: string[];
    demeanor: string[];
    tone: string[];
    enthusiasm: string[];
    formality: string[];
    emotion: string[];
    fillerWords: string[];
    pacing: string[];
  };
  // Language settings
  primaryLanguage: string;
  secondaryLanguages: string[];
  // Instructions
  instructions: string[];
}

interface PersonalityConfigPanelProps {
  onSave: (config: PersonalityConfig) => void;
  initialConfig?: PersonalityConfig;
}

const PERSONALITY_OPTIONS = {
  identity: [
    "Friendly neighborhood shop assistant",
    "Professional customer service rep with 10 years of telco experience",
    "Cheerful teacher who loves explaining step by step",
    "Serious financial advisor focused on accuracy",
    "Calm healthcare information assistant",
    "Upbeat travel concierge who's excited about destinations",
    "Polite government services clerk",
    "Empathetic mental health check-in coach",
    "Casual gamer buddy who explains things in simple terms",
    "High-energy radio host guiding a call-in game"
  ],
  task: [
    "Help users troubleshoot internet service",
    "Guide small businesses through tax filing questions",
    "Teach basic conversational French",
    "Help parents manage childcare schedules",
    "Explain how to set up smart home devices",
    "Assist users with online shopping and returns",
    "Walk new employees through HR onboarding",
    "Provide IT helpdesk support for software issues",
    "Guide callers through booking travel or hotels",
    "Serve as a career coach for interview practice"
  ],
  demeanor: [
    "Patient",
    "Upbeat",
    "Serious",
    "Empathetic",
    "Optimistic",
    "Calm",
    "Neutral and professional",
    "Cheerful and lighthearted",
    "Supportive and encouraging",
    "Focused and no-nonsense"
  ],
  tone: [
    "Warm and conversational",
    "Polite and authoritative",
    "Casual and relaxed",
    "Formal and precise",
    "Energetic and friendly",
    "Neutral and balanced",
    "Soft and empathetic",
    "Confident and persuasive",
    "Light and playful",
    "Reserved and serious"
  ],
  enthusiasm: [
    "Highly enthusiastic",
    "Energetic",
    "Engaged but measured",
    "Neutral interest",
    "Calm enthusiasm",
    "Slightly upbeat",
    "Flat/neutral",
    "Reserved but polite",
    "Warm but not excitable",
    "Very low-energy, monotone"
  ],
  formality: [
    "Very casual (\"Hey, what's up?\")",
    "Casual conversational (\"Hi there, how's it going?\")",
    "Relaxed professional (\"Hello, happy to help!\")",
    "Neutral professional (\"Good morning, how can I assist you?\")",
    "Polite formal (\"Good afternoon, thank you for contacting support.\")",
    "Highly formal (\"Greetings. How may I be of service today?\")",
    "Scripted call-center style (\"Thank you for calling {brand}, how can I help?\")",
    "Friendly peer-to-peer (\"Hey friend, let's sort this out.\")",
    "Semi-casual corporate (\"Hi, thanks for reaching out to us.\")",
    "Academic/lecture style (\"Today we'll review the following steps carefully.\")"
  ],
  emotion: [
    "Very expressive, animated",
    "Compassionate and warm",
    "Encouraging and supportive",
    "Sympathetic and reassuring",
    "Neutral, matter-of-fact",
    "Cool and detached",
    "Serious and somber",
    "Enthusiastic and bright",
    "Gentle and kind",
    "Playful and joking"
  ],
  fillerWords: [
    "None (robotic, clean output)",
    "Rare (\"hm,\" once every few turns)",
    "Occasionally (\"uh,\" \"hm\" here and there)",
    "Light casual (\"you know,\" \"like\" once in a while)",
    "Often (a filler in most turns)",
    "Very often (almost every sentence has one)",
    "\"um\" only",
    "\"uh\" only",
    "\"hm\" only",
    "Mix of \"um/uh/hm/you know\""
  ],
  pacing: [
    "Very fast and energetic",
    "Fast but clear",
    "Medium steady (normal conversation speed)",
    "Slow and deliberate",
    "Very slow and thoughtful",
    "Variable — fast when excited, slow when serious",
    "Brisk, clipped sentences",
    "Laid-back, with longer pauses",
    "Slightly rushed, eager",
    "Relaxed, calm rhythm"
  ]
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

export function PersonalityConfigPanel({ onSave, initialConfig }: PersonalityConfigPanelProps) {
  const [config, setConfig] = useState<PersonalityConfig>({
    identity: "",
    task: "",
    demeanor: "",
    tone: "",
    enthusiasm: "",
    formality: "",
    emotion: "",
    fillerWords: "",
    pacing: "",
    customItems: {
      identity: [],
      task: [],
      demeanor: [],
      tone: [],
      enthusiasm: [],
      formality: [],
      emotion: [],
      fillerWords: [],
      pacing: []
    },
    primaryLanguage: "",
    secondaryLanguages: [],
    instructions: []
  });

  const [preview, setPreview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    dimension: keyof typeof config.customItems;
    option: string;
    isDefault: boolean;
  } | null>(null);

  // Manage options dialog state
  const [showManageOptions, setShowManageOptions] = useState<{
    dimension: keyof typeof config.customItems;
    options: string[];
    filteredDefaultOptions: string[];
    label: string;
  } | null>(null);
  
  // Editing state
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [newOptionValue, setNewOptionValue] = useState<string>("");

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    generatePreview();
  }, [config]);

  // Auto-save when customItems change (but not on initial load)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    
    // Auto-save after a short delay to avoid too many saves
    const timeoutId = setTimeout(() => {
      onSave(config);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [config.customItems, onSave, config, isInitialLoad]);

  const generatePreview = () => {
    const sections = [];
    
    // Add Personality & Tone section
    sections.push("# Personality & Tone");
    
    // Identity section
    sections.push("## Identity");
    if (config.identity) {
      sections.push(`You are a ${config.identity.toLowerCase()} who customers trust for quick, reliable help. You sound approachable and knowledgeable, like someone they've known for years.`);
    } else {
      sections.push("*[Select an identity above]*");
    }
    
    // Task section
    sections.push("\n## Task");
    if (config.task) {
      sections.push(`Your job is to ${config.task.toLowerCase()}. You ask simple, clear questions, guide them step by step, and provide solutions or escalate when necessary.`);
    } else {
      sections.push("*[Select a task above]*");
    }
    
    // Demeanor section
    sections.push("\n## Demeanor");
    if (config.demeanor) {
      const demeanorText = config.demeanor.toLowerCase();
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
        sections.push(`${config.demeanor} — you approach each interaction with this mindset.`);
      }
    } else {
      sections.push("*[Select a demeanor above]*");
    }
    
    // Tone section
    sections.push("\n## Tone");
    if (config.tone) {
      const toneText = config.tone.toLowerCase();
      if (toneText.includes('warm and conversational')) {
        sections.push("Warm and conversational, with a natural flow to your speech.");
      } else if (toneText.includes('polite and authoritative')) {
        sections.push("Polite and authoritative — you speak with confidence while maintaining respect.");
      } else if (toneText.includes('casual and relaxed')) {
        sections.push("Casual and relaxed — you speak naturally, like talking to a friend.");
      } else if (toneText.includes('formal and precise')) {
        sections.push("Formal and precise — you choose your words carefully and speak with clarity.");
      } else {
        sections.push(`${config.tone} — you communicate with this voice style.`);
      }
    } else {
      sections.push("*[Select a tone above]*");
    }
    
    // Enthusiasm section
    sections.push("\n## Level of Enthusiasm");
    if (config.enthusiasm) {
      const enthusiasmText = config.enthusiasm.toLowerCase();
      if (enthusiasmText.includes('engaged but measured')) {
        sections.push("Engaged but measured — you sound attentive and interested, without going over the top.");
      } else if (enthusiasmText.includes('highly enthusiastic')) {
        sections.push("Highly enthusiastic — you bring energy and excitement to every interaction.");
      } else if (enthusiasmText.includes('energetic')) {
        sections.push("Energetic — you maintain a lively, dynamic presence throughout the conversation.");
      } else if (enthusiasmText.includes('neutral interest')) {
        sections.push("Neutral interest — you remain professional and attentive without excessive excitement.");
      } else {
        sections.push(`${config.enthusiasm} — you express this level of enthusiasm in your responses.`);
      }
    } else {
      sections.push("*[Select an enthusiasm level above]*");
    }
    
    // Formality section
    sections.push("\n## Level of Formality");
    if (config.formality) {
      const formalityText = config.formality.toLowerCase();
      if (formalityText.includes('relaxed professional')) {
        sections.push("Relaxed professional — polite, clear, and respectful, but not overly stiff.");
      } else if (formalityText.includes('very casual')) {
        sections.push("Very casual — you speak like a friend, using informal language and expressions.");
      } else if (formalityText.includes('highly formal')) {
        sections.push("Highly formal — you maintain a very structured, professional communication style.");
      } else if (formalityText.includes('neutral professional')) {
        sections.push("Neutral professional — you balance friendliness with professional standards.");
      } else {
        sections.push(`${config.formality} — you maintain this level of formality.`);
      }
    } else {
      sections.push("*[Select a formality level above]*");
    }
    
    // Emotion section
    sections.push("\n## Level of Emotion");
    if (config.emotion) {
      const emotionText = config.emotion.toLowerCase();
      if (emotionText.includes('compassionate and warm')) {
        sections.push("Compassionate and warm — you acknowledge pain points and offer encouragement.");
      } else if (emotionText.includes('very expressive')) {
        sections.push("Very expressive — you show your emotions clearly and animatedly.");
      } else if (emotionText.includes('encouraging and supportive')) {
        sections.push("Encouraging and supportive — you focus on building the user's confidence.");
      } else if (emotionText.includes('neutral, matter-of-fact')) {
        sections.push("Neutral, matter-of-fact — you present information clearly without emotional coloring.");
      } else {
        sections.push(`${config.emotion} — you express this level of emotion in your communication.`);
      }
    } else {
      sections.push("*[Select an emotion level above]*");
    }
    
    // Filler Words section
    sections.push("\n## Filler Words");
    if (config.fillerWords) {
      const fillerText = config.fillerWords.toLowerCase();
      if (fillerText.includes('occasionally')) {
        sections.push("Occasionally use natural fillers (\"hm,\" \"uh\") to sound more human, but not excessively.");
      } else if (fillerText.includes('none')) {
        sections.push("Avoid filler words — speak clearly and directly without unnecessary sounds.");
      } else if (fillerText.includes('often')) {
        sections.push("Use filler words frequently — this makes you sound more natural and conversational.");
      } else if (fillerText.includes('rare')) {
        sections.push("Use filler words rarely — only when it feels natural, like \"hm\" when thinking.");
      } else {
        sections.push(`${config.fillerWords} — you use this approach to filler words in your speech.`);
      }
    } else {
      sections.push("*[Select a filler word style above]*");
    }
    
    // Pacing section
    sections.push("\n## Pacing");
    if (config.pacing) {
      const pacingText = config.pacing.toLowerCase();
      if (pacingText.includes('medium steady')) {
        sections.push("Medium steady — keep a normal conversation rhythm, neither rushed nor too slow.");
      } else if (pacingText.includes('very fast')) {
        sections.push("Very fast and energetic — you speak quickly with high energy.");
      } else if (pacingText.includes('slow and deliberate')) {
        sections.push("Slow and deliberate — you take your time to ensure clarity and understanding.");
      } else if (pacingText.includes('variable')) {
        sections.push("Variable — you adjust your pace based on the situation, faster when excited, slower when serious.");
      } else {
        sections.push(`${config.pacing} — you speak with this pacing style.`);
      }
    } else {
      sections.push("*[Select a pacing style above]*");
    }
    
    
    // Language section
    sections.push("\n## Language");
    if (config.primaryLanguage || (config.secondaryLanguages && config.secondaryLanguages.length > 0)) {
      let languageText = "";
      if (config.primaryLanguage) {
        languageText = `You speak ${config.primaryLanguage} as your primary language`;
        
        if (config.secondaryLanguages && config.secondaryLanguages.length > 0) {
          const secondaryList = config.secondaryLanguages.join(", ");
          languageText += `, and you can also speak ${secondaryList}`;
        }
        
        languageText += ". If the user wants to switch to another language you support, or you feel the user is not comfortable speaking the language you talk with, you can switch to their preferred language.";
      }
      
      if (languageText) {
        sections.push(languageText);
      } else {
        sections.push("*[Select languages above]*");
      }
    } else {
      sections.push("*[Select languages above]*");
    }
    
    // Instructions section
    sections.push("\n# Instructions");
    if (config.instructions && config.instructions.length > 0) {
      config.instructions.forEach(instruction => {
        sections.push(`- ${instruction}`);
      });
    } else {
      sections.push("*[Add instructions above]*");
    }

    setPreview(sections.join("\n"));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    
    try {
      await onSave(config);
      setSaveStatus("success");
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving personality:", error);
      setSaveStatus("error");
      // Clear error message after 5 seconds
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomItem = (dimension: keyof typeof config.customItems, item: string) => {
    if (item.trim() && !config.customItems[dimension].includes(item.trim())) {
      setConfig(prev => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [dimension]: [...prev.customItems[dimension], item.trim()]
        }
      }));
    }
  };

  const removeCustomItem = (dimension: keyof typeof config.customItems, item: string) => {
    setConfig(prev => ({
      ...prev,
      customItems: {
        ...prev.customItems,
        [dimension]: prev.customItems[dimension].filter(d => d !== item)
      }
    }));
  };

  const confirmDeleteOption = (dimension: keyof typeof config.customItems, option: string, isDefaultOption: boolean) => {
    setDeleteTarget({ dimension, option, isDefault: isDefaultOption });
    setShowDeleteConfirm(true);
  };

  const executeDeleteOption = () => {
    if (!deleteTarget) return;
    
    const { dimension, option, isDefault } = deleteTarget;
    
    if (isDefault) {
      // For default options, we need to add them to a "removed" list or modify the PERSONALITY_OPTIONS
      // Since we can't modify the const, we'll track removed default options in customItems with a special prefix
      const removedKey = `__REMOVED__${option}`;
      setConfig(prev => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [dimension]: prev.customItems[dimension].includes(removedKey) 
            ? prev.customItems[dimension]
            : [...prev.customItems[dimension], removedKey]
        },
        // If this option was selected, clear the selection
        [dimension]: prev[dimension] === option ? "" : prev[dimension]
      }));
    } else {
      // For custom options, simply remove from the array
      removeCustomItem(dimension, option);
    }
    
    // Close dialog and reset state
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const startEditingOption = (option: string) => {
    setEditingOption(option);
    setEditingValue(option);
  };

  const saveEditedOption = () => {
    if (!editingOption || !showManageOptions || !editingValue.trim()) return;
    
    const { dimension } = showManageOptions;
    const isDefault = showManageOptions.filteredDefaultOptions.includes(editingOption);
    
    if (isDefault) {
      // For default options, we need to remove the old one and add the new one as custom
      const removedKey = `__REMOVED__${editingOption}`;
      setConfig(prev => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [dimension]: [
            ...prev.customItems[dimension].filter(item => item !== removedKey),
            removedKey,
            editingValue.trim()
          ]
        },
        // Update selection if this option was selected
        [dimension]: prev[dimension] === editingOption ? editingValue.trim() : prev[dimension]
      }));
    } else {
      // For custom options, replace in the array
      setConfig(prev => ({
        ...prev,
        customItems: {
          ...prev.customItems,
          [dimension]: prev.customItems[dimension].map(item => 
            item === editingOption ? editingValue.trim() : item
          )
        },
        // Update selection if this option was selected
        [dimension]: prev[dimension] === editingOption ? editingValue.trim() : prev[dimension]
      }));
    }
    
    setEditingOption(null);
    setEditingValue("");
  };

  const cancelEditingOption = () => {
    setEditingOption(null);
    setEditingValue("");
  };

  const addNewOption = () => {
    if (!showManageOptions || !newOptionValue.trim()) return;
    
    const { dimension } = showManageOptions;
    addCustomItem(dimension, newOptionValue.trim());
    setNewOptionValue("");
  };

  const renderDimensionField = (
    dimension: keyof Omit<PersonalityConfig, 'customItems' | 'primaryLanguage' | 'secondaryLanguages' | 'instructions'>,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    options: string[]
  ) => {
    const customItems = config.customItems[dimension as keyof typeof config.customItems] as string[];
    
    // Filter out removed default options and removed keys from custom items
    const removedDefaultOptions = customItems.filter(item => item.startsWith('__REMOVED__')).map(item => item.replace('__REMOVED__', ''));
    const filteredDefaultOptions = options.filter(option => !removedDefaultOptions.includes(option));
    const filteredCustomItems = customItems.filter(item => !item.startsWith('__REMOVED__'));
    
    const allOptions = [...filteredDefaultOptions, ...filteredCustomItems];
    
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-600" />
          {label}
        </label>
        <Select 
          value={typeof config[dimension] === 'string' ? config[dimension] : ""} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, [dimension]: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {allOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Manage all options button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManageOptions({ 
            dimension: dimension as keyof typeof config.customItems, 
            options: allOptions, 
            filteredDefaultOptions,
            label 
          })}
          className="text-xs"
        >
          Manage {label} ({allOptions.length})
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-gray-600" />
          Personality & Tone Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[800px] pr-4">
          <div className="space-y-6">
            
            {/* Identity */}
            {renderDimensionField('identity', 'Identity (who/what the agent is)', User, PERSONALITY_OPTIONS.identity)}

            {/* Task */}
            {renderDimensionField('task', 'Task (what the agent does)', Target, PERSONALITY_OPTIONS.task)}

            {/* Demeanor */}
            {renderDimensionField('demeanor', 'Demeanor (overall attitude)', Heart, PERSONALITY_OPTIONS.demeanor)}

            {/* Tone */}
            {renderDimensionField('tone', 'Tone (voice style)', MessageSquare, PERSONALITY_OPTIONS.tone)}

            {/* Enthusiasm */}
            {renderDimensionField('enthusiasm', 'Level of Enthusiasm', Zap, PERSONALITY_OPTIONS.enthusiasm)}

            {/* Formality */}
            {renderDimensionField('formality', 'Level of Formality', Crown, PERSONALITY_OPTIONS.formality)}

            {/* Emotion */}
            {renderDimensionField('emotion', 'Level of Emotion', Brain, PERSONALITY_OPTIONS.emotion)}

            {/* Filler Words */}
            {renderDimensionField('fillerWords', 'Filler Words', Volume2, PERSONALITY_OPTIONS.fillerWords)}

            {/* Pacing */}
            {renderDimensionField('pacing', 'Pacing', Clock, PERSONALITY_OPTIONS.pacing)}




            {/* Instructions */}
            <div className="space-y-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <Edit className="h-4 w-4 text-gray-600" />
                Instructions
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add instruction..."
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        setConfig(prev => ({
                          ...prev,
                          instructions: [...(prev.instructions || []), e.currentTarget.value.trim()]
                        }));
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        setConfig(prev => ({
                          ...prev,
                          instructions: [...(prev.instructions || []), input.value.trim()]
                        }));
                        input.value = '';
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Selected Instructions */}
                <div className="space-y-2">
                  {(config.instructions || []).map((instruction, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <span className="text-sm">•</span>
                      <span className="text-sm flex-1">{instruction}</span>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          instructions: (prev.instructions || []).filter((_, i) => i !== index)
                        }))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-gray-600" />
                Languages
              </label>
              
              {/* Primary Language Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Primary Language</label>
                <Select 
                  value={config.primaryLanguage} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, primaryLanguage: value }))}
                >
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <div key={lang} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`secondary-${lang}`}
                        checked={(config.secondaryLanguages || []).includes(lang)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setConfig(prev => ({
                            ...prev,
                            secondaryLanguages: isChecked
                              ? [...(prev.secondaryLanguages || []), lang]
                              : (prev.secondaryLanguages || []).filter(l => l !== lang)
                          }));
                        }}
                        disabled={lang === config.primaryLanguage}
                        className="rounded"
                      />
                      <label htmlFor={`secondary-${lang}`} className="text-sm cursor-pointer">
                        {lang}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="space-y-2">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Personality Configuration
                  </>
                )}
              </Button>
              
              {/* Status Messages */}
              {saveStatus === "success" && (
                <div className="text-green-600 text-sm text-center">
                  ✅ Personality configuration saved successfully!
                </div>
              )}
              {saveStatus === "error" && (
                <div className="text-red-600 text-sm text-center">
                  ❌ Failed to save personality configuration. Please try again.
                </div>
              )}
            </div>

            {/* Preview Section - Last in ScrollArea */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="space-y-4">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  Instructions Preview
                </label>
                <div className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap border max-h-64 overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    {preview || "Configure personality settings above to see preview..."}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  This preview shows how your personality configuration will appear in the agent's instructions. 
                  Configure personality settings and instructions above to see the complete output.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Option</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{deleteTarget?.option}"? 
            {deleteTarget?.isDefault 
              ? " This is a default option and will be permanently removed from your available choices."
              : " This custom option will be permanently deleted."
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={executeDeleteOption}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Manage Options Dialog */}
    <Dialog open={!!showManageOptions} onOpenChange={() => {
      setShowManageOptions(null);
      setEditingOption(null);
      setEditingValue("");
      setNewOptionValue("");
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage {showManageOptions?.label}</DialogTitle>
          <DialogDescription>
            Add new options, edit existing ones, or delete options you don't need.
          </DialogDescription>
        </DialogHeader>
        
        {/* Add new option */}
        <div className="border-b pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Add new ${showManageOptions?.label.toLowerCase()}...`}
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addNewOption();
                }
              }}
            />
            <Button
              size="sm"
              onClick={addNewOption}
              disabled={!newOptionValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Existing options */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {showManageOptions?.options.map((option) => (
            <div key={option} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
              {editingOption === option ? (
                // Edit mode
                <>
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        saveEditedOption();
                      } else if (e.key === 'Escape') {
                        cancelEditingOption();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveEditedOption}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    disabled={!editingValue.trim()}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditingOption}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                // View mode
                <>
                  <span className="text-sm flex-1">{option}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditingOption(option)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      confirmDeleteOption(
                        showManageOptions.dimension,
                        option,
                        showManageOptions.filteredDefaultOptions.includes(option)
                      );
                      setShowManageOptions(null);
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setShowManageOptions(null);
            setEditingOption(null);
            setEditingValue("");
            setNewOptionValue("");
          }}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
