const express = require('express');
const { Pool } = require('pg');

const app = express();

// Create a fresh pool instance
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

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    console.log('🔍 Express server attempting database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    client.release();
    res.json({ status: 'Database connected successfully', version: result.rows[0].version });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed', details: error });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 3001; // Use different port to avoid conflicts

app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test DB: http://localhost:${PORT}/test-db`);
});
