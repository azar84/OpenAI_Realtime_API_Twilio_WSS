"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

interface VoiceChatProps {
  onTranscript?: (text: string, isUser: boolean) => void;
}

const VoiceChatWebRTC: React.FC<VoiceChatProps> = ({ onTranscript }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keyRenewalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentEphemeralKeyRef = useRef<string | null>(null);
  const eventCountRef = useRef(0);
  
  // Accumulators for partial transcripts
  const userTranscriptRef = useRef<string>('');
  const aiTranscriptRef = useRef<string>('');

  // Function to fetch ephemeral key and configuration
  const fetchEphemeralConfig = async (): Promise<{key: string, config: any}> => {
    console.log("🔑 Fetching ephemeral key and configuration...");
    const serverUrl = process.env.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8081';
    const response = await fetch(`${serverUrl}/api/ephemeral`);
    if (!response.ok) {
      throw new Error(`Failed to get ephemeral key: ${response.status}`);
    }
    const ephemeralData = await response.json();
    const key = ephemeralData.client_secret.value;
    console.log("✅ Ephemeral key and configuration obtained");
    console.log("📋 Configuration:", {
      model: ephemeralData.model,
      voice: ephemeralData.voice,
      tools: ephemeralData.tools?.length || 0,
      temperature: ephemeralData.temperature,
      instructions: ephemeralData.instructions?.substring(0, 100) + '...'
    });
    return { key, config: ephemeralData };
  };

  // Define knowledge base tool schema (server-side safe)
  const knowledgeBaseToolSchema = {
    name: 'knowledge_base',
    type: 'function',
    description: "Search the company knowledge base for information about products, services, policies, and procedures. Use this first before saying you don't have information.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find information in the knowledge base',
        },
      },
      required: ['query'],
    },
  };

  // Function to send session configuration
  const sendSessionConfiguration = (ephemeralConfig: any) => {
    console.log("⚙️ Sending session configuration from database...");
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const sessionConfig = {
        type: "session.update",
        session: {
          model: ephemeralConfig.model,
          voice: ephemeralConfig.voice,
          instructions: ephemeralConfig.instructions,
          temperature: ephemeralConfig.temperature,
          max_response_output_tokens: ephemeralConfig.max_response_output_tokens,
          turn_detection: ephemeralConfig.turn_detection,
          modalities: ephemeralConfig.modalities,
          input_audio_transcription: ephemeralConfig.input_audio_transcription,
          input_audio_format: ephemeralConfig.input_audio_format,
          output_audio_format: ephemeralConfig.output_audio_format,
          // Always include KB tool schema here as fallback
          tools: ephemeralConfig.tools && ephemeralConfig.tools.length > 0 ? ephemeralConfig.tools : [knowledgeBaseToolSchema],
          tool_choice: ephemeralConfig.tool_choice || "auto"
        }
      };
      
      console.log("📋 Session configuration:", {
        model: sessionConfig.session.model,
        voice: sessionConfig.session.voice,
        temperature: sessionConfig.session.temperature,
        tools: sessionConfig.session.tools.length,
        tool_names: sessionConfig.session.tools.map((tool: any) => tool.name),
        instructions: sessionConfig.session.instructions?.substring(0, 100) + '...'
      });
      
      dataChannelRef.current.send(JSON.stringify(sessionConfig));
      console.log("✅ Session configuration sent");
    } else {
      console.error("❌ Data channel not ready for session configuration");
    }
  };

  // Function to set up key renewal
  const setupKeyRenewal = () => {
    // Clear any existing interval
    if (keyRenewalIntervalRef.current) {
      clearInterval(keyRenewalIntervalRef.current);
    }
    
    // Renew key every 45 seconds (before 1-minute expiration)
    keyRenewalIntervalRef.current = setInterval(async () => {
      try {
        const { key } = await fetchEphemeralConfig();
        currentEphemeralKeyRef.current = key;
        console.log("🔄 Ephemeral key renewed");
      } catch (error) {
        console.error("❌ Failed to renew ephemeral key:", error);
      }
    }, 45000); // 45 seconds
  };

  const connectToAgent = async () => {
    try {
      setConnectionStatus("Connecting...");
      
      // 1) Get ephemeral key and configuration from backend
      const { key: EPHEMERAL, config: ephemeralConfig } = await fetchEphemeralConfig();
      currentEphemeralKeyRef.current = EPHEMERAL;

      // 2) Create a PeerConnection
      console.log("🔗 Creating WebRTC peer connection...");
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // 3) Set up audio element for playing model's audio
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.autoplay = true;
        audioRef.current.controls = false;
      }

      // 4) Handle remote audio track
      peerConnectionRef.current.ontrack = (event) => {
        console.log("🎵 Received remote audio track");
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      // 5) Create data channel for events
      dataChannelRef.current = peerConnectionRef.current.createDataChannel("oai-events");
      
      // Set up data channel event handlers
      dataChannelRef.current.onopen = () => {
        console.log("📡 Data channel opened successfully");
        // Send session configuration when data channel is ready
        sendSessionConfiguration(ephemeralConfig);
      };
      
      dataChannelRef.current.onerror = (error) => {
        console.error("📡 Data channel error:", error);
      };
      
      dataChannelRef.current.onmessage = (async (event) => {
        eventCountRef.current++;
        console.log(`📨 Event #${eventCountRef.current} from OpenAI:`, event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log("📋 Parsed event data:", data);
          console.log("🔍 Event type:", data.type);
          
          // Log any function/tool related events for debugging
          if (data.type && (data.type.includes('function') || data.type.includes('tool') || data.type.includes('call'))) {
            console.log("🔧 FUNCTION/TOOL EVENT DETECTED:", data.type, data);
          }
          
          // Handle conversation events for transcripts based on the guide
          if (data.type === 'conversation.item.input_audio_transcription.delta') {
            // User speech transcription delta - accumulate
            const delta = data.delta;
            if (delta) {
              userTranscriptRef.current += delta;
              console.log("📝 User transcript delta:", delta, "| Accumulated:", userTranscriptRef.current);
            }
          } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            // User speech transcription completed - send complete transcript
            const transcript = data.transcript || userTranscriptRef.current;
            if (transcript && onTranscript) {
              console.log("📝 User transcript completed:", transcript);
              onTranscript(transcript, true);
              userTranscriptRef.current = ''; // Reset accumulator
            }
          } else if (data.type === 'response.output_text.delta') {
            // AI response text delta - accumulate
            const delta = data.delta;
            if (delta) {
              aiTranscriptRef.current += delta;
              console.log("📝 AI response delta:", delta, "| Accumulated:", aiTranscriptRef.current);
            }
          } else if (data.type === 'response.completed' || data.type === 'response.done') {
            // AI response completed - send complete transcript
            console.log("📝 AI response completed");
            
            let aiText = '';
            
            // First try to get text from accumulated deltas
            if (aiTranscriptRef.current) {
              aiText = aiTranscriptRef.current;
              console.log("📝 AI response text (from deltas):", aiText);
            }
            
            // If no accumulated text, check the response structure
            if (!aiText && data.response && data.response.output && Array.isArray(data.response.output)) {
              // Look for text content in the output array
              for (const item of data.response.output) {
                if (item.content && Array.isArray(item.content)) {
                  for (const content of item.content) {
                    if (content.type === 'text' && content.text) {
                      aiText = content.text;
                      console.log("📝 AI response text content:", aiText);
                      break;
                    } else if (content.type === 'audio' && content.transcript) {
                      aiText = content.transcript;
                      console.log("📝 AI response audio transcript:", aiText);
                      break;
                    }
                  }
                }
                if (aiText) break; // Stop if we found text
              }
            }
            
            // If still no text, check for direct output_text field
            if (!aiText && data.response && data.response.output_text) {
              aiText = data.response.output_text;
              console.log("📝 AI response full text:", aiText);
            }
            
            // Send the text only once
            if (aiText && onTranscript) {
              console.log("📝 Sending AI response:", aiText);
              onTranscript(aiText, false);
            }
            
            // Reset accumulator
            aiTranscriptRef.current = '';
          } else if (data.type === 'response.audio_transcript.delta') {
            // AI audio transcript delta - accumulate
            const delta = data.delta;
            if (delta) {
              aiTranscriptRef.current += delta;
              console.log("📝 AI audio transcript delta:", delta, "| Accumulated:", aiTranscriptRef.current);
            }
          } else if (data.type === 'response.audio_transcript.completed') {
            // AI audio transcript completed - send complete transcript
            const transcript = data.transcript || aiTranscriptRef.current;
            if (transcript && onTranscript) {
              console.log("📝 AI audio transcript completed:", transcript);
              onTranscript(transcript, false);
              aiTranscriptRef.current = ''; // Reset accumulator
            }
          } else if (data.type === 'conversation.item.response.message.delta') {
            // AI response message delta - accumulate
            const delta = data.delta?.content?.[0]?.text || data.delta;
            if (delta) {
              aiTranscriptRef.current += delta;
              console.log("📝 AI message delta:", delta, "| Accumulated:", aiTranscriptRef.current);
            }
          } else if (data.type === 'conversation.item.response.message.done') {
            // AI response message completed - send complete transcript
            const messageText = data.message?.content?.[0]?.text || aiTranscriptRef.current;
            if (messageText && onTranscript) {
              console.log("📝 AI message completed:", messageText);
              onTranscript(messageText, false);
              aiTranscriptRef.current = ''; // Reset accumulator
            }
          } else if (data.type === 'conversation.item.response.text.delta') {
            // AI response text delta - accumulate
            const delta = data.delta;
            if (delta) {
              aiTranscriptRef.current += delta;
              console.log("📝 AI text delta:", delta, "| Accumulated:", aiTranscriptRef.current);
            }
          } else if (data.type === 'conversation.item.response.text.done') {
            // AI response text completed - send complete transcript
            const textContent = data.text || aiTranscriptRef.current;
            if (textContent && onTranscript) {
              console.log("📝 AI text completed:", textContent);
              onTranscript(textContent, false);
              aiTranscriptRef.current = ''; // Reset accumulator
            }
          } else if (data.type === 'conversation.item.response.done') {
            // AI response completed - send complete transcript
            const responseText = data.response?.message?.content?.[0]?.text || aiTranscriptRef.current;
            if (responseText && onTranscript) {
              console.log("📝 AI response done:", responseText);
              onTranscript(responseText, false);
              aiTranscriptRef.current = ''; // Reset accumulator
            }
          } else if (data.type === 'response.output_item.done') {
            // Handle function calls when output item is done (matching WebSocket server implementation)
            console.log("🔧 Response output item done:", data);
            if (data.item && data.item.type === 'function_call') {
              console.log("🔧 Function call received:", data.item);
              const functionName = data.item.name;
              const functionArgs = data.item.arguments;
              const callId = data.item.call_id;
              
              console.log("🔧 Executing function call:", {
                name: functionName,
                call_id: callId,
                arguments: functionArgs
              });
              
              try {
                // Send function call to our backend for execution
                const serverUrl = process.env.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8081';
                const response = await fetch(`${serverUrl}/api/function-call`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: functionName,
                    arguments: functionArgs,
                    call_id: callId
                  })
                });
                
                if (response.ok) {
                  const result = await response.text();
                  console.log("🔧 Function call result received:", {
                    call_id: callId,
                    result_length: result.length,
                    result_preview: result.substring(0, 200) + '...'
                  });
                  
                  // Send the result back to OpenAI with proper call_id (matching WebSocket server)
                  if (dataChannelRef.current) {
                    const responsePayload = {
                      type: "conversation.item.create",
                      item: {
                        type: "function_call_output",
                        call_id: callId,
                        output: result
                      }
                    };
                    
                    console.log("🔧 Sending function call result back to OpenAI:", {
                      call_id: callId,
                      payload_type: responsePayload.type,
                      item_type: responsePayload.item.type
                    });
                    
                    dataChannelRef.current.send(JSON.stringify(responsePayload));
                    
                    // Trigger a response to continue the conversation
                    console.log("🔧 Triggering response.create to continue conversation");
                    dataChannelRef.current.send(JSON.stringify({
                      type: "response.create"
                    }));
                  }
                } else {
                  console.error("❌ Function call failed:", response.status, await response.text());
                }
              } catch (error) {
                console.error("❌ Error executing function call:", error);
              }
            }
          } else if (data.type === 'input_audio_buffer.committed') {
            // User turn boundary - useful for marking when user stops speaking
            console.log("🎯 User turn committed");
          } else {
            // Log any other event types we might be missing
            console.log("🔍 Unhandled event type:", data.type, "Data:", data);
            
            // Check for function call events with different names
            if (data.type && (data.type.includes('function') || data.type.includes('tool'))) {
              console.log("🔧 Potential function call event:", data.type, data);
            }
            
            // Check for any event that might contain function call data
            if (data.function_call || data.tool_call || data.tool_calls) {
              console.log("🔧 Found function/tool call in unhandled event:", data.type, data);
            }
            
            // Check for AI response events that might have different names
            if (data.type && data.type.includes('response') && onTranscript) {
              console.log("🤖 Potential AI response event:", data.type, data);
              // Try to extract text from various possible locations
              const possibleText = data.text || data.content || data.message || data.delta || data.response;
              if (possibleText && typeof possibleText === 'string') {
                console.log("🤖 Found AI text in unhandled event:", possibleText);
                onTranscript(possibleText, false);
              }
            }
          }
        } catch (e) {
          console.log("📨 Raw event data:", event.data);
        }
      });

      // 6) Get microphone access
      console.log("🎤 Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log("✅ Microphone access granted!");
      mediaStreamRef.current = stream;

      // 7) Add microphone track to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current!.addTrack(track, stream);
      });

      // 8) Create offer
      console.log("📤 Creating SDP offer...");
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // 9) Send offer to OpenAI Realtime API
      console.log("🌐 Sending offer to OpenAI...");
      const answerResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-realtime`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${EPHEMERAL}`,
            "Content-Type": "application/sdp",
            "Accept": "application/sdp"
          },
          body: offer.sdp
        }
      );

      if (!answerResponse.ok) {
        const errorText = await answerResponse.text();
        throw new Error(`OpenAI API error: ${answerResponse.status} ${errorText}`);
      }

      const answerSdp = await answerResponse.text();
      console.log("✅ Received SDP answer from OpenAI");

      // 10) Set remote description
      await peerConnectionRef.current.setRemoteDescription({ 
        type: "answer", 
        sdp: answerSdp 
      });

      console.log("✅ WebRTC connection established!");
      setIsConnected(true);
      setConnectionStatus("Connected");
      
      // Set up automatic key renewal
      setupKeyRenewal();
      
    } catch (error) {
      console.error("❌ Connection failed:", error);
      setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const disconnectFromAgent = () => {
    console.log("🔌 Disconnecting from agent...");
    
    // Clear key renewal interval
    if (keyRenewalIntervalRef.current) {
      clearInterval(keyRenewalIntervalRef.current);
      keyRenewalIntervalRef.current = null;
    }
    
    // Reset transcript accumulators
    userTranscriptRef.current = '';
    aiTranscriptRef.current = '';
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus("Disconnected");
    console.log("✅ Disconnected");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear key renewal interval
      if (keyRenewalIntervalRef.current) {
        clearInterval(keyRenewalIntervalRef.current);
      }
      disconnectFromAgent();
    };
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Voice Chat (WebRTC)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            {connectionStatus}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {!isConnected ? (
            <Button 
              onClick={connectToAgent}
              className="bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <Button 
              onClick={disconnectFromAgent}
              variant="destructive"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>


        {/* Instructions */}
        <div className="text-sm text-gray-600 text-center">
          {!isConnected ? (
            "Click Connect to start a real-time voice conversation with the AI agent."
          ) : (
            "Speak naturally - the AI will respond in real-time. You can interrupt by speaking while it's talking."
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceChatWebRTC;