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
exports.agentTools = exports.knowledgeBaseTool = exports.customerLookupTool = exports.weatherTool = void 0;
const realtime_1 = require("@openai/agents/realtime");
const zod_1 = require("zod");
const N8N_TOOL_URL = "https://n8n.hiqsense.com/webhook-test/ad467e52-bf96-4d1a-993c-8750340853db";
const N8N_SECRET = process.env.N8N_SECRET;
// Weather tool - converted from get_weather_from_coords
exports.weatherTool = (0, realtime_1.tool)({
    name: 'get_weather_from_coords',
    description: 'Get the current weather for given coordinates',
    parameters: zod_1.z.object({
        latitude: zod_1.z.number().describe('Latitude coordinate'),
        longitude: zod_1.z.number().describe('Longitude coordinate'),
    }),
    execute: (_a) => __awaiter(void 0, [_a], void 0, function* ({ latitude, longitude }) {
        var _b;
        try {
            const response = yield fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`);
            const data = yield response.json();
            const currentTemp = (_b = data.current) === null || _b === void 0 ? void 0 : _b.temperature_2m;
            return `Current temperature: ${currentTemp}°C`;
        }
        catch (error) {
            return `Error fetching weather: ${error}`;
        }
    }),
});
// Customer lookup tool - converted from lookup_customer
exports.customerLookupTool = (0, realtime_1.tool)({
    name: 'lookup_customer',
    description: 'Find a customer and recent info by phone number via n8n workflow',
    parameters: zod_1.z.object({
        phone: zod_1.z.string().describe('E.164 phone number'),
    }),
    execute: (_a) => __awaiter(void 0, [_a], void 0, function* ({ phone }) {
        var _b;
        if (!N8N_TOOL_URL) {
            throw new Error("N8N_TOOL_URL missing");
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000); // 12s timeout
        try {
            const res = yield fetch(N8N_TOOL_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Tool-Secret": N8N_SECRET !== null && N8N_SECRET !== void 0 ? N8N_SECRET : "",
                },
                body: JSON.stringify({ phone }),
                signal: controller.signal,
            });
            const text = yield res.text();
            let data;
            try {
                data = JSON.parse(text);
            }
            catch (_c) {
                data = { raw: text };
            }
            if (!res.ok) {
                return `Error: n8n tool error (status: ${res.status}) - ${JSON.stringify(data)}`;
            }
            return JSON.stringify(data);
        }
        catch (err) {
            return `Error: n8n tool exception - ${String((_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : err)}`;
        }
        finally {
            clearTimeout(timer);
        }
    }),
});
// Knowledge base tool - converted from knowldege_base
exports.knowledgeBaseTool = (0, realtime_1.tool)({
    name: 'knowledge_base',
    description: 'Answer questions about the company, contact information, products, services, etc. Use this first before saying you don\'t have information.',
    parameters: zod_1.z.object({
        query: zod_1.z.string().describe('Search query to find information in the knowledge base'),
    }),
    execute: (_a) => __awaiter(void 0, [_a], void 0, function* ({ query }) {
        var _b;
        const knowledgeBaseUrl = "https://n8n.hiqsense.com/webhook/868f0106-771a-48e1-8f89-387558424747";
        if (!knowledgeBaseUrl) {
            throw new Error("Knowledge base URL missing");
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000); // 30s timeout
        try {
            const res = yield fetch(knowledgeBaseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Tool-Secret": N8N_SECRET !== null && N8N_SECRET !== void 0 ? N8N_SECRET : "",
                },
                body: JSON.stringify({ query }),
                signal: controller.signal,
            });
            const text = yield res.text();
            let data;
            try {
                data = JSON.parse(text);
            }
            catch (_c) {
                data = { raw: text };
            }
            if (!res.ok) {
                return `Error: knowledge base error (status: ${res.status}) - ${JSON.stringify(data)}`;
            }
            return JSON.stringify(data);
        }
        catch (err) {
            return `Error: knowledge base exception - ${String((_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : err)}`;
        }
        finally {
            clearTimeout(timer);
        }
    }),
});
// Export all tools as an array
exports.agentTools = [
    exports.weatherTool,
    exports.customerLookupTool,
    exports.knowledgeBaseTool,
];
