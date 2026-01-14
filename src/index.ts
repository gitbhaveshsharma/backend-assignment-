import app from './app';
import { config } from './config';
import { testConnection } from './db/mysql';
import { logger } from './utils/logger';

// Start the server
async function startServer() {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            logger.warn('Database connection failed, some features may not work');
        }

        // Start Express server
        app.listen(config.port, () => {
            logger.info(`🚀 FarmLokal server running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`Health check: http://localhost:${config.port}/health`);
            logger.info(`Products API: http://localhost:${config.port}/api/products`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();
