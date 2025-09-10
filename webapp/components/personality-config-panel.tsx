import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Trash2 } from "lucide-react";

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
  otherDetails: string[];
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
    otherDetails: string[];
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
  ],
  otherDetails: [
    "Uses light humor/jokes when appropriate",
    "Adds cultural references (sports, movies, etc.)",
    "Speaks with regional accent (e.g., Quebecois French, Southern US)",
    "References brand values in responses",
    "Uses storytelling analogies to explain things",
    "Keeps answers under 20 seconds in speech",
    "Rephrases instructions in plain language",
    "Always checks for understanding before moving on",
    "Gives examples in responses (e.g., \"like when you…\")",
    "Avoids slang entirely"
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
    otherDetails: [],
    customItems: {
      identity: [],
      task: [],
      demeanor: [],
      tone: [],
      enthusiasm: [],
      formality: [],
      emotion: [],
      fillerWords: [],
      pacing: [],
      otherDetails: []
    },
    primaryLanguage: "",
    secondaryLanguages: [],
    instructions: []
  });

  const [preview, setPreview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    generatePreview();
  }, [config]);

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
    
    // Other Details section
    sections.push("\n## Other Details");
    if (config.otherDetails && config.otherDetails.length > 0) {
      const details = config.otherDetails.map((detail: string) => {
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
      sections.push("*[Select other details above]*");
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

  const toggleOtherDetail = (detail: string) => {
    setConfig(prev => ({
      ...prev,
      otherDetails: prev.otherDetails.includes(detail)
        ? prev.otherDetails.filter(d => d !== detail)
        : [...prev.otherDetails, detail]
    }));
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

  const addCustomDetail = (detail: string) => {
    if (detail.trim() && !config.otherDetails.includes(detail.trim())) {
      setConfig(prev => ({
        ...prev,
        otherDetails: [...prev.otherDetails, detail.trim()]
      }));
    }
  };

  const removeCustomDetail = (detail: string) => {
    setConfig(prev => ({
      ...prev,
      otherDetails: prev.otherDetails.filter(d => d !== detail)
    }));
  };

  const renderDimensionField = (
    dimension: keyof Omit<PersonalityConfig, 'otherDetails' | 'customItems'>,
    label: string,
    emoji: string,
    options: string[]
  ) => {
    const customItems = config.customItems[dimension as keyof typeof config.customItems] as string[];
    const allOptions = [...options, ...customItems];
    
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{emoji} {label}</label>
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
        
        {/* Custom Items for this dimension */}
        <div className="space-y-2">
          <label className="text-xs text-gray-600">Add custom {label.toLowerCase()}:</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Add custom ${label.toLowerCase()}...`}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem(dimension as keyof typeof config.customItems, e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <Button
              size="sm"
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addCustomItem(dimension as keyof typeof config.customItems, input.value);
                input.value = '';
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Selected Custom Items */}
          <div className="flex flex-wrap gap-2">
            {customItems.map((item) => (
              <Badge key={item} variant="secondary" className="flex items-center gap-1">
                {item}
                <button
                  onClick={() => removeCustomItem(dimension as keyof typeof config.customItems, item)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎭 Personality & Tone Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[800px] pr-4">
          <div className="space-y-6">
            
            {/* Identity */}
            {renderDimensionField('identity', 'Identity (who/what the agent is)', '🎭', PERSONALITY_OPTIONS.identity)}

            {/* Task */}
            {renderDimensionField('task', 'Task (what the agent does)', '🎯', PERSONALITY_OPTIONS.task)}

            {/* Demeanor */}
            {renderDimensionField('demeanor', 'Demeanor (overall attitude)', '🌱', PERSONALITY_OPTIONS.demeanor)}

            {/* Tone */}
            {renderDimensionField('tone', 'Tone (voice style)', '🗣', PERSONALITY_OPTIONS.tone)}

            {/* Enthusiasm */}
            {renderDimensionField('enthusiasm', 'Level of Enthusiasm', '🔥', PERSONALITY_OPTIONS.enthusiasm)}

            {/* Formality */}
            {renderDimensionField('formality', 'Level of Formality', '🎩', PERSONALITY_OPTIONS.formality)}

            {/* Emotion */}
            {renderDimensionField('emotion', 'Level of Emotion', '💓', PERSONALITY_OPTIONS.emotion)}

            {/* Filler Words */}
            {renderDimensionField('fillerWords', 'Filler Words', '🤔', PERSONALITY_OPTIONS.fillerWords)}

            {/* Pacing */}
            {renderDimensionField('pacing', 'Pacing', '⏱', PERSONALITY_OPTIONS.pacing)}

            {/* Other Details */}
            <div className="space-y-2">
              <label className="text-sm font-medium">📝 Other Details (select multiple)</label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {PERSONALITY_OPTIONS.otherDetails.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={option}
                      checked={config.otherDetails.includes(option)}
                      onChange={() => toggleOtherDetail(option)}
                      className="rounded"
                    />
                    <label htmlFor={option} className="text-sm cursor-pointer">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              
              {/* Custom Details */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Details</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom detail..."
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCustomDetail(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addCustomDetail(input.value);
                      input.value = '';
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Selected Custom Details */}
                <div className="flex flex-wrap gap-2">
                  {config.otherDetails.filter(d => !PERSONALITY_OPTIONS.otherDetails.includes(d)).map((detail) => (
                    <Badge key={detail} variant="secondary" className="flex items-center gap-1">
                      {detail}
                      <button
                        onClick={() => removeCustomDetail(detail)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>



            {/* Instructions */}
            <div className="space-y-4">
              <label className="text-sm font-medium">📝 Instructions</label>
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
              <label className="text-sm font-medium">🌍 Languages</label>
              
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
                  📋 Instructions Preview
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
    </div>
  );
}
