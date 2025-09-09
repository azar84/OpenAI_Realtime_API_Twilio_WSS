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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallConnection = handleCallConnection;
exports.handleFrontendConnection = handleFrontendConnection;
const ws_1 = require("ws");
const functionHandlers_1 = __importDefault(require("./functionHandlers"));
const db_1 = require("./db");
let session = {};
let lastCommit = 0;
function handleCallConnection(ws, openAIApiKey) {
    // Clean up any existing connections and reset session
    closeAllConnections();
    // Initialize fresh session for new call
    session.twilioConn = ws;
    session.openAIApiKey = openAIApiKey;
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    session.saved_config = undefined;
    ws.on("message", handleTwilioMessage);
    ws.on("error", (err) => {
        console.error("Twilio WS error:", err);
        try {
            ws.close();
        }
        catch (_a) { }
    });
    ws.on("close", () => {
        cleanupConnection(session.modelConn);
        cleanupConnection(session.twilioConn);
        session.twilioConn = undefined;
        session.modelConn = undefined;
        session.streamSid = undefined;
        session.lastAssistantItem = undefined;
        session.responseStartTimestamp = undefined;
        session.latestMediaTimestamp = undefined;
        if (!session.frontendConn)
            session = {};
    });
}
function handleFrontendConnection(ws) {
    cleanupConnection(session.frontendConn);
    session.frontendConn = ws;
    ws.on("message", handleFrontendMessage);
    ws.on("close", () => {
        cleanupConnection(session.frontendConn);
        session.frontendConn = undefined;
        if (!session.twilioConn && !session.modelConn)
            session = {};
    });
}
function handleFunctionCall(item) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Handling function call:", item);
        const fnDef = functionHandlers_1.default.find((f) => f.schema.name === item.name);
        if (!fnDef) {
            throw new Error(`No handler found for function: ${item.name}`);
        }
        let args;
        try {
            args = JSON.parse(item.arguments);
        }
        catch (_a) {
            return JSON.stringify({
                error: "Invalid JSON arguments for function call.",
            });
        }
        try {
            console.log("Calling function:", fnDef.schema.name, args);
            const result = yield fnDef.handler(args);
            return result;
        }
        catch (err) {
            console.error("Error running function:", err);
            return JSON.stringify({
                error: `Error running function ${item.name}: ${err.message}`,
            });
        }
    });
}
function handleTwilioMessage(data) {
    const msg = parseMessage(data);
    if (!msg)
        return;
    switch (msg.event) {
        case "start":
            session.streamSid = msg.start.streamSid;
            session.latestMediaTimestamp = 0;
            session.lastAssistantItem = undefined;
            session.responseStartTimestamp = undefined;
            tryConnectModel();
            break;
        case "media": {
            session.latestMediaTimestamp = msg.media.timestamp;
            if (isOpen(session.modelConn)) {
                jsonSend(session.modelConn, {
                    type: "input_audio_buffer.append",
                    audio: msg.media.payload,
                });
                const now = Date.now();
                if (now - lastCommit > 120) { // ~120ms throttle
                    jsonSend(session.modelConn, { type: "input_audio_buffer.commit" });
                    lastCommit = now;
                }
            }
            break;
        }
        case "close":
            closeAllConnections();
            break;
    }
}
function handleFrontendMessage(data) {
    const msg = parseMessage(data);
    if (!msg)
        return;
    if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, msg);
    }
    if (msg.type === "session.update") {
        session.saved_config = msg.session;
    }
}
function tryConnectModel() {
    if (!session.twilioConn || !session.streamSid || !session.openAIApiKey)
        return;
    if (isOpen(session.modelConn))
        return;
    session.modelConn = new ws_1.WebSocket("wss://api.openai.com/v1/realtime?model=gpt-realtime", {
        headers: {
            Authorization: `Bearer ${session.openAIApiKey}`,
            "OpenAI-Beta": "realtime=v1",
        },
    });
    session.modelConn.on("open", () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const config = session.saved_config || {};
        // Pull DB config
        const agentConfig = yield (0, db_1.getActiveAgentConfig)();
        const voice = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.voice) || "ash";
        const instructions = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.instructions) || "You are a helpful assistant.";
        const temperature = (_a = agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.temperature) !== null && _a !== void 0 ? _a : 0.7;
        const maxOutputTokens = agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.max_tokens;
        const turnDetection = (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.turn_detection_type) || "server_vad";
        console.log('🤖 Twilio Agent Config:', {
            voice,
            instructions: instructions.substring(0, 100) + '...',
            temperature,
            maxOutputTokens,
            turnDetection
        });
        // IMPORTANT: don't let saved_config clobber your voice/params
        // Apply saved_config FIRST, then your authoritative fields after.
        const merged = Object.assign(Object.assign(Object.assign(Object.assign({}, config), { // ← anything from frontend, but may omit/old values
            // authoritative values from DB come AFTER:
            temperature }), (maxOutputTokens && { max_output_tokens: maxOutputTokens })), { voice, modalities: ["text", "audio"], turn_detection: { type: turnDetection }, instructions, input_audio_format: "g711_ulaw", output_audio_format: "g711_ulaw", input_audio_transcription: { model: "whisper-1" } });
        jsonSend(session.modelConn, { type: "session.update", session: merged });
        jsonSend(session.modelConn, { type: "session.get" }); // echo to verify
    }));
    session.modelConn.on("message", (raw) => {
        const evt = parseMessage(raw);
        if ((evt === null || evt === void 0 ? void 0 : evt.type) === "session.updated") {
            console.log("Effective session from server:", evt.session); // should show voice, temp, max_output_tokens
        }
        handleModelMessage(raw);
    });
    session.modelConn.on("error", closeModel);
    session.modelConn.on("close", closeModel);
}
function handleModelMessage(data) {
    const event = parseMessage(data);
    if (!event)
        return;
    jsonSend(session.frontendConn, event);
    switch (event.type) {
        case "input_audio_buffer.speech_started":
            handleTruncation();
            break;
        case "response.audio.delta":
            if (session.twilioConn && session.streamSid) {
                if (session.responseStartTimestamp === undefined) {
                    session.responseStartTimestamp = session.latestMediaTimestamp || 0;
                }
                if (event.item_id)
                    session.lastAssistantItem = event.item_id;
                jsonSend(session.twilioConn, {
                    event: "media",
                    streamSid: session.streamSid,
                    media: { payload: event.delta },
                });
                jsonSend(session.twilioConn, {
                    event: "mark",
                    streamSid: session.streamSid,
                });
            }
            break;
        case "response.output_item.done": {
            const { item } = event;
            if (item.type === "function_call") {
                handleFunctionCall(item)
                    .then((output) => {
                    if (session.modelConn) {
                        jsonSend(session.modelConn, {
                            type: "conversation.item.create",
                            item: {
                                type: "function_call_output",
                                call_id: item.call_id,
                                output: JSON.stringify(output),
                            },
                        });
                        jsonSend(session.modelConn, { type: "response.create" });
                    }
                })
                    .catch((err) => {
                    console.error("Error handling function call:", err);
                });
            }
            break;
        }
    }
}
function handleTruncation() {
    if (!session.lastAssistantItem ||
        session.responseStartTimestamp === undefined)
        return;
    const elapsedMs = (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
    const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;
    if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
            type: "conversation.item.truncate",
            item_id: session.lastAssistantItem,
            content_index: 0,
            audio_end_ms,
        });
    }
    if (session.twilioConn && session.streamSid) {
        jsonSend(session.twilioConn, {
            event: "clear",
            streamSid: session.streamSid,
        });
    }
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
}
function closeModel() {
    cleanupConnection(session.modelConn);
    session.modelConn = undefined;
    if (!session.twilioConn && !session.frontendConn)
        session = {};
}
function closeAllConnections() {
    if (session.twilioConn) {
        session.twilioConn.close();
        session.twilioConn = undefined;
    }
    if (session.modelConn) {
        session.modelConn.close();
        session.modelConn = undefined;
    }
    if (session.frontendConn) {
        session.frontendConn.close();
        session.frontendConn = undefined;
    }
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    session.saved_config = undefined;
}
function cleanupConnection(ws) {
    if (isOpen(ws))
        ws.close();
}
function parseMessage(data) {
    try {
        return JSON.parse(data.toString());
    }
    catch (_a) {
        return null;
    }
}
function jsonSend(ws, obj) {
    if (!isOpen(ws))
        return;
    ws.send(JSON.stringify(obj));
}
function isOpen(ws) {
    return !!ws && ws.readyState === ws_1.WebSocket.OPEN;
}
