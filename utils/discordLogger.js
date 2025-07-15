const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const config = require('../config');
const { errorLogger } = require('./logger');

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

    async initialize() {
        try {
            // Initialize all log channels
            const channelPromises = Object.entries(config.logChannels).map(async ([type, channelId]) => {
                if (channelId) {
                    try {
                        const channel = await this.client.channels.fetch(channelId);
                        if (channel) {
                            this.logChannels[type] = channel;
                            console.log(`Log channel '${type}' initialized successfully`);
                        } else {
                            console.warn(`Log channel '${type}' not found: ${channelId}`);
                        }
                    } catch (error) {
                        errorLogger.error(`Failed to initialize log channel '${type}':`, error);
                    }
                }
            });

            await Promise.all(channelPromises);
            
            // Check if at least one channel is available
            const availableChannels = Object.values(this.logChannels).filter(channel => channel !== null);
            if (availableChannels.length === 0) {
                errorLogger.error('No log channels could be initialized');
                return false;
            }
            
            console.log(`Discord logger initialized successfully with ${availableChannels.length} channels`);
            return true;
        } catch (error) {
            errorLogger.error('Failed to initialize Discord logger:', error);
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
                    fallbackChannel = this.logChannels.status || this.logChannels.messages;
                } else if (channelType === 'forbiddenWords') {
                    fallbackChannel = this.logChannels.messages || this.logChannels.status;
                } else if (channelType === 'status') {
                    fallbackChannel = this.logChannels.messages;
                } else {
                    fallbackChannel = this.logChannels.status;
                }
                
                if (!fallbackChannel) {
                    fallbackChannel = Object.values(this.logChannels).find(ch => ch !== null);
                }
                
                if (fallbackChannel) {
                    await fallbackChannel.send({ embeds: [embed] });
                    console.warn(`Log sent to fallback channel '${fallbackChannel.name}' instead of '${channelType}'`);
                }
            }
        } catch (error) {
            errorLogger.error(`Failed to send log to Discord channel '${channelType}':`, error);
        }
    }

    createEmbed(title, description, color = 0x00ff00, fields = []) {
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

        Object.entries(details).forEach(([key, value]) => {
            embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: value.toString(), inline: true });
        });

        await this.sendLog(embed, 'status');
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
    }

    // Log status events
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
    }
}

module.exports = DiscordLogger; 