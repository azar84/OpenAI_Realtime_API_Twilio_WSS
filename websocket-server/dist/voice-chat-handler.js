"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVoiceChatConnection = handleVoiceChatConnection;
const realtime_1 = require("@openai/agents/realtime");
const agent_tools_1 = require("./agent-tools");
const db_1 = require("./db");
function handleVoiceChatConnection(ws, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Handling voice chat connection...');
        // Get agent configuration from database
        const agentConfig = yield (0, db_1.getActiveAgentConfig)();
        const enabledTools = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.enabled_tools) || [];
        // Filter tools based on enabled tools from database
        const toolsToUse = agent_tools_1.agentTools.filter(tool => enabledTools.includes(tool.name));
        // Create agent with configuration from database
        const agent = new realtime_1.RealtimeAgent({
            name: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.name) || 'Voice Chat Agent',
            instructions: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.instructions) || 'You are a helpful assistant.',
            tools: toolsToUse,
        });
        // Create session for tool calling (but not for audio)
        const session = new realtime_1.RealtimeSession(agent, {
            model: 'gpt-realtime',
            config: {
                audio: {
                    output: {
                        voice: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.voice) || 'verse',
                    },
                },
            },
        });
        // Connect to OpenAI for tool calling
        yield session.connect({ apiKey });
        let isRecording = false;
        let audioChunks = [];
        ws.on('message', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const message = data.toString();
                // Check if it's a JSON message (control message)
                if (message.startsWith('{')) {
                    const controlMessage = JSON.parse(message);
                    console.log('Voice chat control message:', controlMessage);
                    if (controlMessage.type === 'start_recording') {
                        console.log('Starting voice chat recording...');
                        isRecording = true;
                        audioChunks = [];
                    }
                    else if (controlMessage.type === 'stop_recording') {
                        console.log('Stopping voice chat recording...');
                        isRecording = false;
                        // Process accumulated audio buffer
                        if (audioChunks.length > 0) {
                            console.log('Processing accumulated audio buffer...');
                            // Combine all audio chunks
                            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                            const combinedBuffer = new ArrayBuffer(totalLength);
                            const combinedView = new Uint8Array(combinedBuffer);
                            let offset = 0;
                            for (const chunk of audioChunks) {
                                combinedView.set(new Uint8Array(chunk), offset);
                                offset += chunk.byteLength;
                            }
                            // For now, send a simple response
                            // In a real implementation, you would process the audio with the Agent SDK
                            const response = "I received your voice message. How can I help you?";
                            // Send text response back
                            ws.send(JSON.stringify({
                                type: "transcript",
                                text: response,
                                isUser: false
                            }));
                            // Clear the audio chunks
                            audioChunks = [];
                        }
                    }
                }
                else {
                    // It's audio data (base64 encoded PCM16)
                    if (isRecording) {
                        console.log('Received audio data for voice chat, length:', message.length);
                        // Convert base64 to ArrayBuffer
                        const binaryString = atob(message);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const audioBuffer = bytes.buffer;
                        // Store audio data for processing
                        audioChunks.push(audioBuffer);
                    }
                }
            }
            catch (error) {
                console.error('Error handling voice chat message:', error);
            }
        }));
        ws.on('close', () => {
            console.log('Voice chat connection closed');
            // The Agent SDK doesn't have a disconnect method, just close the WebSocket
        });
        ws.on('error', (error) => {
            console.error('Voice chat connection error:', error);
        });
        console.log('Voice chat handler ready');
    });
}
