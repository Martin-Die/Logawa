const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { logger, DiscordLogger } = require('./utils/logger');
const MessageEvents = require('./events/messageEvents');
const ModerationEvents = require('./events/moderationEvents');
const ServerEvents = require('./events/serverEvents');
const config = require('./config');



class LogawaLoggerBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.MessageContent
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
                Partials.User,
                Partials.GuildMember
            ]
        });

        this.discordLogger = new DiscordLogger(this.client);
        this.messageEvents = new MessageEvents(this.client, this.discordLogger);
        this.moderationEvents = new ModerationEvents(this.client, this.discordLogger);
        this.serverEvents = new ServerEvents(this.client, this.discordLogger);
    }

    async initialize() {
        try {
            // Validate configuration
            if (!config.token) {
                throw new Error('Discord token is required. Please set DISCORD_TOKEN in your .env file.');
            }

            if (!config.guildId) {
                throw new Error('Guild ID is required. Please set GUILD_ID in your .env file.');
            }

            // Check if at least one log channel is configured
            const hasLogChannels = Object.values(config.logChannels).some(channelId => channelId);
            if (!hasLogChannels) {
                throw new Error('At least one log channel ID is required. Please set STATUS_LOG_CHANNEL_ID, MESSAGES_LOG_CHANNEL_ID, FORBIDDEN_WORDS_LOG_CHANNEL_ID, or MODERATION_LOG_CHANNEL_ID in your .env file.');
            }

            logger.info('Initializing Logawa Logger Bot...');

            // Set up event handlers
            this.setupEventHandlers();

            // Login to Discord
            await this.client.login(config.token);

            // Wait for client to be ready
            await new Promise((resolve) => {
                this.client.once('ready', resolve);
            });

            // Initialize Discord logger
            const loggerInitialized = await this.discordLogger.initialize();
            if (!loggerInitialized) {
                logger.warn('Failed to initialize Discord logger. Bot will continue with file logging only.');
            }

            // Log startup information
            await this.logStartupInfo();

            logger.info('Logawa Logger Bot is now online and ready!');
            logger.info(`Logged in as: ${this.client.user.tag}`);
            logger.info(`Guild: ${this.client.guilds.cache.get(config.guildId)?.name || 'Unknown'}`);
            const configuredChannels = Object.entries(config.logChannels)
                .filter(([type, channelId]) => channelId)
                .map(([type, channelId]) => `${type}: ${this.client.channels.cache.get(channelId)?.name || 'Unknown'}`)
                .join(', ');
            logger.info(`Configured Log Channels: ${configuredChannels || 'None'}`);

        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    setupEventHandlers() {
        // Register all event handlers
        this.messageEvents.registerEvents();
        this.moderationEvents.registerEvents();
        this.serverEvents.registerEvents();

        // Bot-specific events
        this.client.on('ready', this.handleReady.bind(this));
        this.client.on('error', this.handleError.bind(this));
        this.client.on('warn', this.handleWarn.bind(this));
        this.client.on('disconnect', this.handleDisconnect.bind(this));
        this.client.on('reconnecting', this.handleReconnecting.bind(this));

        logger.info('Event handlers registered successfully');
    }

    async handleReady() {
        logger.info('Bot is ready!');

        // Set bot status
        this.client.user.setActivity('Logging Server Activity', { type: 'WATCHING' });

        // Log bot information
        logger.info(`Bot is in ${this.client.guilds.cache.size} guild(s)`);

        // Check permissions
        await this.checkPermissions();
    }

    async checkPermissions() {
        try {
            const guild = this.client.guilds.cache.get(config.guildId);
            if (!guild) {
                logger.error('Bot is not in the specified guild');
                return;
            }

            const botMember = guild.members.cache.get(this.client.user.id);
            if (!botMember) {
                logger.error('Bot member not found in guild');
                return;
            }

            const requiredPermissions = [
                'ViewChannel',
                'ReadMessageHistory',
                'SendMessages',
                'ViewAuditLog'
            ];

            const missingPermissions = requiredPermissions.filter(permission =>
                !botMember.permissions.has(permission)
            );

            if (missingPermissions.length > 0) {
                logger.warn(`Missing permissions: ${missingPermissions.join(', ')}`);
            } else {
                logger.info('All required permissions are present');
            }

            // Check log channels permissions
            Object.entries(config.logChannels).forEach(([type, channelId]) => {
                if (channelId) {
                    const logChannel = this.client.channels.cache.get(channelId);
                    if (logChannel) {
                        const channelPermissions = logChannel.permissionsFor(this.client.user);
                        if (!channelPermissions.has('SendMessages')) {
                            logger.error(`Bot cannot send messages to the ${type} log channel`);
                        } else {
                            logger.info(`${type} log channel permissions are correct`);
                        }
                    }
                }
            });

        } catch (error) {
            logger.error('Error checking permissions:', error);
        }
    }

    async logStartupInfo() {
        try {
            const embed = this.discordLogger.createEmbed(
                '🟢 Bot Started',
                'Logawa Logger Bot is now online and monitoring server activity.',
                0x00ff00,
                [
                    { name: 'Bot Version', value: '1.0.0', inline: true },
                    { name: 'Node.js Version', value: process.version, inline: true },
                    { name: 'Uptime', value: 'Just started', inline: true },
                    { name: 'Ignored Channels', value: config.ignoredChannels.length.toString(), inline: true },
                    { name: 'Forbidden Words', value: config.forbiddenWords.length.toString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');
        } catch (error) {
            logger.error('Error sending startup log:', error);
        }
    }

    async handleError(error) {
        logger.error('Discord client error:', error);
        
        try {
            await this.discordLogger.logStatus('error', {
                description: 'Discord client encountered an error',
                error: error.message || error.toString(),
                stack: error.stack?.substring(0, 500) || 'No stack trace'
            });
        } catch (logError) {
            logger.error('Failed to log error to Discord:', logError);
        }
    }

    async handleWarn(warning) {
        logger.warn('Discord client warning:', warning);
        
        try {
            await this.discordLogger.logStatus('warning', {
                description: 'Discord client warning',
                warning: warning.toString()
            });
        } catch (logError) {
            logger.error('Failed to log warning to Discord:', logError);
        }
    }

    async handleDisconnect() {
        logger.warn('Bot disconnected from Discord');
        
        try {
            await this.discordLogger.logStatus('warning', {
                description: 'Bot disconnected from Discord',
                action: 'Attempting to reconnect...'
            });
        } catch (logError) {
            logger.error('Failed to log disconnect to Discord:', logError);
        }
    }

    handleReconnecting() {
        logger.info('Bot is reconnecting to Discord...');
    }

    // Graceful shutdown
    async shutdown() {
        logger.info('Shutting down bot...');

        try {
            const embed = this.discordLogger.createEmbed(
                '🔴 Bot Stopped',
                'Logawa Logger Bot is shutting down.',
                0xff0000,
                [
                    { name: 'Shutdown Time', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed);

            // Wait a bit for the message to be sent
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.client.destroy();
            logger.info('Bot shutdown complete');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Create and start the bot
const bot = new LogawaLoggerBot();

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    bot.shutdown();
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    bot.shutdown();
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    bot.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    bot.shutdown();
});

// Start the bot
bot.initialize().catch(error => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
}); 