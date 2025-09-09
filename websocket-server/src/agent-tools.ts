import { tool } from '@openai/agents/realtime';
import { z } from 'zod';

const N8N_TOOL_URL = "https://n8n.hiqsense.com/webhook-test/ad467e52-bf96-4d1a-993c-8750340853db";
const N8N_SECRET = process.env.N8N_SECRET as string;

// Weather tool - converted from get_weather_from_coords
export const weatherTool = tool({
  name: 'get_weather_from_coords',
  description: 'Get the current weather for given coordinates',
  parameters: z.object({
    latitude: z.number().describe('Latitude coordinate'),
    longitude: z.number().describe('Longitude coordinate'),
  }),
  execute: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
      );
      const data = await response.json();
      const currentTemp = data.current?.temperature_2m;
      return `Current temperature: ${currentTemp}°C`;
    } catch (error) {
      return `Error fetching weather: ${error}`;
    }
  },
});

// Customer lookup tool - converted from lookup_customer
export const customerLookupTool = tool({
  name: 'lookup_customer',
  description: 'Find a customer and recent info by phone number via n8n workflow',
  parameters: z.object({
    phone: z.string().describe('E.164 phone number'),
  }),
  execute: async ({ phone }: { phone: string }) => {
    if (!N8N_TOOL_URL) {
      throw new Error("N8N_TOOL_URL missing");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000); // 12s timeout

    try {
      const res = await fetch(N8N_TOOL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tool-Secret": N8N_SECRET ?? "",
        },
        body: JSON.stringify({ phone }),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: unknown;
      try { 
        data = JSON.parse(text); 
      } catch { 
        data = { raw: text }; 
      }

      if (!res.ok) {
        return `Error: n8n tool error (status: ${res.status}) - ${JSON.stringify(data)}`;
      }
      
      return JSON.stringify(data);
    } catch (err: any) {
      return `Error: n8n tool exception - ${String(err?.message ?? err)}`;
    } finally {
      clearTimeout(timer);
    }
  },
});

// Knowledge base tool - converted from knowldege_base
export const knowledgeBaseTool = tool({
  name: 'knowledge_base',
  description: 'Answer questions about the company, contact information, products, services, etc. Use this first before saying you don\'t have information.',
  parameters: z.object({
    query: z.string().describe('Search query to find information in the knowledge base'),
  }),
  execute: async ({ query }: { query: string }) => {
    const knowledgeBaseUrl = "https://n8n.hiqsense.com/webhook/868f0106-771a-48e1-8f89-387558424747";
    
    if (!knowledgeBaseUrl) {
      throw new Error("Knowledge base URL missing");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    try {
      const res = await fetch(knowledgeBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tool-Secret": N8N_SECRET ?? "",
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: unknown;
      try { 
        data = JSON.parse(text); 
      } catch { 
        data = { raw: text }; 
      }

      if (!res.ok) {
        return `Error: knowledge base error (status: ${res.status}) - ${JSON.stringify(data)}`;
      }
      
      return JSON.stringify(data);
    } catch (err: any) {
      return `Error: knowledge base exception - ${String(err?.message ?? err)}`;
    } finally {
      clearTimeout(timer);
    }
  },
});

// Export all tools as an array
export const agentTools = [
  weatherTool,
  customerLookupTool,
  knowledgeBaseTool,
];
