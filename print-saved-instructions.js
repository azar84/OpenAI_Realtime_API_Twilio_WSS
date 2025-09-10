const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'realtime_agent',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function printSavedInstructions() {
  try {
    console.log('🔍 Fetching saved instructions from database...\n');
    
    // Get the active configuration
    const result = await pool.query(`
      SELECT 
        id,
        name,
        instructions,
        personality_config,
        personality_instructions,
        primary_language,
        secondary_languages,
        created_at,
        updated_at
      FROM agent_configs 
      WHERE is_active = true 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No active configuration found in database');
      return;
    }
    
    const config = result.rows[0];
    
    console.log('📋 ACTIVE CONFIGURATION:');
    console.log('=' .repeat(50));
    console.log(`ID: ${config.id}`);
    console.log(`Name: ${config.name || 'Not set'}`);
    console.log(`Primary Language: ${config.primary_language || 'Not set'}`);
    console.log(`Secondary Languages: ${JSON.stringify(config.secondary_languages || [])}`);
    console.log(`Created: ${config.created_at}`);
    console.log(`Updated: ${config.updated_at}`);
    console.log('');
    
    console.log('🎭 PERSONALITY CONFIG:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(config.personality_config, null, 2));
    console.log('');
    
    console.log('📝 PERSONALITY INSTRUCTIONS:');
    console.log('=' .repeat(50));
    console.log(config.personality_instructions || 'No personality instructions');
    console.log('');
    
    console.log('📖 COMBINED INSTRUCTIONS (SAVED TO DB):');
    console.log('=' .repeat(50));
    console.log(config.instructions || 'No instructions found');
    console.log('');
    
    console.log('📊 INSTRUCTIONS LENGTH:');
    console.log('=' .repeat(50));
    console.log(`Total characters: ${config.instructions?.length || 0}`);
    console.log(`Total lines: ${config.instructions?.split('\n').length || 0}`);
    
  } catch (error) {
    console.error('❌ Error fetching instructions:', error);
  } finally {
    await pool.end();
  }
}

printSavedInstructions();
