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
import { 
  testConnection, 
  getAllAgentConfigs, 
  getAgentConfigById,
  createAgentConfig, 
  updateAgentConfig, 
  deleteAgentConfig, 
  activateAgentConfig, 
  getPersonalityOptions,
  createPersonalityOption,
  updatePersonalityOption,
  deletePersonalityOption,
  getLanguages
} from "./db";
import { getEphemeralKey } from "./ephemeral";
import agentInstructions from "./agent-instructions";

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
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: false }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Add ephemeral key endpoint
app.get('/api/ephemeral', async (req, res) => {
  await getEphemeralKey(req, res);
});

// Add agent instructions endpoint
app.get('/api/agent-instructions', async (req, res) => {
  try {
    const instructions = await agentInstructions();
    res.json({ instructions });
  } catch (error) {
    console.error('Error getting agent instructions:', error);
    res.status(500).json({ error: 'Failed to get agent instructions' });
  }
});

// Add agent instructions for specific configuration endpoint
app.get('/api/agent-instructions/:configId', async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const instructions = await agentInstructions(configId);
    res.json({ instructions });
  } catch (error) {
    console.error('Error getting agent instructions for config:', error);
    res.status(500).json({ error: 'Failed to get agent instructions' });
  }
});

// Configuration management endpoints
app.get('/api/configurations', async (req, res) => {
  try {
    const configs = await getAllAgentConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

app.post('/api/configurations', async (req, res) => {
  try {
    const configData = req.body;
    const newConfig = await createAgentConfig(configData);
    res.json(newConfig);
  } catch (error) {
    console.error('Error creating configuration:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

app.put('/api/configurations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const configData = req.body;
    
    console.log('=== PUT /api/configurations/:id ===');
    console.log('ID:', id);
    console.log('Config Data:', JSON.stringify(configData, null, 2));
    console.log('About to call updateAgentConfig...');
    
    const updatedConfig = await updateAgentConfig(id, configData);
    console.log('Update successful! Result:', JSON.stringify(updatedConfig, null, 2));
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('=== ERROR in PUT /api/configurations/:id ===');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.delete('/api/configurations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteAgentConfig(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

app.post('/api/configurations/:id/activate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await activateAgentConfig(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error activating configuration:', error);
    res.status(500).json({ error: 'Failed to activate configuration' });
  }
});

app.get('/api/personality-options', async (req, res) => {
  try {
    const options = await getPersonalityOptions();
    res.json(options);
  } catch (error) {
    console.error('Error fetching personality options:', error);
    res.status(500).json({ error: 'Failed to fetch personality options' });
  }
});

app.post('/api/personality-options', async (req, res) => {
  try {
    const optionData = req.body;
    const newOption = await createPersonalityOption(optionData);
    res.json(newOption);
  } catch (error) {
    console.error('Error creating personality option:', error);
    res.status(500).json({ error: 'Failed to create personality option' });
  }
});

app.put('/api/personality-options/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const optionData = req.body;
    const updatedOption = await updatePersonalityOption(id, optionData);
    res.json(updatedOption);
  } catch (error) {
    console.error('Error updating personality option:', error);
    res.status(500).json({ error: 'Failed to update personality option' });
  }
});

app.delete('/api/personality-options/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deletePersonalityOption(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting personality option:', error);
    res.status(500).json({ error: 'Failed to delete personality option' });
  }
});

app.get('/api/languages', async (req, res) => {
  try {
    const languages = await getLanguages();
    res.json(languages);
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
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
