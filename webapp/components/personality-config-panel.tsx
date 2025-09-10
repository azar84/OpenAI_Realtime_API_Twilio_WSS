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
    }
  });

  const [preview, setPreview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    generatePreview();
  }, [config]);

  const generatePreview = () => {
    const parts = [];
    
    if (config.identity) parts.push(`Identity: ${config.identity}`);
    if (config.task) parts.push(`Task: ${config.task}`);
    if (config.demeanor) parts.push(`Demeanor: ${config.demeanor}`);
    if (config.tone) parts.push(`Tone: ${config.tone}`);
    if (config.enthusiasm) parts.push(`Enthusiasm: ${config.enthusiasm}`);
    if (config.formality) parts.push(`Formality: ${config.formality}`);
    if (config.emotion) parts.push(`Emotion: ${config.emotion}`);
    if (config.fillerWords) parts.push(`Filler Words: ${config.fillerWords}`);
    if (config.pacing) parts.push(`Pacing: ${config.pacing}`);
    if (config.otherDetails.length > 0) {
      parts.push(`Other Details: ${config.otherDetails.join(", ")}`);
    }

    setPreview(parts.join("\n"));
  };

  const handleSave = () => {
    onSave(config);
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
          value={config[dimension]} 
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎭 Personality & Tone Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
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


            {/* Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="p-3 bg-gray-50 rounded-md text-sm whitespace-pre-wrap">
                {preview || "Select options above to see preview..."}
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} className="w-full">
              <Check className="h-4 w-4 mr-2" />
              Save Personality Configuration
            </Button>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
