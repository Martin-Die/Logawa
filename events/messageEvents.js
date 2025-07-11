const { logger } = require('../utils/logger');
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
                
                // Log statistics
                logger.info(`Mot interdit détecté: "${forbiddenWord}" dans le message de ${message.author.tag}`, {
                    messageId: message.id,
                    authorId: message.author.id,
                    channelId: message.channel.id,
                    forbiddenWord: forbiddenWord,
                    totalForbiddenWords: config.forbiddenWords.length
                });
            }

            await this.discordLogger.logMessage(message, 'sent');
            
            logger.info('Message created', {
                messageId: message.id,
                authorId: message.author.id,
                authorTag: message.author.tag,
                channelId: message.channel.id,
                channelName: message.channel.name,
                content: message.content?.substring(0, 200),
                attachments: message.attachments.size,
                embeds: message.embeds.length,
                forbiddenWord: forbiddenWord || null
            });
        } catch (error) {
            logger.error('Error handling message create event:', error);
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
            
            logger.info('Message edited', {
                messageId: newMessage.id,
                authorId: newMessage.author.id,
                authorTag: newMessage.author.tag,
                channelId: newMessage.channel.id,
                channelName: newMessage.channel.name,
                oldContent: oldMessage.content?.substring(0, 200),
                newContent: newMessage.content?.substring(0, 200)
            });
        } catch (error) {
            logger.error('Error handling message update event:', error);
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

            await this.discordLogger.sendLog(embed, 'messages');
            
            logger.info('Message deleted', {
                messageId: message.id,
                authorId: message.author.id,
                authorTag: message.author.tag,
                channelId: message.channel.id,
                channelName: message.channel.name,
                content: message.content?.substring(0, 200)
            });
        } catch (error) {
            logger.error('Error handling message delete event:', error);
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

            await this.discordLogger.sendLog(embed, 'messages');
            
            logger.info('Bulk messages deleted', {
                count: validMessages.length,
                channelId: validMessages[0].channel.id,
                channelName: validMessages[0].channel.name,
                messageIds: validMessages.map(msg => msg.id)
            });
        } catch (error) {
            logger.error('Error handling bulk message delete event:', error);
        }
    }

    // Message reaction events
    async handleMessageReactionAdd(reaction, user) {
        try {
            if (user.bot) return;
            
            const message = reaction.message;
            if (!this.shouldLogMessage(message)) return;

            const embed = this.discordLogger.createEmbed(
                'Reaction Added',
                `**Channel:** ${message.channel.name} (${message.channel.id})\n**Message Author:** ${message.author.tag}\n**Reactor:** ${user.tag} (${user.id})`,
                0x00ff00,
                [
                    { name: 'Emoji', value: reaction.emoji.toString(), inline: true },
                    { name: 'Message ID', value: message.id, inline: true },
                    { name: 'Reaction Count', value: reaction.count.toString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'messages');
            
            logger.info('Reaction added', {
                messageId: message.id,
                reactorId: user.id,
                reactorTag: user.tag,
                emoji: reaction.emoji.toString(),
                channelId: message.channel.id
            });
        } catch (error) {
            logger.error('Error handling reaction add event:', error);
        }
    }

    async handleMessageReactionRemove(reaction, user) {
        try {
            if (user.bot) return;
            
            const message = reaction.message;
            if (!this.shouldLogMessage(message)) return;

            const embed = this.discordLogger.createEmbed(
                'Reaction Removed',
                `**Channel:** ${message.channel.name} (${message.channel.id})\n**Message Author:** ${message.author.tag}\n**Reactor:** ${user.tag} (${user.id})`,
                0xffa500,
                [
                    { name: 'Emoji', value: reaction.emoji.toString(), inline: true },
                    { name: 'Message ID', value: message.id, inline: true },
                    { name: 'Remaining Reactions', value: (reaction.count - 1).toString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed);
            
            logger.info('Reaction removed', {
                messageId: message.id,
                reactorId: user.id,
                reactorTag: user.tag,
                emoji: reaction.emoji.toString(),
                channelId: message.channel.id
            });
        } catch (error) {
            logger.error('Error handling reaction remove event:', error);
        }
    }

    // Register all message event handlers
    registerEvents() {
        this.client.on('messageCreate', this.handleMessageCreate.bind(this));
        this.client.on('messageUpdate', this.handleMessageUpdate.bind(this));
        this.client.on('messageDelete', this.handleMessageDelete.bind(this));
        this.client.on('messageDeleteBulk', this.handleMessageDeleteBulk.bind(this));
        this.client.on('messageReactionAdd', this.handleMessageReactionAdd.bind(this));
        this.client.on('messageReactionRemove', this.handleMessageReactionRemove.bind(this));
        
        logger.info('Message events registered successfully');
    }
}

module.exports = MessageEvents; 