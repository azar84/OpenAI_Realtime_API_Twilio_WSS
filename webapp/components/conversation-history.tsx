"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Calendar, Clock, User, Bot, Phone, MessageSquare, RefreshCw } from "lucide-react";

interface Session {
  id: number;
  session_id: string;
  config_id: number;
  twilio_stream_sid?: string;
  status: 'active' | 'ended' | 'failed';
  started_at: string;
  ended_at?: string;
  messages?: ConversationMessage[];
}

interface ConversationMessage {
  id: number;
  session_id: number;
  stream_sid?: string;
  message_type: 'user' | 'assistant' | 'function_call' | 'function_output' | 'system';
  content: string;
  metadata: any;
  audio_duration_ms?: number;
  is_audio: boolean;
  sequence_number: number;
  created_at: string;
}

const ConversationHistory: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    
    // Refresh sessions every 5 seconds to get new messages
    const interval = setInterval(() => {
      loadSessions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Get all sessions from the backend
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }
      
      const sessionsData = await response.json();
      setSessions(sessionsData);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}?includeMessages=true`);
      if (!response.ok) {
        throw new Error('Failed to load session messages');
      }
      
      const sessionData = await response.json();
      setSelectedSession(sessionData);
    } catch (err) {
      console.error('Error loading session messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session messages');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const parseMessageContent = (content: string): string => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      
      // If it's an array, look for transcript or text content
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.type === 'audio' && item.transcript) {
            return item.transcript;
          }
          if (item.type === 'text' && item.text) {
            return item.text;
          }
          if (item.type === 'input_text' && item.text) {
            return item.text;
          }
          if (item.type === 'output_text' && item.text) {
            return item.text;
          }
          // Handle input_audio with transcript
          if (item.type === 'input_audio' && item.transcript) {
            return item.transcript;
          }
        }
      }
      
      // If it's an object, look for transcript or text
      if (parsed.transcript) {
        return parsed.transcript;
      }
      if (parsed.text) {
        return parsed.text;
      }
      
      // If we can't extract meaningful content, return the original
      return content;
    } catch {
      // If it's not JSON, return as-is
      return content;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'user': return <User className="h-4 w-4" />;
      case 'assistant': return <Bot className="h-4 w-4" />;
      case 'function_call': return <MessageSquare className="h-4 w-4" />;
      case 'function_output': return <MessageSquare className="h-4 w-4" />;
      case 'system': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMessageColor = (messageType: string) => {
    switch (messageType) {
      case 'user': return 'bg-blue-50 border-blue-200';
      case 'assistant': return 'bg-green-50 border-green-200';
      case 'function_call': return 'bg-purple-50 border-purple-200';
      case 'function_output': return 'bg-orange-50 border-orange-200';
      case 'system': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadSessions(true)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Sessions List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Conversation History</h2>
              <p className="text-sm text-gray-600 mt-1">{sessions.length} sessions</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSessions(true)}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No conversations yet</p>
                <p className="text-sm text-gray-500 mt-1">Start a conversation to see history here</p>
              </div>
            ) : (
              sessions.map((session) => (
                <Card 
                  key={session.id}
                  className={`cursor-pointer transition-colors ${
                    selectedSession?.id === session.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => loadSessionMessages(session.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          Session {session.id}
                        </span>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(session.started_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(session.started_at, session.ended_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Conversation Details */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Session {selectedSession.id} Details
                  </h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Started: {formatDate(selectedSession.started_at)}</span>
                    </div>
                    {selectedSession.ended_at && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Ended: {formatDate(selectedSession.ended_at)}</span>
                      </div>
                    )}
                    <Badge className={getStatusColor(selectedSession.status)}>
                      {selectedSession.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSessionMessages(selectedSession.id)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Messages
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {selectedSession.messages && selectedSession.messages.length > 0 ? (
                  selectedSession.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg border ${getMessageColor(message.message_type)}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getMessageIcon(message.message_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {message.message_type}
                            </span>
                            <span className="text-xs text-gray-500">
                              #{message.sequence_number}
                            </span>
                            {message.is_audio && (
                              <Badge variant="outline" className="text-xs">
                                Audio
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {parseMessageContent(message.content)}
                          </p>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(message.created_at)}</span>
                            {message.audio_duration_ms && (
                              <>
                                <span>•</span>
                                <span>{message.audio_duration_ms}ms</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No messages in this session</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Session</h3>
              <p className="text-gray-600">Choose a conversation from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;
