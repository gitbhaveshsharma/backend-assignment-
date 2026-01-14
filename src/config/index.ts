import dotenv from 'dotenv';
dotenv.config();

// App configuration - loads from environment variables
export const config = {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database settings
    db: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'farmlokal',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '3306'),
    },

    // Redis settings
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },

    // OAuth settings
    oauth: {
        tokenUrl: process.env.OAUTH_TOKEN_URL || '',
        clientId: process.env.OAUTH_CLIENT_ID || '',
        clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
    },

    // External API settings
    externalApi: {
        apiABaseUrl: process.env.API_A_BASE_URL || '',
        apiBWebhookUrl: process.env.API_B_WEBHOOK_URL || '',
    },
};
