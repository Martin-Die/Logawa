const winston = require('winston');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../config');
const FirebaseLogger = require('./firebase-logger');

// Ensure logs directory exists
if (!fs.existsSync(config.logFile.directory)) {
    fs.mkdirSync(config.logFile.directory, { recursive: true });
}

// Initialize Firebase Logger
const firebaseLogger = new FirebaseLogger();
console.log('🔥 FirebaseLogger créé:', firebaseLogger.getStatus());

// Custom format for readable logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        if (Object.keys(meta).length > 0) {
            log += ` | ${JSON.stringify(meta, null, 2)}`;
        }

        return log;
    })
);

// Webhook transport for external logging
class WebhookTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.webhookUrl = opts.webhookUrl;
    }

    async log(info, callback) {
        if (!this.webhookUrl) {
            callback();
            return;
        }

        try {
            const { EmbedBuilder, WebhookClient } = require('discord.js');
            const webhook = new WebhookClient({ url: this.webhookUrl });

            const colors = {
                error: 0xff0000,
                warn: 0xffff00,
                info: 0x00ff00,
                debug: 0x0099ff
            };

            const embed = new EmbedBuilder()
                .setTitle(`Log: ${info.level.toUpperCase()}`)
                .setDescription(info.message)
                .setColor(colors[info.level] || 0x00ff00)
                .setTimestamp()
                .setFooter({ text: 'LOGAWA Logger Bot - External Logs' });

            if (info.meta && Object.keys(info.meta).length > 0) {
                embed.addFields({
                    name: 'Additional Data',
                    value: '```json\n' + JSON.stringify(info.meta, null, 2) + '\n```',
                    inline: false
                });
            }

            await webhook.send({ embeds: [embed] });
        } catch (error) {
            console.error('Webhook logging failed:', error);
        }

        callback();
    }
}

// Firebase transport for log files
class FirebaseTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.firebaseLogger = opts.firebaseLogger;
        this.logType = opts.logType || 'general';
    }

    async log(info, callback) {
        console.log(`🔥 FirebaseTransport.log appelé pour ${this.logType}:`, info.message.substring(0, 50) + '...');
        
        if (!this.firebaseLogger || !this.firebaseLogger.isInitialized) {
            console.log(`❌ FirebaseTransport désactivé pour ${this.logType}`);
            callback();
            return;
        }

        try {
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
            const logEntry = `[${timestamp}] [${info.level.toUpperCase()}] ${info.message}`;
            
            console.log(`📤 Ajout à la queue Firebase: ${this.logType}`);
            // Add to Firebase queue
            await this.firebaseLogger.queueLogUpload({
                level: info.level,
                message: info.message,
                metadata: {
                    logType: this.logType,
                    timestamp: timestamp,
                    ...info
                }
            });
        } catch (error) {
            console.error('Firebase logging failed:', error);
        }

        callback();
    }
}

// Function to create organized log file path (year/month/day)
function createLogFilePath(logType) {
    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MM');
    const day = now.format('DD');
    
    // Create path: logs/type/YYYY/MM/DD.log
    const logPath = path.join(config.logFile.directory, logType, year, month);
    
    // Ensure directory exists
    if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
    }
    
    return path.join(logPath, `${day}.log`);
}

// Create subdirectories for different log types
const logTypes = ['messages', 'moderation', 'status', 'forbiddenWords', 'errors'];
logTypes.forEach(type => {
    const typeDir = path.join(config.logFile.directory, type);
    if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
    }
});

// Create Winston logger (main logger with console output)
const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),

        // Separate file for errors (global) - organized by year/month/day
        new winston.transports.File({
            filename: createLogFilePath('errors'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 7,
            tailable: true
        })
    ]
});

// Add webhook transport if configured
if (config.webhookUrl) {
    logger.add(new WebhookTransport({
        webhookUrl: config.webhookUrl,
        level: 'info'
    }));
}

// Create specific loggers for each type (FILE ONLY - NO CONSOLE)
const messageLogger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: createLogFilePath('messages'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new FirebaseTransport({
            firebaseLogger: firebaseLogger,
            logType: 'messages'
        })
    ],
    // Disable console output for specific loggers
    silent: false
});

const moderationLogger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: createLogFilePath('moderation'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new FirebaseTransport({
            firebaseLogger: firebaseLogger,
            logType: 'moderation'
        })
    ],
    // Disable console output for specific loggers
    silent: false
});

const statusLogger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: createLogFilePath('status'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new FirebaseTransport({
            firebaseLogger: firebaseLogger,
            logType: 'status'
        })
    ],
    // Disable console output for specific loggers
    silent: false
});

const forbiddenWordsLogger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: createLogFilePath('forbiddenWords'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new FirebaseTransport({
            firebaseLogger: firebaseLogger,
            logType: 'forbiddenWords'
        })
    ],
    // Disable console output for specific loggers
    silent: false
});

const errorLogger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: createLogFilePath('errors'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new FirebaseTransport({
            firebaseLogger: firebaseLogger,
            logType: 'errors'
        })
    ],
    // Disable console output for specific loggers
    silent: false
});

// Export specific logging functions
module.exports = {
    logger,
    messageLogger,
    moderationLogger,
    statusLogger,
    forbiddenWordsLogger,
    errorLogger,
    firebaseLogger
}; 