'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Plus, Edit, Trash2, Check, Eye } from 'lucide-react';

interface PersonalityOption {
  id: number;
  category: string;
  value: string;
  description: string;
  sort_order?: number;
}

interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
}

interface AgentConfig {
  id: number;
  config_title: string;
  config_description: string | null;
  name: string;
  identity_option_id: number | null;
  task_option_id: number | null;
  demeanor_option_id: number | null;
  tone_option_id: number | null;
  enthusiasm_option_id: number | null;
  formality_option_id: number | null;
  emotion_option_id: number | null;
  filler_words_option_id: number | null;
  pacing_option_id: number | null;
  primary_language_id: number | null;
  secondary_language_ids: number[];
  custom_instructions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Technical fields
  voice?: string;
  model?: string;
  temperature?: number | string;
  max_tokens?: number | string;
  input_audio_format?: string;
  output_audio_format?: string;
  turn_detection_type?: string;
  turn_detection_threshold?: number | string;
  turn_detection_prefix_padding_ms?: number | string;
  turn_detection_silence_duration_ms?: number | string;
  turn_detection_create_response?: boolean;
  turn_detection_interrupt_response?: boolean;
  turn_detection_eagerness?: string;
  modalities?: string[];
  tools_enabled?: boolean;
  enabled_tools?: string[];
  
  // Joined values
  identity_value?: string;
  task_value?: string;
  demeanor_value?: string;
  tone_value?: string;
  enthusiasm_value?: string;
  formality_value?: string;
  emotion_value?: string;
  filler_words_value?: string;
  pacing_value?: string;
  primary_language_name?: string;
  secondary_language_names?: string[];
}

interface ConfigurationManagementPanelProps {
  className?: string;
}

export default function ConfigurationManagementPanel({ className }: ConfigurationManagementPanelProps) {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [personalityOptions, setPersonalityOptions] = useState<PersonalityOption[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AgentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'personality' | 'technical' | 'manage-options'>('personality');
  const [editingOption, setEditingOption] = useState<PersonalityOption | null>(null);
  const [optionFormData, setOptionFormData] = useState({
    category: '',
    value: '',
    sort_order: 1
  });
  const [viewingInstructions, setViewingInstructions] = useState<AgentConfig | null>(null);
  const [renderedInstructions, setRenderedInstructions] = useState<string>('');
  const [formData, setFormData] = useState({
    // Basic info
    config_title: '',
    config_description: '',
    name: '',
    
    // Personality fields
    identity_option_id: '',
    task_option_id: '',
    demeanor_option_id: '',
    tone_option_id: '',
    enthusiasm_option_id: '',
    formality_option_id: '',
    emotion_option_id: '',
    filler_words_option_id: '',
    pacing_option_id: '',
    primary_language_id: '',
    secondary_language_ids: [] as number[],
    custom_instructions: '',
    
    // Technical fields
    voice: '',
    model: '',
    temperature: '',
    max_tokens: '',
    input_audio_format: '',
    output_audio_format: '',
    turn_detection_type: '',
    turn_detection_threshold: '',
    turn_detection_prefix_padding_ms: '',
    turn_detection_silence_duration_ms: '',
    turn_detection_create_response: false,
    turn_detection_interrupt_response: false,
    turn_detection_eagerness: '',
    modalities: [] as string[],
    tools_enabled: false,
    enabled_tools: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, optionsRes, languagesRes] = await Promise.all([
        fetch('/api/configurations'),
        fetch('/api/personality-options'),
        fetch('/api/languages')
      ]);

      if (!configsRes.ok || !optionsRes.ok || !languagesRes.ok) {
        throw new Error('Failed to load data');
      }

      const [configsData, optionsData, languagesData] = await Promise.all([
        configsRes.json(),
        optionsRes.json(),
        languagesRes.json()
      ]);

      setConfigs(configsData);
      setPersonalityOptions(optionsData);
      setLanguages(languagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null); // Clear any previous errors
      
      const configData = {
        ...formData,
        identity_option_id: formData.identity_option_id ? parseInt(formData.identity_option_id) : null,
        task_option_id: formData.task_option_id ? parseInt(formData.task_option_id) : null,
        demeanor_option_id: formData.demeanor_option_id ? parseInt(formData.demeanor_option_id) : null,
        tone_option_id: formData.tone_option_id ? parseInt(formData.tone_option_id) : null,
        enthusiasm_option_id: formData.enthusiasm_option_id ? parseInt(formData.enthusiasm_option_id) : null,
        formality_option_id: formData.formality_option_id ? parseInt(formData.formality_option_id) : null,
        emotion_option_id: formData.emotion_option_id ? parseInt(formData.emotion_option_id) : null,
        filler_words_option_id: formData.filler_words_option_id ? parseInt(formData.filler_words_option_id) : null,
        pacing_option_id: formData.pacing_option_id ? parseInt(formData.pacing_option_id) : null,
        primary_language_id: formData.primary_language_id ? parseInt(formData.primary_language_id) : null,
        secondary_language_ids: formData.secondary_language_ids,
        custom_instructions: formData.custom_instructions ? formData.custom_instructions.split('\n').filter(s => s.trim()) : [],
        
        // Technical fields - convert strings to proper types
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        max_tokens: formData.max_tokens ? parseInt(formData.max_tokens) : null,
        turn_detection_threshold: formData.turn_detection_threshold ? parseFloat(formData.turn_detection_threshold) : null,
        turn_detection_prefix_padding_ms: formData.turn_detection_prefix_padding_ms ? parseInt(formData.turn_detection_prefix_padding_ms) : null,
        turn_detection_silence_duration_ms: formData.turn_detection_silence_duration_ms ? parseInt(formData.turn_detection_silence_duration_ms) : null,
        turn_detection_create_response: Boolean(formData.turn_detection_create_response),
        turn_detection_interrupt_response: Boolean(formData.turn_detection_interrupt_response),
        turn_detection_eagerness: formData.turn_detection_eagerness || null,
        tools_enabled: Boolean(formData.tools_enabled),
        modalities: Array.isArray(formData.modalities) ? formData.modalities : [],
        enabled_tools: Array.isArray(formData.enabled_tools) ? formData.enabled_tools : []
      };

      console.log('Saving config data:', configData);

      const url = editingConfig ? `/api/configurations/${editingConfig.id}` : '/api/configurations';
      const method = editingConfig ? 'PUT' : 'POST';

      console.log('Making request to:', url, 'with method:', method);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to save configuration: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Save successful:', result);

      setIsDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleEdit = (config: AgentConfig) => {
    setEditingConfig(config);
    setFormData({
      // Basic info
      config_title: config.config_title,
      config_description: config.config_description || '',
      name: config.name,
      
      // Personality fields
      identity_option_id: config.identity_option_id?.toString() || '',
      task_option_id: config.task_option_id?.toString() || '',
      demeanor_option_id: config.demeanor_option_id?.toString() || '',
      tone_option_id: config.tone_option_id?.toString() || '',
      enthusiasm_option_id: config.enthusiasm_option_id?.toString() || '',
      formality_option_id: config.formality_option_id?.toString() || '',
      emotion_option_id: config.emotion_option_id?.toString() || '',
      filler_words_option_id: config.filler_words_option_id?.toString() || '',
      pacing_option_id: config.pacing_option_id?.toString() || '',
      primary_language_id: config.primary_language_id?.toString() || '',
      secondary_language_ids: config.secondary_language_ids || [],
      custom_instructions: config.custom_instructions?.join('\n') || '',
      
      // Technical fields
      voice: config.voice || '',
      model: config.model || '',
      temperature: config.temperature?.toString() || '',
      max_tokens: config.max_tokens?.toString() || '',
      input_audio_format: config.input_audio_format || '',
      output_audio_format: config.output_audio_format || '',
      turn_detection_type: config.turn_detection_type || '',
      turn_detection_threshold: config.turn_detection_threshold?.toString() || '',
      turn_detection_prefix_padding_ms: config.turn_detection_prefix_padding_ms?.toString() || '',
      turn_detection_silence_duration_ms: config.turn_detection_silence_duration_ms?.toString() || '',
      turn_detection_create_response: config.turn_detection_create_response || false,
      turn_detection_interrupt_response: config.turn_detection_interrupt_response || false,
      turn_detection_eagerness: config.turn_detection_eagerness || '',
      modalities: config.modalities || [],
      tools_enabled: config.tools_enabled || false,
      enabled_tools: config.enabled_tools || []
    });
    setIsDialogOpen(true);
  };

  const handleActivate = async (configId: number) => {
    try {
      const response = await fetch(`/api/configurations/${configId}/activate`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to activate configuration');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate configuration');
    }
  };

  const handleDelete = async (configId: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      // Basic info
      config_title: '',
      config_description: '',
      name: '',
      
      // Personality fields
      identity_option_id: '',
      task_option_id: '',
      demeanor_option_id: '',
      tone_option_id: '',
      enthusiasm_option_id: '',
      formality_option_id: '',
      emotion_option_id: '',
      filler_words_option_id: '',
      pacing_option_id: '',
      primary_language_id: '',
      secondary_language_ids: [],
      custom_instructions: '',
      
      // Technical fields
      voice: '',
      model: '',
      temperature: '',
      max_tokens: '',
      input_audio_format: '',
      output_audio_format: '',
      turn_detection_type: '',
      turn_detection_threshold: '',
      turn_detection_prefix_padding_ms: '',
      turn_detection_silence_duration_ms: '',
      turn_detection_create_response: false,
      turn_detection_interrupt_response: false,
      turn_detection_eagerness: '',
      modalities: [],
      tools_enabled: false,
      enabled_tools: []
    });
  };

  const getOptionsByCategory = (category: string) => {
    return personalityOptions.filter(opt => opt.category === category);
  };

  const getOptionValue = (optionId: number | null) => {
    if (!optionId) return '';
    const option = personalityOptions.find(opt => opt.id === optionId);
    return option?.value || '';
  };

  const getLanguageName = (languageId: number | null) => {
    if (!languageId) return '';
    const language = languages.find(lang => lang.id === languageId);
    return language?.name || '';
  };

  const handleSaveOption = async () => {
    try {
      const url = editingOption ? `/api/personality-options/${editingOption.id}` : '/api/personality-options';
      const method = editingOption ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optionFormData)
      });

      if (!response.ok) {
        throw new Error('Failed to save personality option');
      }

      // Reload personality options
      const optionsRes = await fetch('/api/personality-options');
      const optionsData = await optionsRes.json();
      setPersonalityOptions(optionsData);

      // Reset form
      setEditingOption(null);
      setOptionFormData({ category: '', value: '', sort_order: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save personality option');
    }
  };

  const handleViewInstructions = async (config: AgentConfig) => {
    try {
      setViewingInstructions(config);
      // Always fetch fresh instructions from the database
      const response = await fetch(`/api/agent-instructions/${config.id}`);
      if (!response.ok) throw new Error('Failed to fetch instructions');
      const data = await response.json();
      setRenderedInstructions(data.instructions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instructions');
    }
  };

  const handleEditOption = (option: PersonalityOption) => {
    setEditingOption(option);
    setOptionFormData({
      category: option.category,
      value: option.value,
      sort_order: option.sort_order || 1
    });
  };

  const handleDeleteOption = async (optionId: number) => {
    if (!confirm('Are you sure you want to delete this personality option?')) return;
    
    try {
      const response = await fetch(`/api/personality-options/${optionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete personality option');
      }

      // Reload personality options
      const optionsRes = await fetch('/api/personality-options');
      const optionsData = await optionsRes.json();
      setPersonalityOptions(optionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete personality option');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Configuration Management
            </h1>
          </div>
          <div className="text-center py-8">Loading personas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Persona Management
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingConfig(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-8 overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Edit Persona' : 'Create New Persona'}
                </DialogTitle>
                <DialogDescription>
                  Configure your agent's personality and behavior settings.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] pr-4">
                {/* Tab Navigation */}
                <div className="flex border-b mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('personality')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'personality'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Personality & Behavior
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('technical')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'technical'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Technical Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage-options')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'manage-options'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Manage Options
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'personality' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="config_title">Configuration Title *</Label>
                    <Input
                      id="config_title"
                      value={formData.config_title}
                      onChange={(e) => setFormData({ ...formData, config_title: e.target.value })}
                      placeholder="e.g., Friendly Support Agent"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="name">Agent Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Sarah"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 overflow-hidden">
                    <Label htmlFor="config_description">Description</Label>
                    <Textarea
                      id="config_description"
                      value={formData.config_description}
                      onChange={(e) => setFormData({ ...formData, config_description: e.target.value })}
                      placeholder="Optional description of this configuration"
                      rows={2}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="identity_option_id">Identity</Label>
                    <Select value={formData.identity_option_id} onValueChange={(value) => setFormData({ ...formData, identity_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select identity" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('identity').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="task_option_id">Task</Label>
                    <Select value={formData.task_option_id} onValueChange={(value) => setFormData({ ...formData, task_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('task').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="demeanor_option_id">Demeanor</Label>
                    <Select value={formData.demeanor_option_id} onValueChange={(value) => setFormData({ ...formData, demeanor_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select demeanor" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('demeanor').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="tone_option_id">Tone</Label>
                    <Select value={formData.tone_option_id} onValueChange={(value) => setFormData({ ...formData, tone_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('tone').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="enthusiasm_option_id">Level of Enthusiasm</Label>
                    <Select value={formData.enthusiasm_option_id} onValueChange={(value) => setFormData({ ...formData, enthusiasm_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select enthusiasm level" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('enthusiasm').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="formality_option_id">Level of Formality</Label>
                    <Select value={formData.formality_option_id} onValueChange={(value) => setFormData({ ...formData, formality_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select formality level" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('formality').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="emotion_option_id">Level of Emotion</Label>
                    <Select value={formData.emotion_option_id} onValueChange={(value) => setFormData({ ...formData, emotion_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select emotion level" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('emotion').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="filler_words_option_id">Filler Words</Label>
                    <Select value={formData.filler_words_option_id} onValueChange={(value) => setFormData({ ...formData, filler_words_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select filler words style" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('filler_words').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="pacing_option_id">Pacing</Label>
                    <Select value={formData.pacing_option_id} onValueChange={(value) => setFormData({ ...formData, pacing_option_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select pacing" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {getOptionsByCategory('pacing').map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="primary_language_id">Primary Language</Label>
                    <Select value={formData.primary_language_id} onValueChange={(value) => setFormData({ ...formData, primary_language_id: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select primary language" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {languages.map(language => (
                          <SelectItem key={language.id} value={language.id.toString()}>
                            {language.name} ({language.native_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    <Label htmlFor="secondary_language_ids">Secondary Languages</Label>
                    <Select 
                      value="" 
                      onValueChange={(value) => {
                        const langId = parseInt(value);
                        if (!formData.secondary_language_ids.includes(langId)) {
                          setFormData({ 
                            ...formData, 
                            secondary_language_ids: [...formData.secondary_language_ids, langId] 
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Add secondary language" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[500px]">
                        {languages
                          .filter(lang => !formData.secondary_language_ids.includes(lang.id))
                          .map(language => (
                            <SelectItem key={language.id} value={language.id.toString()}>
                              {language.name} ({language.native_name})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {formData.secondary_language_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.secondary_language_ids.map(langId => {
                          const lang = languages.find(l => l.id === langId);
                          return lang ? (
                            <Badge key={langId} variant="secondary" className="flex items-center gap-1">
                              {lang.name}
                              <button
                                onClick={() => setFormData({
                                  ...formData,
                                  secondary_language_ids: formData.secondary_language_ids.filter(id => id !== langId)
                                })}
                                className="ml-1 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2 overflow-hidden">
                    <Label htmlFor="custom_instructions">Custom Instructions</Label>
                    <Textarea
                      id="custom_instructions"
                      value={formData.custom_instructions}
                      onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                      placeholder="Enter custom instructions, one per line"
                      rows={4}
                      className="w-full"
                    />
                  </div>
                  </div>
                ) : activeTab === 'technical' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Technical Settings */}
                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="voice">Voice</Label>
                      <Select value={formData.voice} onValueChange={(value) => setFormData({ ...formData, voice: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select voice" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[300px]">
                          <SelectItem value="alloy">Alloy</SelectItem>
                          <SelectItem value="ash">Ash</SelectItem>
                          <SelectItem value="ballad">Ballad</SelectItem>
                          <SelectItem value="cedar">Cedar</SelectItem>
                          <SelectItem value="coral">Coral</SelectItem>
                          <SelectItem value="echo">Echo</SelectItem>
                          <SelectItem value="marin">Marin</SelectItem>
                          <SelectItem value="sage">Sage</SelectItem>
                          <SelectItem value="shimmer">Shimmer</SelectItem>
                          <SelectItem value="verse">Verse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="model">Model</Label>
                      <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[300px]">
                          <SelectItem value="gpt-4o-realtime-preview">GPT-4o Realtime Preview</SelectItem>
                          <SelectItem value="gpt-realtime-2025-08-28">GPT Realtime (2025-08-28)</SelectItem>
                          <SelectItem value="gpt-realtime">GPT Realtime</SelectItem>
                          <SelectItem value="gpt-4o-realtime-preview-2025-06-03">GPT-4o Realtime Preview (2025-06-03)</SelectItem>
                          <SelectItem value="gpt-4o-realtime-preview-2024-12-17">GPT-4o Realtime Preview (2024-12-17)</SelectItem>
                          <SelectItem value="gpt-4o-realtime-preview-2024-10-01">GPT-4o Realtime Preview (2024-10-01)</SelectItem>
                          <SelectItem value="gpt-4o-mini-realtime-preview-2024-12-17">GPT-4o Mini Realtime Preview (2024-12-17)</SelectItem>
                          <SelectItem value="gpt-4o-mini-realtime-preview">GPT-4o Mini Realtime Preview</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                        placeholder="0.7"
                      />
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="max_tokens">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
                        placeholder="300"
                      />
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="input_audio_format">Input Audio Format</Label>
                      <Select value={formData.input_audio_format} onValueChange={(value) => setFormData({ ...formData, input_audio_format: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select input format" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[300px]">
                          <SelectItem value="pcm16">PCM16</SelectItem>
                          <SelectItem value="g711_ulaw">G711 ULAW</SelectItem>
                          <SelectItem value="g711_alaw">G711 ALAW</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="output_audio_format">Output Audio Format</Label>
                      <Select value={formData.output_audio_format} onValueChange={(value) => setFormData({ ...formData, output_audio_format: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select output format" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[300px]">
                          <SelectItem value="pcm16">PCM16</SelectItem>
                          <SelectItem value="g711_ulaw">G711 ULAW</SelectItem>
                          <SelectItem value="g711_alaw">G711 ALAW</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label htmlFor="turn_detection_type">Turn Detection Type</Label>
                      <Select value={formData.turn_detection_type} onValueChange={(value) => setFormData({ ...formData, turn_detection_type: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select detection type" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[300px]">
                          <SelectItem value="none">None (Manual)</SelectItem>
                          <SelectItem value="server_vad">Server VAD (Silence-based)</SelectItem>
                          <SelectItem value="semantic_vad">Semantic VAD (Model-based)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Server VAD Parameters */}
                    {formData.turn_detection_type === 'server_vad' && (
                      <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                        <div className="space-y-2">
                          <Label htmlFor="turn_detection_threshold">Threshold (0.0-1.0)</Label>
                          <Input
                            id="turn_detection_threshold"
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={formData.turn_detection_threshold}
                            onChange={(e) => setFormData({ ...formData, turn_detection_threshold: e.target.value })}
                            placeholder="0.5"
                          />
                          <p className="text-xs text-gray-500">Higher values require louder/clearer speech</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="turn_detection_prefix_padding_ms">Prefix Padding (ms)</Label>
                            <Input
                              id="turn_detection_prefix_padding_ms"
                              type="number"
                              value={formData.turn_detection_prefix_padding_ms}
                              onChange={(e) => setFormData({ ...formData, turn_detection_prefix_padding_ms: e.target.value })}
                              placeholder="300"
                            />
                            <p className="text-xs text-gray-500">Audio before speech start</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="turn_detection_silence_duration_ms">Silence Duration (ms)</Label>
                            <Input
                              id="turn_detection_silence_duration_ms"
                              type="number"
                              value={formData.turn_detection_silence_duration_ms}
                              onChange={(e) => setFormData({ ...formData, turn_detection_silence_duration_ms: e.target.value })}
                              placeholder="200"
                            />
                            <p className="text-xs text-gray-500">Silence before speech end</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.turn_detection_create_response}
                              onChange={(e) => setFormData({ ...formData, turn_detection_create_response: e.target.checked })}
                            />
                            <span>Create Response</span>
                          </Label>
                          <p className="text-xs text-gray-500">Auto-generate response after speech end detection</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.turn_detection_interrupt_response}
                              onChange={(e) => setFormData({ ...formData, turn_detection_interrupt_response: e.target.checked })}
                            />
                            <span>Interrupt Response</span>
                          </Label>
                          <p className="text-xs text-gray-500">Allow interrupting responses when user speaks</p>
                        </div>
                      </div>
                    )}

                    {/* Semantic VAD Parameters */}
                    {formData.turn_detection_type === 'semantic_vad' && (
                      <div className="space-y-4 pl-4 border-l-2 border-green-200">
                        <div className="space-y-2">
                          <Label htmlFor="turn_detection_eagerness">Eagerness</Label>
                          <Select value={formData.turn_detection_eagerness} onValueChange={(value) => setFormData({ ...formData, turn_detection_eagerness: value })}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select eagerness level" />
                            </SelectTrigger>
                            <SelectContent className="max-w-[300px]">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="auto">Auto</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">How aggressively to chunk speech segments</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.turn_detection_interrupt_response}
                              onChange={(e) => setFormData({ ...formData, turn_detection_interrupt_response: e.target.checked })}
                            />
                            <span>Interrupt Response</span>
                          </Label>
                          <p className="text-xs text-gray-500">Allow interrupting responses when user speaks</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 overflow-hidden md:col-span-2">
                      <Label>Modalities</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.modalities.includes('text')}
                            onChange={(e) => {
                              const modalities = e.target.checked
                                ? [...formData.modalities, 'text']
                                : formData.modalities.filter(m => m !== 'text');
                              setFormData({ ...formData, modalities });
                            }}
                          />
                          <span>Text</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.modalities.includes('audio')}
                            onChange={(e) => {
                              const modalities = e.target.checked
                                ? [...formData.modalities, 'audio']
                                : formData.modalities.filter(m => m !== 'audio');
                              setFormData({ ...formData, modalities });
                            }}
                          />
                          <span>Audio</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2 overflow-hidden md:col-span-2">
                      <Label>Tools</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.tools_enabled}
                          onChange={(e) => setFormData({ ...formData, tools_enabled: e.target.checked })}
                        />
                        <span>Enable Tools</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Manage Personality Options */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Personality Options</h3>
                        <Button 
                          onClick={() => {
                            setEditingOption(null);
                            setOptionFormData({ category: '', value: '', sort_order: 1 });
                          }}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Option
                        </Button>
                      </div>

                      {/* Option Form */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="option-category">Category</Label>
                          <Select value={optionFormData.category} onValueChange={(value) => setOptionFormData({ ...optionFormData, category: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="identity">Identity</SelectItem>
                              <SelectItem value="task">Task</SelectItem>
                              <SelectItem value="demeanor">Demeanor</SelectItem>
                              <SelectItem value="tone">Tone</SelectItem>
                              <SelectItem value="enthusiasm">Enthusiasm</SelectItem>
                              <SelectItem value="formality">Formality</SelectItem>
                              <SelectItem value="emotion">Emotion</SelectItem>
                              <SelectItem value="filler_words">Filler Words</SelectItem>
                              <SelectItem value="pacing">Pacing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="option-value">Value</Label>
                          <Input
                            id="option-value"
                            value={optionFormData.value}
                            onChange={(e) => setOptionFormData({ ...optionFormData, value: e.target.value })}
                            placeholder="e.g., Friendly assistant"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            onClick={handleSaveOption}
                            className="w-full"
                            disabled={!optionFormData.category || !optionFormData.value}
                          >
                            {editingOption ? 'Update' : 'Add'} Option
                          </Button>
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="space-y-4">
                        {['identity', 'task', 'demeanor', 'tone', 'enthusiasm', 'formality', 'emotion', 'filler_words', 'pacing'].map(category => {
                          const categoryOptions = getOptionsByCategory(category);
                          if (categoryOptions.length === 0) return null;
                          
                          return (
                            <div key={category} className="border rounded-lg p-3">
                              <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                                {category.replace('_', ' ')} ({categoryOptions.length} options)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {categoryOptions.map(option => (
                                  <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                    <span className="flex-1 truncate">{option.value}</span>
                                    <div className="flex gap-1 ml-2">
                                      <button
                                        onClick={() => handleEditOption(option)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOption(option.id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingConfig ? 'Update' : 'Create'} Persona
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
            {configs.map((config) => (
              <Card key={config.id} className={config.is_active ? 'ring-2 ring-green-500' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm">{config.config_title}</CardTitle>
                      <CardDescription className="text-xs">{config.config_description}</CardDescription>
                    </div>
                    {config.is_active && (
                      <Badge variant="default" className="bg-green-500 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs">
                    <div><strong>Agent:</strong> {config.name}</div>
                    <div><strong>Identity:</strong> {getOptionValue(config.identity_option_id)}</div>
                    <div><strong>Task:</strong> {getOptionValue(config.task_option_id)}</div>
                    <div><strong>Demeanor:</strong> {getOptionValue(config.demeanor_option_id)}</div>
                    <div><strong>Tone:</strong> {getOptionValue(config.tone_option_id)}</div>
                    <div><strong>Enthusiasm:</strong> {getOptionValue(config.enthusiasm_option_id)}</div>
                    <div><strong>Formality:</strong> {getOptionValue(config.formality_option_id)}</div>
                    <div><strong>Emotion:</strong> {getOptionValue(config.emotion_option_id)}</div>
                    <div><strong>Filler Words:</strong> {getOptionValue(config.filler_words_option_id)}</div>
                    <div><strong>Pacing:</strong> {getOptionValue(config.pacing_option_id)}</div>
                    <div><strong>Language:</strong> {getLanguageName(config.primary_language_id)}</div>
                    {config.secondary_language_names && config.secondary_language_names.length > 0 && (
                      <div><strong>Secondary:</strong> {config.secondary_language_names.join(', ')}</div>
                    )}
                  </div>

                  <div className="flex justify-between mt-3">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewInstructions(config)}
                        className="h-7 px-2"
                        title="View Complete Instructions"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(config)}
                        className="h-7 px-2"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {!config.is_active && (
                        <Button
                          size="sm"
                          onClick={() => handleActivate(config.id)}
                          className="h-7 px-2"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(config.id)}
                      className="h-7 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {configs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No personas found. Create your first persona to get started.</p>
          </div>
        )}

        {/* Instructions Dialog */}
        <Dialog open={!!viewingInstructions} onOpenChange={() => setViewingInstructions(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Complete Instructions - {viewingInstructions?.config_title}
              </DialogTitle>
              <DialogDescription>
                This is how the complete instructions will be sent to the AI agent.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border overflow-x-auto">
                {renderedInstructions}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
