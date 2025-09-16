"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbClient = getDbClient;
exports.query = query;
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
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};
// Create a connection pool
const pool = new pg_1.Pool(dbConfig);
// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
// Database connection helper
async function getDbClient() {
    try {
        const client = await pool.connect();
        return client;
    }
    catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}
// Query helper function
async function query(text, params) {
    const client = await getDbClient();
    try {
        const result = await client.query(text, params);
        return result;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Test database connection
async function testConnection() {
    try {
        await query('SELECT 1');
        console.log('✅ Database connection successful');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
// Close pool (for cleanup)
async function closePool() {
    await pool.end();
}
//# sourceMappingURL=db.js.map