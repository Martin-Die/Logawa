const winston = require('winston');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../config');
const GoogleDriveLogger = require('./drive-logger');

// Ensure logs directory exists
if (!fs.existsSync(config.logFile.directory)) {
    fs.mkdirSync(config.logFile.directory, { recursive: true });
}

// Initialize Google Drive Logger
const driveLogger = new GoogleDriveLogger();

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

// Google Drive transport for log files
class GoogleDriveTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.driveLogger = opts.driveLogger;
        this.logType = opts.logType || 'general';
    }

    async log(info, callback) {
        if (!this.driveLogger || !this.driveLogger.enabled) {
            callback();
            return;
        }

        try {
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
            const logEntry = `[${timestamp}] [${info.level.toUpperCase()}] ${info.message}`;
            
            // Create log file name based on type and date
            const date = moment().format('YYYY-MM-DD');
            const fileName = `${this.logType}_${date}.log`;
            
            // Add to Google Drive queue
            await this.driveLogger.queueFileUpload(fileName, logEntry);
        } catch (error) {
            console.error('Google Drive logging failed:', error);
        }

        callback();
    }
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

        // Separate file for errors (global)
        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'error.log'),
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
            filename: path.join(config.logFile.directory, 'messages', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new GoogleDriveTransport({
            driveLogger: driveLogger,
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
            filename: path.join(config.logFile.directory, 'moderation', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new GoogleDriveTransport({
            driveLogger: driveLogger,
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
            filename: path.join(config.logFile.directory, 'status', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new GoogleDriveTransport({
            driveLogger: driveLogger,
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
            filename: path.join(config.logFile.directory, 'forbiddenWords', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new GoogleDriveTransport({
            driveLogger: driveLogger,
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
            filename: path.join(config.logFile.directory, 'errors', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true
        }),
        new GoogleDriveTransport({
            driveLogger: driveLogger,
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
    driveLogger
}; 