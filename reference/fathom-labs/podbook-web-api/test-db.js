const { Pool } = require('pg');

// Try connecting with the new external user
const pool = new Pool({
  user: 'podbook_external',
  host: '127.0.0.1',
  database: 'podbook',
  password: 'podbook_password',
  port: 5433,
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection with podbook_external...');
    console.log('📍 Connecting to: 127.0.0.1:5433');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    client.release();
    await pool.end();
    console.log('🔒 Connection closed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Error details:', error);
    
    // Try the original user as fallback
    console.log('\n🔄 Trying original user as fallback...');
    await tryOriginalUser();
  }
}

async function tryOriginalUser() {
  const altPool = new Pool({
    user: 'podbook_user',
    host: '127.0.0.1',
    database: 'podbook',
    password: 'podbook_password',
    port: 5433,
  });
  
  try {
    const client = await altPool.connect();
    console.log('✅ Original user connection successful!');
    client.release();
    await altPool.end();
  } catch (altError) {
    console.error('❌ Original user connection also failed:', altError.message);
  }
}

testConnection();
