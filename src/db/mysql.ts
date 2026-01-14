import mysql from 'mysql2/promise';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create connection pool for better performance
const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
    try {
        const connection = await pool.getConnection();
        logger.info('MySQL connected successfully');
        connection.release();
        return true;
    } catch (error) {
        logger.error('MySQL connection failed:', error);
        return false;
    }
}

export default pool;
