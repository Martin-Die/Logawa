const { moderationLogger, errorLogger } = require('../utils/logger');

class ModerationEvents {
    constructor(client, discordLogger) {
        this.client = client;
        this.discordLogger = discordLogger;
    }

    // Get moderator from audit logs
    async getModerator(guild, actionType, targetId) {
        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: actionType,
                limit: 1
            });

            const log = auditLogs.entries.first();
            if (log && log.target.id === targetId) {
                return log.executor;
            }
            return null;
        } catch (error) {
            errorLogger.error('Error fetching audit logs:', error);
            return null;
        }
    }

    // Member kicked event
    async handleGuildMemberRemove(member) {
        try {
            // Check if it was a kick
            const kickLog = await member.guild.fetchAuditLogs({
                type: 'MEMBER_KICK',
                limit: 1
            });

            const kickEntry = kickLog.entries.first();
            if (kickEntry && kickEntry.target.id === member.user.id) {
                const moderator = kickEntry.executor;
                const reason = kickEntry.reason || 'No reason provided';

                await this.discordLogger.logModeration(
                    member.user,
                    moderator,
                    'kick',
                    reason
                );
                
                // Log to specific file
                moderationLogger.info(`Member kicked: ${member.user.tag} by ${moderator.tag}`, {
                    userId: member.user.id,
                    moderatorId: moderator.id,
                    reason: reason,
                    guildId: member.guild.id
                });
            } else {
                // Member left voluntarily
                const embed = this.discordLogger.createEmbed(
                    'Member Left',
                    `**Member:** ${member.user.tag} (${member.user.id})`,
                    0xffa500,
                    [
                        { name: 'Left At', value: new Date().toISOString(), inline: true }
                    ]
                );

                await this.discordLogger.sendLog(embed, 'moderation');

                // Log to specific file
                moderationLogger.info(`Member left: ${member.user.tag}`, {
                    userId: member.user.id,
                    guildId: member.guild.id,
                    leftAt: new Date().toISOString()
                });
            }
        } catch (error) {
            errorLogger.error('Error handling member remove event:', error);
        }
    }

    // Member banned event
    async handleGuildBanAdd(ban) {
        try {
            const banLog = await ban.guild.fetchAuditLogs({
                type: 'MEMBER_BAN',
                limit: 1
            });

            const banEntry = banLog.entries.first();
            if (banEntry && banEntry.target.id === ban.user.id) {
                const moderator = banEntry.executor;
                const reason = banEntry.reason || 'No reason provided';

                await this.discordLogger.logModeration(
                    ban.user,
                    moderator,
                    'ban',
                    reason
                );
                
                // Log to specific file
                moderationLogger.info(`Member banned: ${ban.user.tag} by ${moderator.tag}`, {
                    userId: ban.user.id,
                    moderatorId: moderator.id,
                    reason: reason,
                    guildId: ban.guild.id
                });
            }
        } catch (error) {
            errorLogger.error('Error handling ban add event:', error);
        }
    }

    // Member unbanned event
    async handleGuildBanRemove(ban) {
        try {
            const unbanLog = await ban.guild.fetchAuditLogs({
                type: 'MEMBER_UNBAN',
                limit: 1
            });

            const unbanEntry = unbanLog.entries.first();
            if (unbanEntry && unbanEntry.target.id === ban.user.id) {
                const moderator = unbanEntry.executor;
                const reason = unbanEntry.reason || 'No reason provided';

                await this.discordLogger.logModeration(
                    ban.user,
                    moderator,
                    'unban',
                    reason
                );
                
                // Log to specific file
                moderationLogger.info(`Member unbanned: ${ban.user.tag} by ${moderator.tag}`, {
                    userId: ban.user.id,
                    moderatorId: moderator.id,
                    reason: reason,
                    guildId: ban.guild.id
                });
            }
        } catch (error) {
            errorLogger.error('Error handling ban remove event:', error);
        }
    }

    // Member timeout event
    async handleGuildMemberUpdate(oldMember, newMember) {
        try {
            // Check for timeout changes
            if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
                const timeoutLog = await newMember.guild.fetchAuditLogs({
                    type: 'MEMBER_UPDATE',
                    limit: 5
                });

                const timeoutEntry = timeoutLog.entries.find(entry => 
                    entry.target.id === newMember.user.id && 
                    entry.changes?.some(change => change.key === 'communication_disabled_until')
                );

                if (timeoutEntry) {
                    const moderator = timeoutEntry.executor;
                    const reason = timeoutEntry.reason || 'No reason provided';
                    const change = timeoutEntry.changes.find(c => c.key === 'communication_disabled_until');
                    
                    let action = 'timeout';
                    let duration = null;

                    if (change.newValue) {
                        const timeoutEnd = new Date(change.newValue);
                        const now = new Date();
                        const durationMs = timeoutEnd.getTime() - now.getTime();
                        duration = `${Math.ceil(durationMs / (1000 * 60))} minutes`;
                    } else {
                        action = 'timeout_removed';
                    }

                    await this.discordLogger.logModeration(
                        newMember.user,
                        moderator,
                        action,
                        reason,
                        duration
                    );
                    
                    // Log to specific file
                    moderationLogger.info(`Member ${action}: ${newMember.user.tag} by ${moderator.tag}`, {
                        userId: newMember.user.id,
                        moderatorId: moderator.id,
                        reason: reason,
                        duration: duration,
                        guildId: newMember.guild.id
                    });
                }
            }

            // Check for role changes
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0 || removedRoles.size > 0) {
                const roleLog = await newMember.guild.fetchAuditLogs({
                    type: 'MEMBER_ROLE_UPDATE',
                    limit: 5
                });

                const roleEntry = roleLog.entries.find(entry => 
                    entry.target.id === newMember.user.id
                );

                if (roleEntry) {
                    const moderator = roleEntry.executor;
                    const reason = roleEntry.reason || 'No reason provided';

                    if (addedRoles.size > 0) {
                        await this.discordLogger.logModeration(
                            newMember.user,
                            moderator,
                            'role_add',
                            reason,
                            `Added: ${addedRoles.map(r => r.name).join(', ')}`
                        );
                        
                        // Log to specific file
                        moderationLogger.info(`Roles added: ${newMember.user.tag} by ${moderator.tag}`, {
                            userId: newMember.user.id,
                            moderatorId: moderator.id,
                            reason: reason,
                            roles: addedRoles.map(r => r.name).join(', '),
                            guildId: newMember.guild.id
                        });
                    }

                    if (removedRoles.size > 0) {
                        await this.discordLogger.logModeration(
                            newMember.user,
                            moderator,
                            'role_remove',
                            reason,
                            `Removed: ${removedRoles.map(r => r.name).join(', ')}`
                        );
                        
                        // Log to specific file
                        moderationLogger.info(`Roles removed: ${newMember.user.tag} by ${moderator.tag}`, {
                            userId: newMember.user.id,
                            moderatorId: moderator.id,
                            reason: reason,
                            roles: removedRoles.map(r => r.name).join(', '),
                            guildId: newMember.guild.id
                        });
                    }
                }
            }
        } catch (error) {
            errorLogger.error('Error handling member update event:', error);
        }
    }

    // Member joined event
    async handleGuildMemberAdd(member) {
        try {
            const embed = this.discordLogger.createEmbed(
                'Member Joined',
                `**Member:** ${member.user.tag} (${member.user.id})`,
                0x00ff00,
                [
                    { name: 'Account Created', value: new Date(member.user.createdTimestamp).toISOString(), inline: true },
                    { name: 'Joined At', value: new Date().toISOString(), inline: true }
                ]
            );

            await this.discordLogger.sendLog(embed, 'moderation');

            // Log to specific file
            moderationLogger.info(`Member joined: ${member.user.tag}`, {
                userId: member.user.id,
                guildId: member.guild.id,
                joinedAt: new Date().toISOString(),
                accountCreatedAt: new Date(member.user.createdTimestamp).toISOString()
            });
        } catch (error) {
            errorLogger.error('Error handling member add event:', error);
        }
    }

    registerEvents() {
        this.client.on('guildMemberAdd', this.handleGuildMemberAdd.bind(this));
        this.client.on('guildMemberRemove', this.handleGuildMemberRemove.bind(this));
        this.client.on('guildMemberUpdate', this.handleGuildMemberUpdate.bind(this));
        this.client.on('guildBanAdd', this.handleGuildBanAdd.bind(this));
        this.client.on('guildBanRemove', this.handleGuildBanRemove.bind(this));
    }
}

module.exports = ModerationEvents; 