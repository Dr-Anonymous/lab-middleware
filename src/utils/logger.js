const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Error Logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error'
        }),
        // Raw Communication Audit Trail
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/communication.log'),
            level: 'debug' // We will log raw hex frames as 'debug'
        }),
        // General Logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log')
        }),
    ],
});

// If not production, log to console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    }));
}

module.exports = logger;
