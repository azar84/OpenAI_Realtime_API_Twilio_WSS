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
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const fs_1 = require("fs");
const path_1 = require("path");
const cors_1 = __importDefault(require("cors"));
const simple_session_manager_1 = require("./simple-session-manager");
const agent_tools_1 = require("./agent-tools");
const db_1 = require("./db");
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || "8081", 10);
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is required");
    process.exit(1);
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
app.use(express_1.default.urlencoded({ extended: false }));
const twimlPath = (0, path_1.join)(__dirname, "twiml.xml");
const twimlTemplate = (0, fs_1.readFileSync)(twimlPath, "utf-8");
app.get("/public-url", (req, res) => {
    res.json({ publicUrl: PUBLIC_URL });
});
app.all("/twiml", (req, res) => {
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/call`;
    const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
    res.type("text/xml").send(twimlContent);
});
// New endpoint to list available tools (schemas)
app.get("/tools", (req, res) => {
    res.json(agent_tools_1.agentTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
    })));
});
// Note: reload configuration endpoint is disabled in baseline restore
let currentCall = null;
let currentLogs = null;
let currentVoiceChat = null;
// Function to broadcast to logs WebSocket
function broadcastToLogs(message) {
    if (currentLogs && currentLogs.readyState === ws_1.WebSocket.OPEN) {
        currentLogs.send(JSON.stringify(message));
    }
}
// Make broadcastToLogs available globally
global.broadcastToLogs = broadcastToLogs;
wss.on("connection", (ws, req) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔌 NEW WEBSOCKET CONNECTION:", req.url);
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 1) {
        ws.close();
        return;
    }
    const type = parts[0];
    try {
        if (type === "call") {
            if (currentCall)
                currentCall.close();
            currentCall = ws;
            yield (0, simple_session_manager_1.handleCallConnection)(currentCall, OPENAI_API_KEY);
        }
        else if (type === "logs") {
            if (currentLogs)
                currentLogs.close();
            currentLogs = ws;
            (0, simple_session_manager_1.handleFrontendConnection)(currentLogs);
        }
        else if (type === "voice-chat") {
            if (currentVoiceChat)
                currentVoiceChat.close();
            currentVoiceChat = ws;
            yield (0, simple_session_manager_1.handleVoiceChatConnection)(currentVoiceChat, OPENAI_API_KEY);
        }
        else {
            ws.close();
        }
    }
    catch (error) {
        console.error(`Error handling ${type} connection:`, error);
        ws.close();
    }
}));
server.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server running on http://localhost:${PORT}`);
    // Test database connection
    yield (0, db_1.testConnection)();
}));
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
