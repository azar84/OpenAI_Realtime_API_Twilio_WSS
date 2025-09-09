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
exports.handleCallConnection = handleCallConnection;
exports.handleFrontendConnection = handleFrontendConnection;
exports.handleVoiceChatConnection = handleVoiceChatConnection;
const ws_1 = require("ws");
const realtime_1 = require("@openai/agents/realtime");
const agents_extensions_1 = require("@openai/agents-extensions");
const agent_tools_1 = require("./agent-tools");
const db_1 = require("./db");
function handleCallConnection(ws, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Creating Twilio call connection with Agent SDK...');
        try {
            // Get agent configuration from database
            const agentConfig = yield (0, db_1.getActiveAgentConfig)();
            const enabledTools = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.enabled_tools) || [];
            // Filter tools based on enabled tools from database
            const toolsToUse = agent_tools_1.agentTools.filter(tool => enabledTools.includes(tool.name));
            // Create agent with configuration from database
            const twilioAgentName = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.name) || 'Twilio Agent';
            const twilioBaseInstructions = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.instructions) || 'You are a helpful assistant.';
            const twilioInstructions = `Your name is ${twilioAgentName}. ${twilioBaseInstructions}`;
            const agent = new realtime_1.RealtimeAgent({
                name: twilioAgentName,
                instructions: twilioInstructions,
                tools: toolsToUse,
            });
            // Create Twilio transport layer
            const twilioTransport = new agents_extensions_1.TwilioRealtimeTransportLayer({
                twilioWebSocket: ws,
            });
            // Create session with Twilio transport
            const session = new realtime_1.RealtimeSession(agent, {
                transport: twilioTransport,
                model: 'gpt-realtime',
                config: {
                    modelSettings: Object.assign({ temperature: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.temperature) || 0.7 }, ((agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.max_tokens) ? { maxTokens: agentConfig.max_tokens } : {})),
                    audio: {
                        output: {
                            voice: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.voice) || 'verse',
                        },
                    },
                },
            }); // Use 'as any' to bypass TypeScript errors and test runtime behavior
            // Set up history tracking for frontend
            session.on('history_updated', (history) => {
                console.log('Twilio History updated:', history.length, 'items');
                // Send history updates to frontend via logs WebSocket
                const broadcastToLogs = global.broadcastToLogs;
                if (broadcastToLogs) {
                    broadcastToLogs({
                        type: 'history_updated',
                        history: history
                    });
                }
            });
            // Connect to OpenAI
            yield session.connect({ apiKey });
            console.log('Twilio call connected with Agent SDK');
            // Set up WebSocket event forwarding for logs
            ws.on('close', () => {
                console.log('Twilio call connection closed');
            });
            ws.on('error', (error) => {
                console.error('Twilio call connection error:', error);
            });
        }
        catch (error) {
            console.error('Error creating Twilio call connection:', error);
            ws.close();
        }
    });
}
function handleFrontendConnection(ws) {
    console.log('Frontend connection established (logs)');
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('Frontend message:', message);
        }
        catch (error) {
            console.error('Error parsing frontend message:', error);
        }
    });
    ws.on('close', () => {
        console.log('Frontend connection closed');
    });
    ws.on('error', (error) => {
        console.error('Frontend connection error:', error);
    });
}
function handleVoiceChatConnection(ws, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Handling voice chat connection...');
        try {
            // Get agent configuration from database
            const agentConfig = yield (0, db_1.getActiveAgentConfig)();
            const enabledTools = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.enabled_tools) || [];
            // Filter tools based on enabled tools from database
            const toolsToUse = agent_tools_1.agentTools.filter(tool => enabledTools.includes(tool.name));
            // Create agent with configuration from database
            const voiceAgentName = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.name) || 'Voice Chat Agent';
            const voiceBaseInstructions = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.instructions) || 'You are a helpful assistant.';
            const voiceInstructions = `Your name is ${voiceAgentName}. ${voiceBaseInstructions}`;
            const agent = new realtime_1.RealtimeAgent({
                name: voiceAgentName,
                instructions: voiceInstructions,
                tools: toolsToUse,
            });
            // Create session for tool calling
            const session = new realtime_1.RealtimeSession(agent, {
                model: 'gpt-realtime',
                config: {
                    modelSettings: Object.assign({ temperature: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.temperature) || 0.7 }, ((agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.max_tokens) ? { maxTokens: agentConfig.max_tokens } : {})),
                    audio: {
                        input: {
                            format: 'pcm16',
                        },
                        output: {
                            voice: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.voice) || 'verse',
                        },
                    },
                },
            }); // Use 'as any' to bypass TypeScript errors and test runtime behavior
            // Set up history tracking for frontend
            session.on('history_updated', (history) => {
                console.log('Voice chat history updated:', history);
                // Send history updates to frontend via logs WebSocket
                const broadcastToLogs = global.broadcastToLogs;
                if (broadcastToLogs) {
                    broadcastToLogs({
                        type: 'history_updated',
                        history: history
                    });
                }
            });
            // Set up audio event handling for frontend playback
            session.on('audio', (audioEvent) => {
                console.log('🎵 Voice chat audio event received:', audioEvent);
                console.log('🎵 Audio event type:', typeof audioEvent);
                console.log('🎵 Audio event keys:', Object.keys(audioEvent));
                // Forward audio data to frontend WebSocket
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    try {
                        // The audioEvent should be a TransportLayerAudio with data property
                        const audioData = audioEvent.data;
                        console.log('🎵 Audio data type:', typeof audioData);
                        console.log('🎵 Audio data constructor:', audioData.constructor.name);
                        console.log('🎵 Audio data byteLength:', audioData.byteLength);
                        // Convert ArrayBuffer to base64 and send to frontend
                        const base64Audio = Buffer.from(audioData).toString('base64');
                        ws.send(base64Audio);
                        console.log('✅ Audio data sent to frontend, size:', audioData.byteLength, 'base64 length:', base64Audio.length);
                    }
                    catch (error) {
                        console.error('❌ Error sending audio to frontend:', error);
                    }
                }
                else {
                    console.log('⚠️ WebSocket not ready, cannot send audio');
                }
            });
            // Connect to OpenAI
            yield session.connect({ apiKey });
            // Add debugging for all session events
            console.log('Setting up session event listeners...');
            session.on('audio_start', () => console.log('🎵 Audio started'));
            session.on('audio_stopped', () => console.log('🎵 Audio stopped'));
            session.on('audio_interrupted', () => console.log('🎵 Audio interrupted'));
            session.on('error', (error) => console.error('❌ Session error:', error));
            let isRecording = false;
            let audioChunks = [];
            let lastProcessTime = 0;
            ws.on('message', (data) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
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
                            lastProcessTime = Date.now();
                        }
                        else if (controlMessage.type === 'stop_recording') {
                            console.log('Stopping voice chat recording...');
                            isRecording = false;
                            // Process accumulated audio buffer
                            if (audioChunks.length > 0) {
                                console.log('Processing accumulated audio buffer...');
                                // Combine audio chunks
                                const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                                const combinedBuffer = new ArrayBuffer(totalLength);
                                const combinedView = new Uint8Array(combinedBuffer);
                                let offset = 0;
                                for (const chunk of audioChunks) {
                                    combinedView.set(new Uint8Array(chunk), offset);
                                    offset += chunk.byteLength;
                                }
                                // Send audio to Agent SDK for processing
                                try {
                                    console.log('Sending final audio to Agent SDK...');
                                    (_b = (_a = session).sendAudio) === null || _b === void 0 ? void 0 : _b.call(_a, combinedBuffer);
                                    console.log('Final audio sent to Agent SDK successfully');
                                }
                                catch (error) {
                                    console.error('Error sending final audio to Agent SDK:', error);
                                }
                                // Clear the audio chunks
                                audioChunks = [];
                            }
                        }
                    }
                    else {
                        // It's audio data (base64 encoded PCM16) - process continuously
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
                        // Process audio every 2 seconds or when we have enough data
                        const now = Date.now();
                        if (now - lastProcessTime > 2000 || audioChunks.length > 10) {
                            console.log('Processing audio chunks...');
                            // Combine audio chunks
                            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                            const combinedBuffer = new ArrayBuffer(totalLength);
                            const combinedView = new Uint8Array(combinedBuffer);
                            let offset = 0;
                            for (const chunk of audioChunks) {
                                combinedView.set(new Uint8Array(chunk), offset);
                                offset += chunk.byteLength;
                            }
                            // Send audio to Agent SDK for processing
                            try {
                                console.log('Sending audio to Agent SDK...');
                                (_d = (_c = session).sendAudio) === null || _d === void 0 ? void 0 : _d.call(_c, combinedBuffer);
                                console.log('Audio sent to Agent SDK successfully');
                            }
                            catch (error) {
                                console.error('Error sending audio to Agent SDK:', error);
                            }
                            // Clear the audio chunks
                            audioChunks = [];
                            lastProcessTime = now;
                        }
                    }
                }
                catch (error) {
                    console.error('Error handling voice chat message:', error);
                }
            }));
            ws.on('close', () => {
                console.log('Voice chat connection closed');
            });
            ws.on('error', (error) => {
                console.error('Voice chat connection error:', error);
            });
            console.log('Voice chat handler ready');
        }
        catch (error) {
            console.error('Error creating voice chat connection:', error);
            ws.close();
        }
    });
}
