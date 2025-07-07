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
            // Send logs to external service or save locally
            const logs = this.logBuffer.map(log => 
                `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log.meta)}`
            ).join('\n');

            // Option 1: Save to local file (if possible)
            const logFile = path.join(config.logFile.directory, `${moment().format('YYYY-MM-DD')}.log`);
            fs.appendFileSync(logFile, logs + '\n');

            // Option 2: Send to external service (if configured)
            if (config.externalLogService) {
                // You can implement external service logging here
                // For example: Google Drive, Dropbox, AWS S3, etc.
                console.log('Logs ready for external service:', logs.length, 'entries');
            }

            this.logBuffer = [];
        } catch (error) {
            console.error('Failed to flush logs:', error);
        }
    }
}

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

        // File transport for all logs
        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'all.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 7,
            tailable: true
        }),

        // Separate file for errors
        new winston.transports.File({
            filename: path.join(config.logFile.directory, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 7,
            tailable: true
        }),

        // Daily log files
        new winston.transports.File({
            filename: path.join(config.logFile.directory, `${moment().format('YYYY-MM-DD')}.log`),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 30,
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
        this.logChannel = null;
    }

    async initialize() {
        try {
            this.logChannel = await this.client.channels.fetch(config.logChannelId);
            if (!this.logChannel) {
                logger.error('Log channel not found');
                return false;
            }
            logger.info('Discord logger initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize Discord logger:', error);
            return false;
        }
    }

    async sendLog(embed) {
        try {
            if (this.logChannel) {
                await this.logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            logger.error('Failed to send log to Discord:', error);
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

        await this.sendLog(embed);
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

        await this.sendLog(embed);
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

        await this.sendLog(embed);
        logger.info(`Channel event: ${action} for #${channel.name}`, {
            channelId: channel.id,
            action: action,
            details: details
        });
    }
}

module.exports = { logger, DiscordLogger }; 