"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from "lucide-react";

interface VoiceChatProps {
  onTranscript?: (text: string, isUser: boolean) => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onTranscript }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio visualization
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    const updateVolume = () => {
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
      analyserRef.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setVolume(Math.min(100, (average / 255) * 100));
      
      if (isRecording) {
        requestAnimationFrame(updateVolume);
      }
    };
    
    updateVolume();
  }, [isRecording]);

  const connectToAgent = async () => {
    try {
      setConnectionStatus("Connecting...");
      
      // Check microphone permission first
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
      console.log("🎵 Audio tracks:", stream.getAudioTracks().length);
      stream.getAudioTracks().forEach((track, i) => {
        console.log(`Track ${i}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });
      
      streamRef.current = stream;

      // Set up audio context and analyzer
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Prefer AudioWorklet for low-latency continuous streaming
      try {
        await audioContextRef.current.audioWorklet.addModule('/pcm16-worklet.js');
        workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm16-worker', {
          processorOptions: { targetSampleRate: 24000 }
        });
        workletNodeRef.current.port.onmessage = (event) => {
          console.log("🎵 AudioWorklet received data, isRecording:", isRecording, "WS ready:", wsRef.current?.readyState === WebSocket.OPEN);
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;
          const buffer = event.data as ArrayBuffer;
          const base64 = arrayBufferToBase64(buffer);
          console.log("📤 Sending audio chunk, size:", buffer.byteLength, "base64 length:", base64.length);
          wsRef.current.send(base64);
        };
        source.connect(workletNodeRef.current);
        workletNodeRef.current.connect(audioContextRef.current.destination);
        console.log("✅ AudioWorklet connected - streaming 24kHz PCM16");
      } catch (e) {
        console.warn("⚠️ AudioWorklet unavailable, falling back to ScriptProcessor", e);
        // Set up audio processor for PCM16 capture
        console.log("🔧 Setting up audio processor...");
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        source.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
        console.log("✅ Audio processor connected - ready to capture PCM16 audio");
        
        processorRef.current.onaudioprocess = (event) => {
          console.log("🎧 ScriptProcessor fired - isRecording:", isRecording, "WS ready:", wsRef.current?.readyState === WebSocket.OPEN);
          
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;
          
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Calculate audio levels for debugging
          let maxLevel = 0;
          let avgLevel = 0;
          for (let i = 0; i < inputData.length; i++) {
            const level = Math.abs(inputData[i]);
            maxLevel = Math.max(maxLevel, level);
            avgLevel += level;
          }
          avgLevel = avgLevel / inputData.length;
          
          // Log audio levels occasionally
          if (Math.random() < 0.1) {
            console.log("🎧 Audio levels - Max:", maxLevel.toFixed(4), "Avg:", avgLevel.toFixed(4));
          }
          
          // Always send audio data (continuous streaming)
          const pcm16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          const arrayBuffer = pcm16Data.buffer;
          const base64 = arrayBufferToBase64(arrayBuffer);
          console.log("📤 ScriptProcessor sending audio chunk, size:", arrayBuffer.byteLength, "base64 length:", base64.length);
          wsRef.current.send(base64);
        };
      }

      // Connect to WebSocket
      wsRef.current = new WebSocket("ws://localhost:8081/voice-chat");
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("Connected");
        console.log("🎙️ Connected to voice chat - using PCM16 audio capture");
        
        // Auto-start streaming when connected
        console.log("🎤 Auto-starting continuous audio streaming...");
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "start_recording" }));
          console.log("📨 Sent start_recording message to server");
        }
        setIsRecording(true);
      };

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Received audio from agent (PCM16 binary data)
          console.log("🔊 Received audio response from agent, size:", event.data.size);
          const arrayBuffer = await event.data.arrayBuffer();
          audioQueueRef.current.push(arrayBuffer);
          playNextAudio();
        } else if (event.data instanceof ArrayBuffer) {
          // Received audio from agent (direct ArrayBuffer)
          console.log("🔊 Received audio response from agent, size:", event.data.byteLength);
          audioQueueRef.current.push(event.data);
          playNextAudio();
        } else {
          // Received text/JSON message or base64 audio
          try {
            const data = JSON.parse(event.data);
            console.log("📱 Voice chat message:", data);
            
            if (data.type === "transcript" && onTranscript) {
              onTranscript(data.text, data.isUser);
            }
          } catch (error) {
            // Check if it's base64 audio data
            if (typeof event.data === 'string' && event.data.length > 100) {
              console.log("🔊 Received base64 audio data, length:", event.data.length);
              try {
                // Convert base64 to ArrayBuffer
                const binaryString = atob(event.data);
                const arrayBuffer = new ArrayBuffer(binaryString.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < binaryString.length; i++) {
                  uint8Array[i] = binaryString.charCodeAt(i);
                }
                
                console.log("✅ Converted base64 to ArrayBuffer, size:", arrayBuffer.byteLength);
                audioQueueRef.current.push(arrayBuffer);
                playNextAudio();
              } catch (base64Error) {
                console.error("❌ Error converting base64 audio:", base64Error);
              }
            } else {
              console.log("📱 Non-JSON message received:", event.data);
            }
          }
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
        setConnectionStatus("Disconnected");
        console.log("📱 Voice chat disconnected");
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ Voice chat error:", error);
        setConnectionStatus("Error");
      };

    } catch (error) {
      console.error("❌ Failed to connect to voice chat:", error);
      setConnectionStatus("Failed");
    }
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => binary += String.fromCharCode(byte));
    return btoa(binary);
  };

  const disconnectFromAgent = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setConnectionStatus("Disconnected");
  };

  const startRecording = async () => {
    if (!isConnected) {
      console.error("❌ Cannot start recording: not connected", { isConnected });
      return;
    }

    // Resume audio context if suspended (required for modern browsers)
    if (audioContextRef.current?.state === 'suspended') {
      console.log("🔄 Resuming suspended audio context...");
      await audioContextRef.current.resume();
    }

    console.log("🎧 Audio context state:", audioContextRef.current?.state);
    
    // Send start recording message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "start_recording" }));
      console.log("📨 Sent start_recording message to server");
    }
    
    setIsRecording(true);
    console.log("🎤 Started PCM16 recording - audio processor should now capture sound");
  };

  const stopRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    setVolume(0);
    
    // Send stop recording message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop_recording" }));
    }
    
    console.log("🛑 Stopped PCM16 recording");
  };

  const playNextAudio = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    
    try {
      if (audioContextRef.current) {
        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          console.log("🔄 Resuming suspended audio context for playback...");
          await audioContextRef.current.resume();
        }
        
        console.log("🔊 Playing audio data, size:", audioData.byteLength);
        
        // Convert PCM16 data to audio buffer (backend sends raw PCM16)
        const audioBuffer = convertPCM16ToAudioBuffer(audioData);
        
        if (audioBuffer) {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          
          source.onended = () => {
            console.log("✅ Audio playback finished");
            isPlayingRef.current = false;
            playNextAudio(); // Play next audio in queue
          };
          
          if (!isMuted) {
            console.log("🔊 Starting audio playback...");
            source.start();
          } else {
            console.log("🔇 Audio muted, skipping playback");
            source.onended();
          }
        } else {
          throw new Error("Failed to create audio buffer from PCM16 data");
        }
      }
    } catch (error) {
      console.error("❌ Error playing audio:", error);
      isPlayingRef.current = false;
      playNextAudio();
    }
  };

  const convertPCM16ToAudioBuffer = (pcmData: ArrayBuffer): AudioBuffer | null => {
    if (!audioContextRef.current) {
      console.error("❌ No audio context available for PCM16 conversion");
      return null;
    }
    
    try {
      const pcmArray = new Int16Array(pcmData);
      const sampleRate = 24000; // OpenAI uses 24kHz
      const audioBuffer = audioContextRef.current.createBuffer(1, pcmArray.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      console.log("🔄 Converting PCM16 data:", {
        pcmLength: pcmArray.length,
        sampleRate: sampleRate,
        duration: (pcmArray.length / sampleRate).toFixed(2) + "s"
      });
      
      // Convert 16-bit PCM to float32 (-1.0 to 1.0)
      let maxSample = 0;
      for (let i = 0; i < pcmArray.length; i++) {
        const sample = pcmArray[i] / 32768.0;
        channelData[i] = sample;
        maxSample = Math.max(maxSample, Math.abs(sample));
      }
      
      console.log("✅ Converted PCM16 to audio buffer:", {
        samples: pcmArray.length,
        maxSample: maxSample.toFixed(4),
        hasAudio: maxSample > 0.001
      });
      
      return audioBuffer;
    } catch (error) {
      console.error("❌ Error converting PCM16:", error);
      return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <span className={`text-sm px-2 py-1 rounded ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : connectionStatus === 'Connecting...'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {connectionStatus}
          </span>
        </div>

        {/* Audio Visualization */}
        {isRecording && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Voice Level:</span>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${volume}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={connectToAgent}
              className="flex-1"
              disabled={connectionStatus === "Connecting..."}
            >
              <Phone className="h-4 w-4 mr-2" />
              Connect to Agent
            </Button>
          ) : (
            <>
              <Button 
                onClick={disconnectFromAgent}
                variant="destructive"
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}
        </div>

        {isConnected && (
          <div className="flex gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "default" : "outline"}
              className="flex-1"
              disabled={!isConnected}
            >
              {isRecording ? (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Stop Streaming
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Start Streaming
                </>
              )}
            </Button>

            <Button
              onClick={() => setIsMuted(!isMuted)}
              variant="outline"
              size="icon"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {isConnected && (
          <p className="text-xs text-gray-600 text-center">
            {isRecording ? "Streaming audio continuously - speak naturally" : "Click 'Start Streaming' to begin voice chat"}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceChat;
