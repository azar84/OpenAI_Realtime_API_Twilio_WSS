import { getActiveAgentConfig } from './db';

async function testDatabaseData() {
  try {
    console.log('🔍 Testing database data...');
    
    const config = await getActiveAgentConfig();
    
    if (!config) {
      console.log('❌ No active agent configuration found');
      return;
    }
    
    console.log('✅ Agent Config Found:');
    console.log('- Name:', config.name);
    console.log('- Instructions:', config.instructions?.substring(0, 100) + '...');
    console.log('- Voice:', config.voice);
    console.log('- Model:', config.model);
    console.log('- Primary Language:', config.primary_language);
    console.log('- Secondary Languages:', config.secondary_languages);
    console.log('- Identity:', config.identity_value);
    console.log('- Task:', config.task_value);
    console.log('- Demeanor:', config.demeanor_value);
    console.log('- Custom Instructions:', config.custom_instructions);
    
  } catch (error) {
    console.error('❌ Error testing database:', error);
  }
}

// Run the test
testDatabaseData();
