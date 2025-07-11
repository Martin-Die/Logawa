const winston = require('winston');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../config');

// Ensure logs directory exists
if (!fs.existsSync(config.logFile.directory)) {
    fs.mkdirSync(config.logFile.directory, { recursive: true });
}

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

// File logging transport for external storage
class FileLoggingTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.logBuffer = [];
        this.maxBufferSize = opts.maxBufferSize || 100;
        this.flushInterval = opts.flushInterval || 30000; // 30 seconds
        this.setupFlushInterval();
    }

    setupFlushInterval() {
        setInterval(() => {
            this.flushLogs();
        }, this.flushInterval);
    }

    async log(info, callback) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: info.level,
            message: info.message,
            meta: info.meta || {}
        };

        this.logBuffer.push(logEntry);

        if (this.logBuffer.length >= this.maxBufferSize) {
            await this.flushLogs();
        }

        callback();
    }

    async flushLogs() {
        if (this.logBuffer.length === 0) return;

        try {
            // Group logs by type based on message content
            const logsByType = {
                messages: [],
                moderation: [],
                status: [],
                forbiddenWords: [],
                errors: []
            };

            this.logBuffer.forEach(log => {
                const logEntry = `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log.meta)}`;
                
                // Determine log type based on message content
                if (log.level === 'error') {
                    logsByType.errors.push(logEntry);
                } else if (log.message.includes('Message') || log.message.includes('message')) {
                    logsByType.messages.push(logEntry);
                } else if (log.message.includes('Moderation') || log.message.includes('kick') || log.message.includes('ban') || log.message.includes('timeout')) {
                    logsByType.moderation.push(logEntry);
                } else if (log.message.includes('Forbidden word') || log.message.includes('forbidden')) {
                    logsByType.forbiddenWords.push(logEntry);
                } else if (log.message.includes('Bot status') || log.message.includes('status')) {
                    logsByType.status.push(logEntry);
                } else {
                    // Default to status for other logs
                    logsByType.status.push(logEntry);
                }
            });

            // Write logs to appropriate files
            Object.entries(logsByType).forEach(([type, logs]) => {
                if (logs.length > 0) {
                    const logFile = path.join(config.logFile.directory, type, `${moment().format('YYYY-MM-DD')}.log`);
                    fs.appendFileSync(logFile, logs.join('\n') + '\n');
                }
            });

            // Option 2: Send to external service (if configured)
            if (config.externalLogService) {
                // You can implement external service logging here
                // For example: Google Drive, Dropbox, AWS S3, etc.
                console.log('Logs ready for external service:', this.logBuffer.length, 'entries');
            }

            this.logBuffer = [];
        } catch (error) {
            console.error('Failed to flush logs:', error);
        }
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

// Create Winston logger
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
        }),

        // Daily log files by type
        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'messages', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true,
            level: 'info'
        }),

        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'moderation', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true,
            level: 'info'
        }),

        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'status', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true,
            level: 'info'
        }),

        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'forbiddenWords', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true,
            level: 'info'
        }),

        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'errors', `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
            tailable: true,
            level: 'error'
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

// Add file logging transport for external storage
logger.add(new FileLoggingTransport({
    level: 'info',
    maxBufferSize: 50,
    flushInterval: 30000
}));

// Initialize cloud loggers
const GitHubLogger = require('./github-logger');
const GoogleDriveLogger = require('./drive-logger');

const githubLogger = new GitHubLogger();
const driveLogger = new GoogleDriveLogger();

// Initialize cloud loggers
githubLogger.initialize();
driveLogger.initialize();

// Export cloud loggers for external use
logger.githubLogger = githubLogger;
logger.driveLogger = driveLogger;

// Discord logging utility
class DiscordLogger {
    constructor(client) {
        this.client = client;
        this.logChannels = {
            status: null,
            messages: null,
            forbiddenWords: null,
            moderation: null
        };
    }

    // Helper method to log to specific file type
    logToFile(type, message, meta = {}) {
        const logEntry = `[${moment().format('YYYY-MM-DD HH:mm:ss')}] [INFO] ${message} ${JSON.stringify(meta)}`;
        const logFile = path.join(config.logFile.directory, type, `${moment().format('YYYY-MM-DD')}.log`);
        
        try {
            fs.appendFileSync(logFile, logEntry + '\n');
        } catch (error) {
            console.error(`Failed to write to log file ${logFile}:`, error);
        }
    }

    async initialize() {
        try {
            // Initialize all log channels
            const channelPromises = Object.entries(config.logChannels).map(async ([type, channelId]) => {
                if (channelId) {
                    try {
                        const channel = await this.client.channels.fetch(channelId);
                        if (channel) {
                            this.logChannels[type] = channel;
                            logger.info(`Log channel '${type}' initialized successfully`);
                        } else {
                            logger.warn(`Log channel '${type}' not found: ${channelId}`);
                        }
                    } catch (error) {
                        logger.error(`Failed to initialize log channel '${type}':`, error);
                    }
                }
            });

            await Promise.all(channelPromises);
            
            // Check if at least one channel is available
            const availableChannels = Object.values(this.logChannels).filter(channel => channel !== null);
            if (availableChannels.length === 0) {
                logger.error('No log channels could be initialized');
                return false;
            }
            
            logger.info(`Discord logger initialized successfully with ${availableChannels.length} channels`);
            return true;
        } catch (error) {
            logger.error('Failed to initialize Discord logger:', error);
            return false;
        }
    }

    async sendLog(embed, channelType = 'messages') {
        try {
            const channel = this.logChannels[channelType];
            if (channel) {
                await channel.send({ embeds: [embed] });
            } else {
                // Smart fallback based on channel type
                let fallbackChannel = null;
                
                if (channelType === 'moderation') {
                    // For moderation logs, try status channel first, then messages
                    fallbackChannel = this.logChannels.status || this.logChannels.messages;
                } else if (channelType === 'forbiddenWords') {
                    // For forbidden words, try messages channel first, then status
                    fallbackChannel = this.logChannels.messages || this.logChannels.status;
                } else if (channelType === 'status') {
                    // For status logs, try messages channel
                    fallbackChannel = this.logChannels.messages;
                } else {
                    // For messages, try status channel
                    fallbackChannel = this.logChannels.status;
                }
                
                // Final fallback to any available channel
                if (!fallbackChannel) {
                    fallbackChannel = Object.values(this.logChannels).find(ch => ch !== null);
                }
                
                if (fallbackChannel) {
                    await fallbackChannel.send({ embeds: [embed] });
                    logger.warn(`Log sent to fallback channel '${fallbackChannel.name}' instead of '${channelType}'`);
                }
            }
        } catch (error) {
            logger.error(`Failed to send log to Discord channel '${channelType}':`, error);
        }
    }

    // Helper method to create embeds
    createEmbed(title, description, color = 0x00ff00, fields = []) {
        const { EmbedBuilder } = require('discord.js');

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: 'LOGAWA Logger Bot' });

        fields.forEach(field => {
            embed.addFields(field);
        });

        return embed;
    }

    // Log message events
    async logMessage(message, action = 'sent') {
        const embed = this.createEmbed(
            `Message ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `**Channel:** ${message.channel.name} (${message.channel.id})\n**Author:** ${message.author.tag} (${message.author.id})`,
            0x00ff00,
            [
                { name: 'Content', value: message.content || 'No content', inline: false },
                { name: 'Message ID', value: message.id, inline: true },
                { name: 'Timestamp', value: moment(message.createdTimestamp).format('YYYY-MM-DD HH:mm:ss'), inline: true }
            ]
        );

        await this.sendLog(embed, 'messages');
        
        // Log to specific file
        this.logToFile('messages', `Message ${action}: ${message.author.tag} in #${message.channel.name}`, {
            messageId: message.id,
            authorId: message.author.id,
            channelId: message.channel.id,
            content: message.content?.substring(0, 100) + (message.content?.length > 100 ? '...' : ''),
            action: action
        });
        
        logger.info(`Message ${action}: ${message.author.tag} in #${message.channel.name}`, {
            messageId: message.id,
            authorId: message.author.id,
            channelId: message.channel.id,
            content: message.content?.substring(0, 100) + (message.content?.length > 100 ? '...' : '')
        });
    }

    // Log moderation actions
    async logModeration(user, moderator, action, reason = 'No reason provided', duration = null) {
        const colors = {
            'kick': 0xffa500,
            'ban': 0xff0000,
            'unban': 0x00ff00,
            'timeout': 0xffff00,
            'role_add': 0x00ff00,
            'role_remove': 0xffa500
        };

        const embed = this.createEmbed(
            `User ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `**User:** ${user.tag} (${user.id})\n**Moderator:** ${moderator.tag} (${moderator.id})`,
            colors[action] || 0x00ff00,
            [
                { name: 'Reason', value: reason, inline: false },
                { name: 'Action', value: action.toUpperCase(), inline: true },
                { name: 'Timestamp', value: moment().format('YYYY-MM-DD HH:mm:ss'), inline: true }
            ]
        );

        if (duration) {
            embed.addFields({ name: 'Duration', value: duration, inline: true });
        }

        await this.sendLog(embed, 'moderation');
        
        // Log to specific file
        this.logToFile('moderation', `Moderation action: ${action} on ${user.tag} by ${moderator.tag}`, {
            userId: user.id,
            moderatorId: moderator.id,
            action: action,
            reason: reason,
            duration: duration
        });
        
        logger.info(`Moderation action: ${action} on ${user.tag} by ${moderator.tag}`, {
            userId: user.id,
            moderatorId: moderator.id,
            action: action,
            reason: reason,
            duration: duration
        });
    }

    // Log member events
    async logMemberEvent(member, action, details = {}) {
        const colors = {
            'join': 0x00ff00,
            'leave': 0xffa500,
            'update': 0x0099ff
        };

        const embed = this.createEmbed(
            `Member ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `**Member:** ${member.user.tag} (${member.user.id})`,
            colors[action] || 0x00ff00,
            [
                { name: 'Action', value: action.toUpperCase(), inline: true },
                { name: 'Timestamp', value: moment().format('YYYY-MM-DD HH:mm:ss'), inline: true }
            ]
        );

        // Add additional details
        Object.entries(details).forEach(([key, value]) => {
            embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: value.toString(), inline: true });
        });

        await this.sendLog(embed);
        logger.info(`Member event: ${action} for ${member.user.tag}`, {
            userId: member.user.id,
            action: action,
            details: details
        });
    }

    // Log channel events
    async logChannelEvent(channel, action, details = {}) {
        const embed = this.createEmbed(
            `Channel ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `**Channel:** ${channel.name} (${channel.id})`,
            0x0099ff,
            [
                { name: 'Action', value: action.toUpperCase(), inline: true },
                { name: 'Type', value: channel.type, inline: true },
                { name: 'Timestamp', value: moment().format('YYYY-MM-DD HH:mm:ss'), inline: true }
            ]
        );

        Object.entries(details).forEach(([key, value]) => {
            embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: value.toString(), inline: true });
        });

        await this.sendLog(embed, 'status');
        logger.info(`Channel event: ${action} for #${channel.name}`, {
            channelId: channel.id,
            action: action,
            details: details
        });
    }

    // Log status events (bot startup, shutdown, errors, etc.)
    async logStatus(status, details = {}) {
        const colors = {
            'startup': 0x00ff00,
            'shutdown': 0xff0000,
            'error': 0xff0000,
            'warning': 0xffff00,
            'info': 0x0099ff,
            'ready': 0x00ff00
        };

        const embed = this.createEmbed(
            `Bot Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            details.description || `Bot status changed to: ${status}`,
            colors[status] || 0x00ff00,
            [
                { name: 'Status', value: status.toUpperCase(), inline: true },
                { name: 'Timestamp', value: moment().format('YYYY-MM-DD HH:mm:ss'), inline: true }
            ]
        );

        Object.entries(details).forEach(([key, value]) => {
            if (key !== 'description') {
                embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: value.toString(), inline: true });
            }
        });

        await this.sendLog(embed, 'status');
        
        // Log to specific file
        this.logToFile('status', `Bot status: ${status}`, details);
        
        logger.info(`Bot status: ${status}`, details);
    }

    // Log forbidden words detection
    async logForbiddenWord(message, forbiddenWord, action = 'detected') {
        const embed = this.createEmbed(
            `Forbidden Word ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `**Channel:** ${message.channel.name} (${message.channel.id})\n**Author:** ${message.author.tag} (${message.author.id})`,
            0xff0000,
            [
                { name: 'Forbidden Word', value: forbiddenWord, inline: true },
                { name: 'Message Content', value: message.content || 'No content', inline: false },
                { name: 'Message ID', value: message.id, inline: true },
                { name: 'Timestamp', value: moment().format('YYYY-MM-DD HH:mm:ss'), inline: true }
            ]
        );

        await this.sendLog(embed, 'forbiddenWords');
        
        // Log to specific file
        this.logToFile('forbiddenWords', `Forbidden word ${action}: "${forbiddenWord}" by ${message.author.tag} in #${message.channel.name}`, {
            messageId: message.id,
            authorId: message.author.id,
            channelId: message.channel.id,
            forbiddenWord: forbiddenWord,
            content: message.content?.substring(0, 100) + (message.content?.length > 100 ? '...' : ''),
            action: action
        });
        
        logger.info(`Forbidden word ${action}: "${forbiddenWord}" by ${message.author.tag} in #${message.channel.name}`, {
            messageId: message.id,
            authorId: message.author.id,
            channelId: message.channel.id,
            forbiddenWord: forbiddenWord,
            content: message.content?.substring(0, 100) + (message.content?.length > 100 ? '...' : '')
        });
    }
}

module.exports = { logger, DiscordLogger }; 