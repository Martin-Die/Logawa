const { logger } = require('../utils/logger');

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
            logger.error('Error fetching audit logs:', error);
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

                logger.info('Member kicked', {
                    userId: member.user.id,
                    userTag: member.user.tag,
                    moderatorId: moderator.id,
                    moderatorTag: moderator.tag,
                    reason: reason,
                    guildId: member.guild.id
                });
            } else {
                // Member left voluntarily
                await this.discordLogger.logMemberEvent(member, 'leave');
                
                logger.info('Member left', {
                    userId: member.user.id,
                    userTag: member.user.tag,
                    guildId: member.guild.id
                });
            }
        } catch (error) {
            logger.error('Error handling member remove event:', error);
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

                logger.info('Member banned', {
                    userId: ban.user.id,
                    userTag: ban.user.tag,
                    moderatorId: moderator.id,
                    moderatorTag: moderator.tag,
                    reason: reason,
                    guildId: ban.guild.id
                });
            }
        } catch (error) {
            logger.error('Error handling ban add event:', error);
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

                logger.info('Member unbanned', {
                    userId: ban.user.id,
                    userTag: ban.user.tag,
                    moderatorId: moderator.id,
                    moderatorTag: moderator.tag,
                    reason: reason,
                    guildId: ban.guild.id
                });
            }
        } catch (error) {
            logger.error('Error handling ban remove event:', error);
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

                    logger.info(`Member ${action}`, {
                        userId: newMember.user.id,
                        userTag: newMember.user.tag,
                        moderatorId: moderator.id,
                        moderatorTag: moderator.tag,
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
                            addedRoles.map(role => role.name).join(', ')
                        );
                    }

                    if (removedRoles.size > 0) {
                        await this.discordLogger.logModeration(
                            newMember.user,
                            moderator,
                            'role_remove',
                            reason,
                            removedRoles.map(role => role.name).join(', ')
                        );
                    }

                    logger.info('Member roles updated', {
                        userId: newMember.user.id,
                        userTag: newMember.user.tag,
                        moderatorId: moderator.id,
                        moderatorTag: moderator.tag,
                        addedRoles: addedRoles.map(role => role.name),
                        removedRoles: removedRoles.map(role => role.name),
                        reason: reason,
                        guildId: newMember.guild.id
                    });
                }
            }

            // Check for nickname changes
            if (oldMember.nickname !== newMember.nickname) {
                const nicknameLog = await newMember.guild.fetchAuditLogs({
                    type: 'MEMBER_UPDATE',
                    limit: 5
                });

                const nicknameEntry = nicknameLog.entries.find(entry => 
                    entry.target.id === newMember.user.id &&
                    entry.changes?.some(change => change.key === 'nick')
                );

                if (nicknameEntry) {
                    const moderator = nicknameEntry.executor;
                    const change = nicknameEntry.changes.find(c => c.key === 'nick');

                    const embed = this.discordLogger.createEmbed(
                        'Nickname Changed',
                        `**Member:** ${newMember.user.tag} (${newMember.user.id})\n**Moderator:** ${moderator.tag} (${moderator.id})`,
                        0x0099ff,
                        [
                            { name: 'Before', value: change.oldValue || 'No nickname', inline: true },
                            { name: 'After', value: change.newValue || 'No nickname', inline: true },
                            { name: 'Changed At', value: new Date().toISOString(), inline: true }
                        ]
                    );

                    await this.discordLogger.sendLog(embed);

                    logger.info('Member nickname changed', {
                        userId: newMember.user.id,
                        userTag: newMember.user.tag,
                        moderatorId: moderator.id,
                        moderatorTag: moderator.tag,
                        oldNickname: change.oldValue,
                        newNickname: change.newValue,
                        guildId: newMember.guild.id
                    });
                }
            }
        } catch (error) {
            logger.error('Error handling member update event:', error);
        }
    }

    // Member joined event
    async handleGuildMemberAdd(member) {
        try {
            await this.discordLogger.logMemberEvent(member, 'join', {
                'Account Created': new Date(member.user.createdTimestamp).toISOString(),
                'Joined At': new Date().toISOString()
            });

            logger.info('Member joined', {
                userId: member.user.id,
                userTag: member.user.tag,
                accountCreated: new Date(member.user.createdTimestamp).toISOString(),
                guildId: member.guild.id
            });
        } catch (error) {
            logger.error('Error handling member add event:', error);
        }
    }

    // Register all moderation event handlers
    registerEvents() {
        this.client.on('guildMemberAdd', this.handleGuildMemberAdd.bind(this));
        this.client.on('guildMemberRemove', this.handleGuildMemberRemove.bind(this));
        this.client.on('guildMemberUpdate', this.handleGuildMemberUpdate.bind(this));
        this.client.on('guildBanAdd', this.handleGuildBanAdd.bind(this));
        this.client.on('guildBanRemove', this.handleGuildBanRemove.bind(this));
        
        logger.info('Moderation events registered successfully');
    }
}

module.exports = ModerationEvents; 