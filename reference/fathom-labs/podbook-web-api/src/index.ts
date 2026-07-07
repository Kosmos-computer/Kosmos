// @ts-nocheck
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDatabase, prisma } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/project');
const contentRoutes = require('./routes/content');
const aiRoutes = require('./routes/ai');
const onboardingRoutes = require('./routes/onboarding');
const rssRoutes = require('./routes/rss');
const uploadsRoutes = require('./routes/uploads');
const supportRoutes = require('./routes/support');

const app = express();

// Middleware
// Parse CORS_ORIGIN to handle multiple origins
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:8080'];

app.use(cors({
  origin: corsOrigins,
  credentials: process.env.CORS_CREDENTIALS === 'true'
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/support', supportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test database connection with Prisma
app.get('/test-db-direct', async (req, res) => {
  try {
    console.log('🔍 Main server attempting Prisma database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Database version:', result[0].version);
    
    await prisma.$disconnect();
    res.json({ status: 'Database connected successfully', version: result[0].version });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed', details: error });
  }
});

// Test database connection with imported function
app.get('/test-db', async (req, res) => {
  try {
    await connectDatabase();
    res.json({ status: 'Database connected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Test DB Direct: http://localhost:${PORT}/test-db-direct`);
      console.log(`🔗 Test DB Imported: http://localhost:${PORT}/test-db`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
