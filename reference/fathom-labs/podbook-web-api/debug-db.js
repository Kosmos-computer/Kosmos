const { Pool } = require('pg');

console.log('🔍 Node.js version:', process.version);
console.log('🔍 Platform:', process.platform);
console.log('🔍 Architecture:', process.arch);
console.log('🔍 Current working directory:', process.cwd());

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

console.log('🔍 Pool created with config:', {
  user: 'podbook_user',
  host: '127.0.0.1',
  database: 'podbook',
  password: '***',
  port: 5433
});

async function debugDBConnection() {
  try {
    console.log('🔍 Attempting to connect...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    client.release();
    await pool.end();
    console.log('🔒 Connection closed');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('  - Message:', error.message);
    console.error('  - Code:', error.code);
    console.error('  - Errno:', error.errno);
    console.error('  - Syscall:', error.syscall);
    console.error('  - Address:', error.address);
    console.error('  - Port:', error.port);
    console.error('  - Full error:', error);
  }
}

debugDBConnection();
