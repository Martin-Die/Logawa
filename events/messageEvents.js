const { messageLogger, moderationLogger, forbiddenWordsLogger, errorLogger } = require('../utils/logger');
const config = require('../config');

class MessageEvents {
    constructor(client, discordLogger) {
        this.client = client;
        this.discordLogger = discordLogger;
    }

    // Check if channel should be ignored for message logging
    isChannelIgnored(channelId) {
        return config.ignoredChannels.includes(channelId);
    }

    // Check if message should be logged (exclude bot messages and ignored channels)
    shouldLogMessage(message) {
        // Ignore bot messages
        if (message.author.bot) return false;
        
        // Ignore system messages
        if (message.system) return false;
        
        // Ignore specified channels
        if (this.isChannelIgnored(message.channel.id)) return false;
        
        return true;
    }

    // Check for forbidden words in message
    checkForbiddenWords(message) {
        if (!message.content || config.forbiddenWords.length === 0) return null;
        
        const messageContent = message.content.toLowerCase();
        const foundWords = config.forbiddenWords.filter(word => 
            messageContent.includes(word)
        );
        
        return foundWords.length > 0 ? foundWords[0] : null; // Return first found word
    }

    // Message created event
    async handleMessageCreate(message) {
        try {
            if (!this.shouldLogMessage(message)) return;

            // Check for forbidden words
            const forbiddenWord = this.checkForbiddenWords(message);
            if (forbiddenWord) {
                await this.discordLogger.logForbiddenWord(message, forbiddenWord, 'detected');
                // Log forbidden word to specific file
                forbiddenWordsLogger.info(`Forbidden word detected: ${message.author.tag} in #${message.channel.name}`, {
                    messageId: message.id,
                    authorId: message.author.id,
                    channelId: message.channel.id,
                    content: message.content?.substring(0, 200),
                    forbiddenWord: forbiddenWord
                });
            }

            await this.discordLogger.logMessage(message, 'sent');
            
            // Log to specific file
            messageLogger.info(`Message sent: ${message.author.tag} in #${message.channel.name}`, {
                messageId: message.id,
                authorId: message.author.id,
                channelId: message.channel.id,
                content: message.content?.substring(0, 200),
                forbiddenWord: forbiddenWord || null
            });
        } catch (error) {
            errorLogger.error('Error handling message create event:', error);
        }
    }

    // Message updated event
    async handleMessageUpdate(oldMessage, newMessage) {
        try {
            if (!this.shouldLogMessage(newMessage)) return;
            
            // Ignore if content hasn't changed (e.g., embed updates)
            if (oldMessage.content === newMessage.content) return;

            const embed = this.discordLogger.createEmbed(
                'Message Edited',
                `**Channel:** ${newMessage.channel.name} (${newMessage.channel.id})\n**Author:** ${newMessage.author.tag} (${newMessage.author.id})`,
                0xffff00,
                [
                    { name: 'Before', value: oldMessage.content || 'No content', inline: false },
                    { name: 'After', value: newMessage.content || 'No content', inline: false },
                    { name: 'Message ID', value: newMessage.id, inline: true },
                    { name: 'Edited At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'messages');
            
            // Log to specific file
            messageLogger.info(`Message edited: ${newMessage.author.tag} in #${newMessage.channel.name}`, {
                messageId: newMessage.id,
                authorId: newMessage.author.id,
                channelId: newMessage.channel.id,
                oldContent: oldMessage.content?.substring(0, 200),
                newContent: newMessage.content?.substring(0, 200)
            });
        } catch (error) {
            errorLogger.error('Error handling message update event:', error);
        }
    }

    // Message deleted event
    async handleMessageDelete(message) {
        try {
            if (!this.shouldLogMessage(message)) return;

            const embed = this.discordLogger.createEmbed(
                'Message Deleted',
                `**Channel:** ${message.channel.name} (${message.channel.id})\n**Author:** ${message.author.tag} (${message.author.id})`,
                0xff0000,
                [
                    { name: 'Content', value: message.content || 'No content', inline: false },
                    { name: 'Message ID', value: message.id, inline: true },
                    { name: 'Deleted At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'moderation');
            
            // Log to specific file
            moderationLogger.info(`Message deleted: ${message.author.tag} in #${message.channel.name}`, {
                messageId: message.id,
                authorId: message.author.id,
                channelId: message.channel.id,
                content: message.content?.substring(0, 200)
            });
        } catch (error) {
            errorLogger.error('Error handling message delete event:', error);
        }
    }

    // Bulk message delete event
    async handleMessageDeleteBulk(messages) {
        try {
            const validMessages = messages.filter(msg => this.shouldLogMessage(msg));
            
            if (validMessages.length === 0) return;

            const embed = this.discordLogger.createEmbed(
                'Bulk Messages Deleted',
                `**Channel:** ${validMessages[0].channel.name} (${validMessages[0].channel.id})\n**Count:** ${validMessages.length} messages`,
                0xff0000,
                [
                    { name: 'Deleted At', value: new Date().toISOString(), inline: true },
                    { name: 'Channel', value: validMessages[0].channel.name, inline: true }
                ]
            );

            // Add message details (limited to first 10)
            const messageDetails = validMessages.slice(0, 10).map(msg => 
                `**${msg.author.tag}:** ${msg.content?.substring(0, 50) || 'No content'}`
            ).join('\n');

            if (messageDetails) {
                embed.addFields({ name: 'Messages', value: messageDetails, inline: false });
            }

            if (validMessages.length > 10) {
                embed.addFields({ name: 'Note', value: `... and ${validMessages.length - 10} more messages`, inline: false });
            }

            await this.discordLogger.sendLog(embed, 'moderation');
            
            // Log to specific file
            moderationLogger.info(`Bulk messages deleted: ${validMessages.length} messages in #${validMessages[0].channel.name}`, {
                count: validMessages.length,
                channelId: validMessages[0].channel.id,
                channelName: validMessages[0].channel.name,
                messageIds: validMessages.map(msg => msg.id)
            });
        } catch (error) {
            errorLogger.error('Error handling message delete bulk event:', error);
        }
    }

    // Message reaction add event
    async handleMessageReactionAdd(reaction, user) {
        try {
            if (user.bot) return;

            const embed = this.discordLogger.createEmbed(
                'Reaction Added',
                `**Channel:** ${reaction.message.channel.name} (${reaction.message.channel.id})\n**User:** ${user.tag} (${user.id})`,
                0x00ff00,
                [
                    { name: 'Emoji', value: reaction.emoji.toString(), inline: true },
                    { name: 'Message ID', value: reaction.message.id, inline: true },
                    { name: 'Message Author', value: reaction.message.author.tag, inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'messages');
            
            // Log to specific file
            messageLogger.info(`Reaction added: ${user.tag} on message by ${reaction.message.author.tag}`, {
                emoji: reaction.emoji.toString(),
                userId: user.id,
                messageId: reaction.message.id,
                channelId: reaction.message.channel.id,
                channelName: reaction.message.channel.name
            });
        } catch (error) {
            errorLogger.error('Error handling message reaction add event:', error);
        }
    }

    // Message reaction remove event
    async handleMessageReactionRemove(reaction, user) {
        try {
            if (user.bot) return;

            const embed = this.discordLogger.createEmbed(
                'Reaction Removed',
                `**Channel:** ${reaction.message.channel.name} (${reaction.message.channel.id})\n**User:** ${user.tag} (${user.id})`,
                0xffa500,
                [
                    { name: 'Emoji', value: reaction.emoji.toString(), inline: true },
                    { name: 'Message ID', value: reaction.message.id, inline: true },
                    { name: 'Message Author', value: reaction.message.author.tag, inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'messages');
            
            // Log to specific file
            messageLogger.info(`Reaction removed: ${user.tag} on message by ${reaction.message.author.tag}`, {
                emoji: reaction.emoji.toString(),
                userId: user.id,
                messageId: reaction.message.id,
                channelId: reaction.message.channel.id,
                channelName: reaction.message.channel.name
            });
        } catch (error) {
            errorLogger.error('Error handling message reaction remove event:', error);
        }
    }

    registerEvents() {
        this.client.on('messageCreate', this.handleMessageCreate.bind(this));
        this.client.on('messageUpdate', this.handleMessageUpdate.bind(this));
        this.client.on('messageDelete', this.handleMessageDelete.bind(this));
        this.client.on('messageDeleteBulk', this.handleMessageDeleteBulk.bind(this));
        this.client.on('messageReactionAdd', this.handleMessageReactionAdd.bind(this));
        this.client.on('messageReactionRemove', this.handleMessageReactionRemove.bind(this));
    }
}

module.exports = MessageEvents; 