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
exports.createTwilioSession = createTwilioSession;
exports.getActiveSession = getActiveSession;
exports.closeSession = closeSession;
exports.closeAllSessions = closeAllSessions;
exports.handleFrontendConnection = handleFrontendConnection;
const realtime_1 = require("@openai/agents/realtime");
const agents_extensions_1 = require("@openai/agents-extensions");
const agent_tools_1 = require("./agent-tools");
const db_1 = require("./db");
const activeSessions = new Map();
function createTwilioSession(ws, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Creating Twilio session with Agent SDK...');
        // Get agent configuration from database
        const agentConfig = yield (0, db_1.getActiveAgentConfig)();
        const enabledTools = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.enabled_tools) || [];
        // Filter tools based on enabled tools from database
        const toolsToUse = agent_tools_1.agentTools.filter(tool => enabledTools.includes(tool.name));
        // Create agent with configuration from database
        const agent = new realtime_1.RealtimeAgent({
            name: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.name) || 'Twilio Agent',
            instructions: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.instructions) || 'You are a helpful assistant.',
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
                audio: {
                    output: {
                        voice: (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.voice) || 'verse',
                    },
                },
            },
        });
        // Set up event listeners
        setupSessionEventListeners(session, 'twilio', ws);
        // Connect to OpenAI
        yield session.connect({ apiKey });
        const agentSession = {
            session,
            agent,
            type: 'twilio',
            ws,
        };
        const sessionId = `twilio-${Date.now()}`;
        activeSessions.set(sessionId, agentSession);
        console.log('Twilio session created and connected');
        return agentSession;
    });
}
function setupSessionEventListeners(session, type, ws) {
    // Tool call events - using any type for now as the Agent SDK types may not be fully exposed
    session.on('tool_call_started', (toolCall) => {
        console.log(`[${type}] Tool call started:`, toolCall === null || toolCall === void 0 ? void 0 : toolCall.name);
        // Send to frontend for transcript display
        if (ws && type === 'twilio') {
            ws.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "function_call",
                    id: (toolCall === null || toolCall === void 0 ? void 0 : toolCall.id) || `call_${Date.now()}`,
                    call_id: (toolCall === null || toolCall === void 0 ? void 0 : toolCall.id) || `call_${Date.now()}`,
                    name: toolCall === null || toolCall === void 0 ? void 0 : toolCall.name,
                    arguments: JSON.stringify((toolCall === null || toolCall === void 0 ? void 0 : toolCall.parameters) || {}),
                    status: "running"
                }
            }));
        }
    });
    session.on('tool_call_completed', (toolCall) => {
        console.log(`[${type}] Tool call completed:`, toolCall === null || toolCall === void 0 ? void 0 : toolCall.name);
        // Send completion to frontend
        if (ws && type === 'twilio') {
            ws.send(JSON.stringify({
                type: "conversation.item.update",
                item: {
                    type: "function_call",
                    id: (toolCall === null || toolCall === void 0 ? void 0 : toolCall.id) || `call_${Date.now()}`,
                    call_id: (toolCall === null || toolCall === void 0 ? void 0 : toolCall.id) || `call_${Date.now()}`,
                    name: toolCall === null || toolCall === void 0 ? void 0 : toolCall.name,
                    status: "completed"
                }
            }));
        }
    });
    session.on('tool_call_failed', (toolCall, error) => {
        console.error(`[${type}] Tool call failed:`, toolCall === null || toolCall === void 0 ? void 0 : toolCall.name, error);
        // Send failure to frontend
        if (ws && type === 'twilio') {
            ws.send(JSON.stringify({
                type: "conversation.item.update",
                item: {
                    type: "function_call",
                    id: (toolCall === null || toolCall === void 0 ? void 0 : toolCall.id) || `call_${Date.now()}`,
                    call_id: (toolCall === null || toolCall === void 0 ? void 0 : toolCall.id) || `call_${Date.now()}`,
                    name: toolCall === null || toolCall === void 0 ? void 0 : toolCall.name,
                    status: "failed"
                }
            }));
        }
    });
    // Session events
    session.on('session_updated', (sessionData) => {
        console.log(`[${type}] Session updated:`, sessionData === null || sessionData === void 0 ? void 0 : sessionData.id);
    });
    session.on('session_ended', (sessionData) => {
        console.log(`[${type}] Session ended:`, sessionData === null || sessionData === void 0 ? void 0 : sessionData.id);
    });
    // Error handling
    session.on('error', (error) => {
        console.error(`[${type}] Session error:`, error);
    });
    // For Twilio sessions, listen to raw Twilio events
    if (type === 'twilio') {
        session.on('transport_event', (event) => {
            if ((event === null || event === void 0 ? void 0 : event.type) === 'twilio_message') {
                console.log(`[${type}] Twilio event:`, event === null || event === void 0 ? void 0 : event.message);
            }
        });
    }
    // Listen for transcript events and forward to frontend
    session.on('response.audio_transcript.delta', (event) => {
        console.log(`[${type}] Transcript delta:`, event);
        if (ws && type === 'twilio') {
            ws.send(JSON.stringify({
                type: "response.audio_transcript.delta",
                item_id: (event === null || event === void 0 ? void 0 : event.item_id) || `item_${Date.now()}`,
                delta: (event === null || event === void 0 ? void 0 : event.delta) || '',
                output_index: (event === null || event === void 0 ? void 0 : event.output_index) || 0
            }));
        }
    });
    session.on('response.audio_transcript.done', (event) => {
        console.log(`[${type}] Transcript done:`, event);
        if (ws && type === 'twilio') {
            ws.send(JSON.stringify({
                type: "response.audio_transcript.done",
                item_id: (event === null || event === void 0 ? void 0 : event.item_id) || `item_${Date.now()}`,
                transcript: (event === null || event === void 0 ? void 0 : event.transcript) || ''
            }));
        }
    });
    session.on('response.output_item.done', (event) => {
        var _a;
        console.log(`[${type}] Output item done:`, event);
        if (ws && type === 'twilio' && ((_a = event === null || event === void 0 ? void 0 : event.item) === null || _a === void 0 ? void 0 : _a.type) === 'function_call') {
            ws.send(JSON.stringify({
                type: "response.output_item.done",
                item: event.item
            }));
        }
    });
}
function getActiveSession(type) {
    return Array.from(activeSessions.values()).find(session => session.type === type);
}
function closeSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
        // Close the WebSocket connection instead of calling disconnect
        session.ws.close();
        activeSessions.delete(sessionId);
        console.log(`Session ${sessionId} closed`);
    }
}
function closeAllSessions() {
    for (const [sessionId, session] of activeSessions) {
        // Close the WebSocket connection instead of calling disconnect
        session.ws.close();
        console.log(`Session ${sessionId} closed`);
    }
    activeSessions.clear();
}
// Legacy function for frontend logs (keeping for compatibility)
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
