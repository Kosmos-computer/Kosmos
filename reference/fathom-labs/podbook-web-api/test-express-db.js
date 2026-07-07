const { Pool } = require('pg');

// Test the exact same configuration that the Express server uses
const pool = new Pool({
  user: 'podbook_user',
  host: '127.0.0.1',
  database: 'podbook',
  password: 'podbook_password',
  port: 5433,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

async function testExpressDBConnection() {
  try {
    console.log('🔍 Testing Express-style database connection...');
    console.log('📍 Connection config:', {
      user: 'podbook_user',
      host: '127.0.0.1',
      database: 'podbook',
      password: 'podbook_password',
      port: 5433
    });
    
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    client.release();
    await pool.end();
    console.log('🔒 Connection closed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testExpressDBConnection();
