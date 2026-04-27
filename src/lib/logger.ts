import winston from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston Logger Configuration
 * - Console output for development
 * - Daily rotate file transport for production
 */

const LOG_DIR = path.join(process.cwd(), 'logs');

// Define log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Custom format for logging
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
    })
);

// Transports
const transports: winston.transport[] = [
    // Console transport for development
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    }),

    // Daily rotate file for all logs
    new DailyRotateFile({
        dirname: LOG_DIR,
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat
    }),

    // Daily rotate file for error logs
    new DailyRotateFile({
        dirname: LOG_DIR,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormat
    })
];

const logger = winston.createLogger({
    level,
    transports
});

export default logger;
