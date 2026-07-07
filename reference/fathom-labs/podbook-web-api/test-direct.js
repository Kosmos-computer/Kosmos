const { Pool } = require('pg');

const pool = new Pool({
  user: 'podbook_user',
  host: '127.0.0.1',
  database: 'podbook',
  password: 'podbook_password',
  port: 5433,
});

async function testDirectConnection() {
  try {
    console.log('🔍 Testing direct database connection...');
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
    console.error('🔍 Full error:', error);
  }
}

testDirectConnection();
