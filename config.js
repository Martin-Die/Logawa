require('dotenv').config();

module.exports = {
    // Discord Configuration
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    
    // Ignored channels for message logging (comma-separated IDs)
    ignoredChannels: process.env.IGNORED_CHANNELS ? 
        process.env.IGNORED_CHANNELS.split(',').map(id => id.trim()) : [],
    
    // Logging Configuration
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // External logging webhook (optional)
    webhookUrl: process.env.WEBHOOK_URL,
    
    // Bot Configuration
    intents: [
        'Guilds',
        'GuildMessages',
        'GuildMembers',
        'GuildPresences',
        'GuildMessageReactions',
        'GuildEmojisAndStickers',
        'GuildIntegrations',
        'GuildWebhooks',
        'GuildInvites',
        'GuildVoiceStates',
        'GuildModeration',
        'MessageContent'
    ],
    
    // Permissions required
    permissions: [
        'ViewChannel',
        'ReadMessageHistory',
        'SendMessages',
        'ManageMessages',
        'ViewAuditLog',
        'KickMembers',
        'BanMembers',
        'ManageRoles'
    ],
    
    // Log file settings
    logFile: {
        directory: './logs',
        maxSize: '10m',
        maxFiles: '7d'
    }
}; 