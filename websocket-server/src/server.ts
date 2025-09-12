import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import cors from "cors";
import {
  handleCallConnection,
  handleFrontendConnection,
} from "./twilio-handler";
import { agentTools } from "./agent-tools";
import { testConnection } from "./db";
import { getEphemeralKey } from "./ephemeral";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8081", 10);
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.urlencoded({ extended: false }));

// Add ephemeral key endpoint
app.get('/api/ephemeral', async (req, res) => {
  await getEphemeralKey(req, res);
});

const twimlPath = join(__dirname, "twiml.xml");
const twimlTemplate = readFileSync(twimlPath, "utf-8");

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
  res.json(agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  })));
});

// Note: reload configuration endpoint is disabled in baseline restore

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

// Function to broadcast to logs WebSocket
function broadcastToLogs(message: any) {
  if (currentLogs && currentLogs.readyState === WebSocket.OPEN) {
    currentLogs.send(JSON.stringify(message));
  }
}

// Make broadcastToLogs available globally
(global as any).broadcastToLogs = broadcastToLogs;

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
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
      if (currentCall) currentCall.close();
      currentCall = ws;
      await handleCallConnection(currentCall, OPENAI_API_KEY);
    } else if (type === "logs") {
      if (currentLogs) currentLogs.close();
      currentLogs = ws;
      handleFrontendConnection(currentLogs);
    } else {
      ws.close();
    }
  } catch (error) {
    console.error(`Error handling ${type} connection:`, error);
    ws.close();
  }
});

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Test database connection
  await testConnection();
});

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
