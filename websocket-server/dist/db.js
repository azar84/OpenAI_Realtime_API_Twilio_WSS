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
exports.getDbClient = getDbClient;
exports.query = query;
exports.getActiveAgentConfig = getActiveAgentConfig;
exports.getEnabledToolDefinitions = getEnabledToolDefinitions;
exports.testConnection = testConnection;
exports.closePool = closePool;
const pg_1 = require("pg");
// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'openai_realtime_db',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
    max: 10, // Smaller pool for websocket server
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
// Create a connection pool
const pool = new pg_1.Pool(dbConfig);
// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
// Database connection helper
function getDbClient() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield pool.connect();
            return client;
        }
        catch (error) {
            console.error('Error connecting to database:', error);
            throw error;
        }
    });
}
// Query helper function
function query(text, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getDbClient();
        try {
            const result = yield client.query(text, params);
            return result;
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    });
}
// Get active agent configuration
function getActiveAgentConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield query('SELECT * FROM agent_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
            if (result.rows.length === 0) {
                console.log('No active agent configuration found in database');
                return null;
            }
            const row = result.rows[0];
            const config = {
                id: row.id,
                name: row.name,
                instructions: row.instructions,
                voice: row.voice,
                model: row.model,
                temperature: row.temperature ? parseFloat(row.temperature) : undefined,
                max_tokens: row.max_tokens ? parseInt(row.max_tokens) : undefined,
                input_audio_format: row.input_audio_format,
                output_audio_format: row.output_audio_format,
                turn_detection_type: row.turn_detection_type,
                turn_detection_threshold: row.turn_detection_threshold ? parseFloat(row.turn_detection_threshold) : undefined,
                turn_detection_prefix_padding_ms: row.turn_detection_prefix_padding_ms ? parseInt(row.turn_detection_prefix_padding_ms) : undefined,
                turn_detection_silence_duration_ms: row.turn_detection_silence_duration_ms ? parseInt(row.turn_detection_silence_duration_ms) : undefined,
                modalities: typeof row.modalities === 'string' ? JSON.parse(row.modalities) : row.modalities,
                tools_enabled: row.tools_enabled,
                enabled_tools: typeof row.enabled_tools === 'string' ? JSON.parse(row.enabled_tools) : row.enabled_tools,
                is_active: row.is_active
            };
            console.log('✅ Loaded active agent configuration from database:', config.name);
            return config;
        }
        catch (error) {
            console.error('❌ Error fetching active agent configuration:', error);
            return null;
        }
    });
}
// Get tool definitions for enabled tools
function getEnabledToolDefinitions(enabledTools) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!enabledTools || enabledTools.length === 0) {
            return [];
        }
        try {
            const placeholders = enabledTools.map((_, i) => `$${i + 1}`).join(', ');
            const result = yield query(`SELECT name, description, parameters FROM tool_definitions WHERE name = ANY($1) AND enabled = true`, [enabledTools]);
            return result.rows.map((row) => ({
                type: "function",
                name: row.name,
                description: row.description,
                parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters
            }));
        }
        catch (error) {
            console.error('❌ Error fetching tool definitions:', error);
            return [];
        }
    });
}
// Test database connection
function testConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield query('SELECT 1');
            console.log('✅ WebSocket server database connection successful');
            return true;
        }
        catch (error) {
            console.error('❌ WebSocket server database connection failed:', error);
            return false;
        }
    });
}
// Close pool (for cleanup)
function closePool() {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.end();
    });
}
