require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Fonction pour lire les mots interdits depuis un fichier
function loadForbiddenWords() {
    try {
        const forbiddenWordsPath = path.join(__dirname, 'forbidden-words.txt');
        if (fs.existsSync(forbiddenWordsPath)) {
            const content = fs.readFileSync(forbiddenWordsPath, 'utf8');
            return content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line) // Ignore seulement les lignes vides
                .map(word => word.toLowerCase());
        }
        return [];
    } catch (error) {
        console.error('Erreur lors du chargement des mots interdits:', error);
        return [];
    }
}

module.exports = {
    // Discord Configuration
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID,
    
    // Log Channels Configuration
    logChannels: {
        status: process.env.STATUS_LOG_CHANNEL_ID,
        messages: process.env.MESSAGES_LOG_CHANNEL_ID,
        forbiddenWords: process.env.FORBIDDEN_WORDS_LOG_CHANNEL_ID,
        moderation: process.env.MODERATION_LOG_CHANNEL_ID
    },
    
    // Ignored channels for message logging (comma-separated IDs)
    ignoredChannels: process.env.IGNORED_CHANNELS ? 
        process.env.IGNORED_CHANNELS.split(',').map(id => id.trim()) : [],
    
    // Forbidden words loaded from file
    forbiddenWords: loadForbiddenWords(),
    
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