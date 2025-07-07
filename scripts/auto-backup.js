const LogManager = require('./log-manager');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class AutoBackup {
    constructor() {
        this.logManager = new LogManager();
        this.backupConfig = {
            enabled: process.env.AUTO_BACKUP_ENABLED === 'true',
            interval: parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24, // heures
            retention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30, // jours
            compress: process.env.BACKUP_COMPRESS === 'true',
            notifyDiscord: process.env.BACKUP_NOTIFY_DISCORD === 'true',
            webhookUrl: process.env.BACKUP_WEBHOOK_URL
        };
    }

    // Créer une sauvegarde complète
    async createFullBackup() {
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        console.log(`🔄 Création de sauvegarde automatique: ${timestamp}`);

        try {
            // Créer la sauvegarde
            const backupTimestamp = this.logManager.createBackup();
            
            // Compresser si activé
            if (this.backupConfig.compress) {
                await this.compressBackup(backupTimestamp);
            }

            // Nettoyer les anciennes sauvegardes
            const deletedCount = this.logManager.cleanupBackups(this.backupConfig.retention);

            // Notifier Discord si activé
            if (this.backupConfig.notifyDiscord && this.backupConfig.webhookUrl) {
                await this.notifyDiscord(backupTimestamp, deletedCount);
            }

            console.log(`✅ Sauvegarde automatique terminée: ${backupTimestamp}`);
            return backupTimestamp;

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde automatique:', error);
            
            if (this.backupConfig.notifyDiscord && this.backupConfig.webhookUrl) {
                await this.notifyDiscordError(error);
            }
            
            throw error;
        }
    }

    // Compresser la sauvegarde
    async compressBackup(timestamp) {
        const { exec } = require('child_process');
        const backupDir = './logs/backup';
        const archiveDir = './logs/archive';
        
        // Créer le répertoire d'archive
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            const archivePath = path.join(archiveDir, `backup-${timestamp}.tar.gz`);
            
            exec(`tar -czf "${archivePath}" -C "${backupDir}" .`, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Erreur lors de la compression:', error);
                    reject(error);
                    return;
                }

                console.log(`📦 Sauvegarde compressée: ${archivePath}`);
                
                // Supprimer les fichiers non compressés
                const files = fs.readdirSync(backupDir);
                files.forEach(file => {
                    if (file.includes(timestamp)) {
                        fs.unlinkSync(path.join(backupDir, file));
                    }
                });

                resolve(archivePath);
            });
        });
    }

    // Notifier Discord du succès
    async notifyDiscord(timestamp, deletedCount) {
        try {
            const { WebhookClient, EmbedBuilder } = require('discord.js');
            const webhook = new WebhookClient({ url: this.backupConfig.webhookUrl });

            const embed = new EmbedBuilder()
                .setTitle('🔄 Sauvegarde Automatique Terminée')
                .setDescription(`Sauvegarde des logs créée avec succès`)
                .setColor(0x00ff00)
                .setTimestamp()
                .addFields(
                    { name: '📅 Timestamp', value: timestamp, inline: true },
                    { name: '🗑️ Anciens fichiers supprimés', value: deletedCount.toString(), inline: true },
                    { name: '📦 Compression', value: this.backupConfig.compress ? 'Activée' : 'Désactivée', inline: true }
                )
                .setFooter({ text: 'LOGAWA Auto Backup' });

            await webhook.send({ embeds: [embed] });
            console.log('📢 Notification Discord envoyée');

        } catch (error) {
            console.error('❌ Erreur lors de la notification Discord:', error);
        }
    }

    // Notifier Discord des erreurs
    async notifyDiscordError(error) {
        try {
            const { WebhookClient, EmbedBuilder } = require('discord.js');
            const webhook = new WebhookClient({ url: this.backupConfig.webhookUrl });

            const embed = new EmbedBuilder()
                .setTitle('❌ Erreur de Sauvegarde Automatique')
                .setDescription(`La sauvegarde automatique a échoué`)
                .setColor(0xff0000)
                .setTimestamp()
                .addFields(
                    { name: '🚨 Erreur', value: error.message, inline: false },
                    { name: '⏰ Heure', value: moment().format('YYYY-MM-DD HH:mm:ss'), inline: true }
                )
                .setFooter({ text: 'LOGAWA Auto Backup' });

            await webhook.send({ embeds: [embed] });

        } catch (notifyError) {
            console.error('❌ Erreur lors de la notification d\'erreur Discord:', notifyError);
        }
    }

    // Démarrer la sauvegarde automatique
    startAutoBackup() {
        if (!this.backupConfig.enabled) {
            console.log('⚠️ Sauvegarde automatique désactivée');
            return;
        }

        console.log(`🔄 Sauvegarde automatique configurée:`);
        console.log(`   ⏰ Intervalle: ${this.backupConfig.interval} heures`);
        console.log(`   📅 Rétention: ${this.backupConfig.retention} jours`);
        console.log(`   📦 Compression: ${this.backupConfig.compress ? 'Activée' : 'Désactivée'}`);
        console.log(`   📢 Notifications Discord: ${this.backupConfig.notifyDiscord ? 'Activées' : 'Désactivées'}`);

        // Première sauvegarde immédiate
        this.createFullBackup();

        // Sauvegarde périodique
        const intervalMs = this.backupConfig.interval * 60 * 60 * 1000; // heures en millisecondes
        
        setInterval(async () => {
            try {
                await this.createFullBackup();
            } catch (error) {
                console.error('❌ Erreur lors de la sauvegarde périodique:', error);
            }
        }, intervalMs);

        console.log(`✅ Sauvegarde automatique démarrée (prochaine dans ${this.backupConfig.interval} heures)`);
    }

    // Créer un rapport de sauvegarde
    generateBackupReport() {
        const backupDir = './logs/backup';
        const archiveDir = './logs/archive';
        
        console.log('📊 RAPPORT DE SAUVEGARDE\n');

        // Analyser les sauvegardes
        let backupFiles = [];
        let archiveFiles = [];

        try {
            if (fs.existsSync(backupDir)) {
                backupFiles = fs.readdirSync(backupDir)
                    .filter(file => file.endsWith('.log'))
                    .map(file => {
                        const filePath = path.join(backupDir, file);
                        const stats = fs.statSync(filePath);
                        return {
                            name: file,
                            size: stats.size,
                            modified: stats.mtime
                        };
                    });
            }

            if (fs.existsSync(archiveDir)) {
                archiveFiles = fs.readdirSync(archiveDir)
                    .filter(file => file.endsWith('.tar.gz'))
                    .map(file => {
                        const filePath = path.join(archiveDir, file);
                        const stats = fs.statSync(filePath);
                        return {
                            name: file,
                            size: stats.size,
                            modified: stats.mtime
                        };
                    });
            }

            // Afficher le rapport
            console.log(`📁 Sauvegardes non compressées: ${backupFiles.length}`);
            backupFiles.forEach(file => {
                const size = this.formatBytes(file.size);
                const modified = moment(file.modified).format('YYYY-MM-DD HH:mm:ss');
                console.log(`   📄 ${file.name} (${size}) - ${modified}`);
            });

            console.log(`\n📦 Sauvegardes compressées: ${archiveFiles.length}`);
            archiveFiles.forEach(file => {
                const size = this.formatBytes(file.size);
                const modified = moment(file.modified).format('YYYY-MM-DD HH:mm:ss');
                console.log(`   📦 ${file.name} (${size}) - ${modified}`);
            });

            // Calculer l'espace total
            const totalBackupSize = backupFiles.reduce((sum, file) => sum + file.size, 0);
            const totalArchiveSize = archiveFiles.reduce((sum, file) => sum + file.size, 0);
            const totalSize = totalBackupSize + totalArchiveSize;

            console.log(`\n📊 Statistiques:`);
            console.log(`   💾 Espace total: ${this.formatBytes(totalSize)}`);
            console.log(`   📁 Fichiers non compressés: ${this.formatBytes(totalBackupSize)}`);
            console.log(`   📦 Fichiers compressés: ${this.formatBytes(totalArchiveSize)}`);

        } catch (error) {
            console.error('❌ Erreur lors de la génération du rapport:', error);
        }
    }

    // Formater les bytes
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Interface en ligne de commande
if (require.main === module) {
    const autoBackup = new AutoBackup();
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'start':
            autoBackup.startAutoBackup();
            break;
            
        case 'backup':
            autoBackup.createFullBackup()
                .then(() => console.log('✅ Sauvegarde terminée'))
                .catch(error => console.error('❌ Erreur:', error));
            break;
            
        case 'report':
            autoBackup.generateBackupReport();
            break;
            
        case 'config':
            console.log('⚙️ Configuration de la sauvegarde automatique:');
            console.log('   Activée:', autoBackup.backupConfig.enabled);
            console.log('   Intervalle:', autoBackup.backupConfig.interval, 'heures');
            console.log('   Rétention:', autoBackup.backupConfig.retention, 'jours');
            console.log('   Compression:', autoBackup.backupConfig.compress);
            console.log('   Notifications Discord:', autoBackup.backupConfig.notifyDiscord);
            break;
            
        default:
            console.log(`
🔄 Logawa Auto Backup

Usage: node scripts/auto-backup.js <command>

Commandes:
  start                   Démarrer la sauvegarde automatique
  backup                  Créer une sauvegarde manuelle
  report                  Générer un rapport de sauvegarde
  config                  Afficher la configuration

Variables d'environnement:
  AUTO_BACKUP_ENABLED=true/false
  BACKUP_INTERVAL_HOURS=24
  BACKUP_RETENTION_DAYS=30
  BACKUP_COMPRESS=true/false
  BACKUP_NOTIFY_DISCORD=true/false
  BACKUP_WEBHOOK_URL=url_webhook_discord

Exemples:
  node scripts/auto-backup.js start
  node scripts/auto-backup.js backup
  node scripts/auto-backup.js report
            `);
    }
}

module.exports = AutoBackup; 