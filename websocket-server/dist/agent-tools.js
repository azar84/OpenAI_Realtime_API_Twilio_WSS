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
exports.getAllTools = exports.getEnabledToolsForWebRTC = exports.getEnabledToolsForTwilio = exports.getAvailableToolNames = exports.TOOL_REGISTRY = void 0;
const openai_1 = __importDefault(require("openai"));
// ============================================================================
// UNIFIED TOOL SYSTEM - Works for both Twilio and WebRTC
// ============================================================================
// Knowledge Base Tool (FunctionHandler format)
const knowledgeBaseTool = {
    schema: {
        name: 'knowledge_base',
        type: 'function',
        description: 'Search the company knowledge base for information about products, services, policies, and procedures. Use this first before saying you don\'t have information.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query to find information in the knowledge base'
                }
            },
            required: ['query']
        }
    },
    handler: (_a) => __awaiter(void 0, [_a], void 0, function* ({ query }) {
        console.log(`🔍 Knowledge Base Tool Called with query: "${query}"`);
        try {
            // Initialize OpenAI client here to ensure environment variables are loaded
            const client = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY,
            });
            const r = yield client.responses.create({
                model: "gpt-4o-mini",
                input: `Answer with citations: ${query}`,
                tools: [{ type: "file_search", vector_store_ids: ["vs_68c5858c715c8191b6833a03279a0623"] }],
                include: ["file_search_call.results"]
            });
            return JSON.stringify({
                text: r.output_text,
                raw: r,
                message: "Knowledge base search completed successfully"
            });
        }
        catch (error) {
            console.error('❌ Knowledge Base Tool Error:', error);
            return JSON.stringify({
                error: `Knowledge base search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                message: "Failed to search knowledge base"
            });
        }
    })
};
// Weather Tool (FunctionHandler format)
const weatherTool = {
    schema: {
        name: 'weather',
        type: 'function',
        description: 'Get current weather information for a location',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'City name or location to get weather for'
                }
            },
            required: ['location']
        }
    },
    handler: (_a) => __awaiter(void 0, [_a], void 0, function* ({ location }) {
        console.log(`🌤️ Weather Tool Called for: ${location}`);
        return JSON.stringify({
            location,
            temperature: "72°F",
            condition: "Sunny",
            message: "This is a placeholder weather tool"
        });
    })
};
// Customer Lookup Tool (FunctionHandler format)
const customerLookupTool = {
    schema: {
        name: 'customer_lookup',
        type: 'function',
        description: 'Look up customer information by ID or phone number',
        parameters: {
            type: 'object',
            properties: {
                identifier: {
                    type: 'string',
                    description: 'Customer ID or phone number to look up'
                }
            },
            required: ['identifier']
        }
    },
    handler: (_a) => __awaiter(void 0, [_a], void 0, function* ({ identifier }) {
        console.log(`👤 Customer Lookup Tool Called for: ${identifier}`);
        return JSON.stringify({
            identifier,
            name: "John Doe",
            email: "john@example.com",
            message: "This is a placeholder customer lookup tool"
        });
    })
};
// ============================================================================
// TOOL REGISTRY - Map tool names to their implementations
// ============================================================================
exports.TOOL_REGISTRY = {
    knowledge_base: knowledgeBaseTool,
    weather: weatherTool,
    customer_lookup: customerLookupTool,
};
// ============================================================================
// UNIFIED TOOL MANAGEMENT
// ============================================================================
/**
 * Get all available tool names
 */
const getAvailableToolNames = () => {
    return Object.keys(exports.TOOL_REGISTRY);
};
exports.getAvailableToolNames = getAvailableToolNames;
/**
 * Get enabled tools for Twilio (Realtime API format)
 */
const getEnabledToolsForTwilio = (enabledToolNames) => {
    const tools = [];
    for (const toolName of enabledToolNames) {
        if (exports.TOOL_REGISTRY[toolName]) {
            const tool = exports.TOOL_REGISTRY[toolName];
            // Convert to Realtime API format
            tools.push({
                type: "function",
                name: tool.schema.name,
                description: tool.schema.description,
                parameters: tool.schema.parameters
            });
            console.log(`✅ Twilio Tool '${toolName}' loaded successfully`);
        }
        else {
            console.warn(`⚠️ Tool '${toolName}' not found in registry`);
        }
    }
    console.log(`🔧 Loaded ${tools.length} enabled tools for Twilio:`, enabledToolNames);
    return tools;
};
exports.getEnabledToolsForTwilio = getEnabledToolsForTwilio;
/**
 * Get enabled tools for WebRTC (converted to WebRTC format)
 */
const getEnabledToolsForWebRTC = (enabledToolNames) => {
    const tools = [];
    for (const toolName of enabledToolNames) {
        if (exports.TOOL_REGISTRY[toolName]) {
            const tool = exports.TOOL_REGISTRY[toolName];
            // Convert FunctionHandler format to WebRTC format
            tools.push(tool.schema);
            console.log(`✅ WebRTC Tool '${toolName}' loaded successfully`);
        }
        else {
            console.warn(`⚠️ Tool '${toolName}' not found in registry`);
        }
    }
    console.log(`🔧 Loaded ${tools.length} enabled tools for WebRTC:`, enabledToolNames);
    return tools;
};
exports.getEnabledToolsForWebRTC = getEnabledToolsForWebRTC;
/**
 * Get all available tools (for testing/development)
 */
const getAllTools = () => {
    const allToolNames = (0, exports.getAvailableToolNames)();
    return {
        twilio: (0, exports.getEnabledToolsForTwilio)(allToolNames),
        webrtc: (0, exports.getEnabledToolsForWebRTC)(allToolNames)
    };
};
exports.getAllTools = getAllTools;
