// Simple logger implementation
const createLogger = () => {
  return {
    info: (message: string, meta?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`[INFO] ${timestamp}: ${message}`, meta || '');
    },
    error: (message: string, meta?: any) => {
      const timestamp = new Date().toISOString();
      console.error(`[ERROR] ${timestamp}: ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      const timestamp = new Date().toISOString();
      console.warn(`[WARN] ${timestamp}: ${message}`, meta || '');
    }
  };
};

export const logger = createLogger();
