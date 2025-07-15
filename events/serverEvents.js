const { statusLogger, errorLogger } = require('../utils/logger');

class ServerEvents {
    constructor(client, discordLogger) {
        this.client = client;
        this.discordLogger = discordLogger;
    }

    // Channel created event
    async handleChannelCreate(channel) {
        try {
            await this.discordLogger.logChannelEvent(channel, 'created', {
                'Channel Type': channel.type,
                'Created By': 'System'
            });

            statusLogger.info('Channel created', {
                channelId: channel.id,
                channelName: channel.name,
                channelType: channel.type,
                guildId: channel.guild?.id
            });
        } catch (error) {
            errorLogger.error('Error handling channel create event:', error);
        }
    }

    // Channel deleted event
    async handleChannelDelete(channel) {
        try {
            await this.discordLogger.logChannelEvent(channel, 'deleted', {
                'Channel Type': channel.type,
                'Deleted By': 'System'
            });

            statusLogger.info('Channel deleted', {
                channelId: channel.id,
                channelName: channel.name,
                channelType: channel.type,
                guildId: channel.guild?.id
            });
        } catch (error) {
            errorLogger.error('Error handling channel delete event:', error);
        }
    }

    // Channel updated event
    async handleChannelUpdate(oldChannel, newChannel) {
        try {
            const changes = [];

            // Check for name changes
            if (oldChannel.name !== newChannel.name) {
                changes.push(`Name: ${oldChannel.name} → ${newChannel.name}`);
            }

            // Check for topic changes (text channels only)
            if (oldChannel.topic !== newChannel.topic) {
                changes.push(`Topic: ${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}`);
            }

            // Check for permission changes
            if (oldChannel.permissionOverwrites.cache.size !== newChannel.permissionOverwrites.cache.size) {
                changes.push('Permissions updated');
            }

            if (changes.length > 0) {
                await this.discordLogger.logChannelEvent(newChannel, 'updated', {
                    'Changes': changes.join('\n'),
                    'Updated By': 'System'
                });

                statusLogger.info('Channel updated', {
                    channelId: newChannel.id,
                    channelName: newChannel.name,
                    changes: changes,
                    guildId: newChannel.guild?.id
                });
            }
        } catch (error) {
            errorLogger.error('Error handling channel update event:', error);
        }
    }

    // Role created event
    async handleRoleCreate(role) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Role Created',
                `**Role:** ${role.name} (${role.id})`,
                0x00ff00,
                [
                    { name: 'Color', value: role.hexColor, inline: true },
                    { name: 'Position', value: role.position.toString(), inline: true },
                    { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                    { name: 'Hoist', value: role.hoist ? 'Yes' : 'No', inline: true },
                    { name: 'Created At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');

            statusLogger.info('Role created', {
                roleId: role.id,
                roleName: role.name,
                color: role.hexColor,
                position: role.position,
                guildId: role.guild.id
            });
        } catch (error) {
            errorLogger.error('Error handling role create event:', error);
        }
    }

    // Role deleted event
    async handleRoleDelete(role) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Role Deleted',
                `**Role:** ${role.name} (${role.id})`,
                0xff0000,
                [
                    { name: 'Color', value: role.hexColor, inline: true },
                    { name: 'Position', value: role.position.toString(), inline: true },
                    { name: 'Deleted At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');

            statusLogger.info('Role deleted', {
                roleId: role.id,
                roleName: role.name,
                color: role.hexColor,
                position: role.position,
                guildId: role.guild.id
            });
        } catch (error) {
            errorLogger.error('Error handling role delete event:', error);
        }
    }

    // Role updated event
    async handleRoleUpdate(oldRole, newRole) {
        try {
            const changes = [];

            // Check for name changes
            if (oldRole.name !== newRole.name) {
                changes.push(`Name: ${oldRole.name} → ${newRole.name}`);
            }

            // Check for color changes
            if (oldRole.color !== newRole.color) {
                changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
            }

            // Check for permission changes
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                changes.push('Permissions updated');
            }

            // Check for other property changes
            if (oldRole.hoist !== newRole.hoist) {
                changes.push(`Hoist: ${oldRole.hoist} → ${newRole.hoist}`);
            }

            if (oldRole.mentionable !== newRole.mentionable) {
                changes.push(`Mentionable: ${oldRole.mentionable} → ${newRole.mentionable}`);
            }

            if (changes.length > 0) {
                const embed = this.discordLogger.createEmbed(
                    'Role Updated',
                    `**Role:** ${newRole.name} (${newRole.id})`,
                    0xffff00,
                    [
                        { name: 'Changes', value: changes.join('\n'), inline: false },
                        { name: 'Updated At', value: new Date().toISOString(), inline: true }
                    ]
                );

                await this.discordLogger.sendLog(embed, 'status');

                statusLogger.info('Role updated', {
                    roleId: newRole.id,
                    roleName: newRole.name,
                    changes: changes,
                    guildId: newRole.guild.id
                });
            }
        } catch (error) {
            errorLogger.error('Error handling role update event:', error);
        }
    }

    // Emoji events
    async handleEmojiCreate(emoji) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Emoji Created',
                `**Emoji:** ${emoji.name} (${emoji.id})`,
                0x00ff00,
                [
                    { name: 'Name', value: emoji.name, inline: true },
                    { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
                    { name: 'Created At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');

            statusLogger.info('Emoji created', {
                emojiId: emoji.id,
                emojiName: emoji.name,
                animated: emoji.animated,
                guildId: emoji.guild.id
            });
        } catch (error) {
            errorLogger.error('Error handling emoji create event:', error);
        }
    }

    async handleEmojiDelete(emoji) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Emoji Deleted',
                `**Emoji:** ${emoji.name} (${emoji.id})`,
                0xff0000,
                [
                    { name: 'Name', value: emoji.name, inline: true },
                    { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
                    { name: 'Deleted At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');

            statusLogger.info('Emoji deleted', {
                emojiId: emoji.id,
                emojiName: emoji.name,
                animated: emoji.animated,
                guildId: emoji.guild.id
            });
        } catch (error) {
            errorLogger.error('Error handling emoji delete event:', error);
        }
    }

    // Invite events
    async handleInviteCreate(invite) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Invite Created',
                `**Channel:** ${invite.channel.name} (${invite.channel.id})\n**Created By:** ${invite.inviter?.tag || 'Unknown'} (${invite.inviter?.id || 'Unknown'})`,
                0x00ff00,
                [
                    { name: 'Code', value: invite.code, inline: true },
                    { name: 'Max Uses', value: invite.maxUses ? invite.maxUses.toString() : 'Unlimited', inline: true },
                    { name: 'Max Age', value: invite.maxAge ? `${invite.maxAge} seconds` : 'Never', inline: true },
                    { name: 'Created At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');

            statusLogger.info('Invite created', {
                inviteCode: invite.code,
                channelId: invite.channel.id,
                channelName: invite.channel.name,
                inviterId: invite.inviter?.id,
                inviterTag: invite.inviter?.tag,
                maxUses: invite.maxUses,
                maxAge: invite.maxAge,
                guildId: invite.guild.id
            });
        } catch (error) {
            errorLogger.error('Error handling invite create event:', error);
        }
    }

    async handleInviteDelete(invite) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Invite Deleted',
                `**Channel:** ${invite.channel.name} (${invite.channel.id})`,
                0xff0000,
                [
                    { name: 'Code', value: invite.code, inline: true },
                    { name: 'Deleted At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'status');

            statusLogger.info('Invite deleted', {
                inviteCode: invite.code,
                channelId: invite.channel.id,
                channelName: invite.channel.name,
                guildId: invite.guild.id
            });
        } catch (error) {
            errorLogger.error('Error handling invite delete event:', error);
        }
    }

    // Register all server event handlers
    registerEvents() {
        this.client.on('channelCreate', this.handleChannelCreate.bind(this));
        this.client.on('channelDelete', this.handleChannelDelete.bind(this));
        this.client.on('channelUpdate', this.handleChannelUpdate.bind(this));
        this.client.on('roleCreate', this.handleRoleCreate.bind(this));
        this.client.on('roleDelete', this.handleRoleDelete.bind(this));
        this.client.on('roleUpdate', this.handleRoleUpdate.bind(this));
        this.client.on('emojiCreate', this.handleEmojiCreate.bind(this));
        this.client.on('emojiDelete', this.handleEmojiDelete.bind(this));
        this.client.on('inviteCreate', this.handleInviteCreate.bind(this));
        this.client.on('inviteDelete', this.handleInviteDelete.bind(this));
        
        statusLogger.info('Server events registered successfully');
    }
}

module.exports = ServerEvents; 