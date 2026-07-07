// database.ts
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  __internal: {
    engine: {
      enableTracing: false
    }
  }
});

module.exports.prisma = prisma;

module.exports.connectDatabase = async function() {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully');
    
    // Test the connection
    const dbVersion = await prisma.$queryRaw`SELECT version()`;
    logger.info('Database version:', dbVersion);
    
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

module.exports.disconnectDatabase = async function() {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await module.exports.disconnectDatabase();
});