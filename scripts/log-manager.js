const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { exec } = require('child_process');

class LogManager {
    constructor() {
        this.logsDir = './logs';
        this.backupDir = './logs/backup';
        this.archiveDir = './logs/archive';
        
        // Créer les répertoires nécessaires
        this.ensureDirectories();
    }

    ensureDirectories() {
        [this.logsDir, this.backupDir, this.archiveDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // Lister tous les fichiers de logs
    listLogFiles() {
        try {
            const files = fs.readdirSync(this.logsDir);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            console.log('📁 Fichiers de logs disponibles:');
            logFiles.forEach(file => {
                const filePath = path.join(this.logsDir, file);
                const stats = fs.statSync(filePath);
                const size = this.formatBytes(stats.size);
                const modified = moment(stats.mtime).format('YYYY-MM-DD HH:mm:ss');
                
                console.log(`  📄 ${file} (${size}) - Modifié: ${modified}`);
            });
            
            return logFiles;
        } catch (error) {
            console.error('❌ Erreur lors de la lecture des logs:', error.message);
            return [];
        }
    }

    // Analyser les logs d'un fichier
    analyzeLogFile(filename, options = {}) {
        const filePath = path.join(this.logsDir, filename);
        
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Fichier ${filename} non trouvé`);
            return null;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const analysis = {
                filename,
                totalLines: lines.length,
                fileSize: this.formatBytes(fs.statSync(filePath).size),
                lastModified: moment(fs.statSync(filePath).mtime).format('YYYY-MM-DD HH:mm:ss'),
                levels: {},
                errors: [],
                warnings: [],
                recentActivity: []
            };

            // Analyser chaque ligne
            lines.forEach((line, index) => {
                // Compter les niveaux de log
                const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG)\]/);
                if (levelMatch) {
                    const level = levelMatch[1];
                    analysis.levels[level] = (analysis.levels[level] || 0) + 1;
                }

                // Collecter les erreurs
                if (line.includes('[ERROR]')) {
                    analysis.errors.push({
                        line: index + 1,
                        content: line.substring(0, 200) + (line.length > 200 ? '...' : '')
                    });
                }

                // Collecter les warnings
                if (line.includes('[WARN]')) {
                    analysis.warnings.push({
                        line: index + 1,
                        content: line.substring(0, 200) + (line.length > 200 ? '...' : '')
                    });
                }

                // Activité récente (dernières 10 lignes)
                if (index >= lines.length - 10) {
                    analysis.recentActivity.push(line);
                }
            });

            return analysis;
        } catch (error) {
            console.error(`❌ Erreur lors de l'analyse de ${filename}:`, error.message);
            return null;
        }
    }

    // Rechercher dans les logs
    searchLogs(searchTerm, filename = null) {
        const files = filename ? [filename] : this.listLogFiles();
        const results = [];

        files.forEach(file => {
            const filePath = path.join(this.logsDir, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
                        results.push({
                            file,
                            line: index + 1,
                            content: line.trim()
                        });
                    }
                });
            } catch (error) {
                console.error(`❌ Erreur lors de la recherche dans ${file}:`, error.message);
            }
        });

        return results;
    }

    // Créer une sauvegarde
    createBackup(filename = null) {
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const files = filename ? [filename] : this.listLogFiles();
        
        console.log(`🔄 Création de sauvegarde...`);
        
        files.forEach(file => {
            const sourcePath = path.join(this.logsDir, file);
            const backupPath = path.join(this.backupDir, `${file}.${timestamp}`);
            
            try {
                fs.copyFileSync(sourcePath, backupPath);
                console.log(`  ✅ ${file} sauvegardé vers ${backupPath}`);
            } catch (error) {
                console.error(`  ❌ Erreur lors de la sauvegarde de ${file}:`, error.message);
            }
        });

        return timestamp;
    }

    // Nettoyer les anciennes sauvegardes
    cleanupBackups(daysToKeep = 7) {
        console.log(`🧹 Nettoyage des sauvegardes de plus de ${daysToKeep} jours...`);
        
        try {
            const files = fs.readdirSync(this.backupDir);
            const cutoffDate = moment().subtract(daysToKeep, 'days');
            let deletedCount = 0;

            files.forEach(file => {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                
                if (moment(stats.mtime).isBefore(cutoffDate)) {
                    fs.unlinkSync(filePath);
                    console.log(`  🗑️ Supprimé: ${file}`);
                    deletedCount++;
                }
            });

            console.log(`✅ Nettoyage terminé: ${deletedCount} fichiers supprimés`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage:', error.message);
            return 0;
        }
    }

    // Générer un rapport
    generateReport() {
        console.log('📊 Génération du rapport des logs...\n');
        
        const files = this.listLogFiles();
        const report = {
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            totalFiles: files.length,
            files: []
        };

        files.forEach(file => {
            const analysis = this.analyzeLogFile(file);
            if (analysis) {
                report.files.push(analysis);
            }
        });

        // Afficher le rapport
        console.log(`📈 RAPPORT DES LOGS - ${report.timestamp}`);
        console.log(`📁 Total de fichiers: ${report.totalFiles}\n`);

        report.files.forEach(file => {
            console.log(`📄 ${file.filename}`);
            console.log(`   📏 Taille: ${file.fileSize}`);
            console.log(`   📝 Lignes: ${file.totalLines}`);
            console.log(`   🕒 Modifié: ${file.lastModified}`);
            
            if (Object.keys(file.levels).length > 0) {
                console.log(`   📊 Niveaux:`);
                Object.entries(file.levels).forEach(([level, count]) => {
                    console.log(`      ${level}: ${count}`);
                });
            }

            if (file.errors.length > 0) {
                console.log(`   ❌ Erreurs: ${file.errors.length}`);
            }

            if (file.warnings.length > 0) {
                console.log(`   ⚠️ Warnings: ${file.warnings.length}`);
            }

            console.log('');
        });

        return report;
    }

    // Surveiller les logs en temps réel
    watchLogs(filename = 'all.log') {
        const filePath = path.join(this.logsDir, filename);
        
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Fichier ${filename} non trouvé`);
            return;
        }

        console.log(`👀 Surveillance de ${filename} en temps réel...`);
        console.log(`Appuyez sur Ctrl+C pour arrêter\n`);

        // Lire les dernières lignes
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const lastLines = lines.slice(-10);
        
        lastLines.forEach(line => {
            console.log(line);
        });

        // Surveiller les nouvelles lignes
        const watcher = fs.watch(filePath, (eventType, filename) => {
            if (eventType === 'change') {
                const newContent = fs.readFileSync(filePath, 'utf8');
                const newLines = newContent.split('\n').filter(line => line.trim());
                
                if (newLines.length > lines.length) {
                    const newLine = newLines[newLines.length - 1];
                    console.log(newLine);
                }
            }
        });

        // Gestion de l'arrêt
        process.on('SIGINT', () => {
            console.log('\n🛑 Surveillance arrêtée');
            watcher.close();
            process.exit(0);
        });
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
    const logManager = new LogManager();
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'list':
            logManager.listLogFiles();
            break;
            
        case 'analyze':
            const filename = args[1] || 'all.log';
            const analysis = logManager.analyzeLogFile(filename);
            if (analysis) {
                console.log('📊 Analyse de', filename);
                console.log('Taille:', analysis.fileSize);
                console.log('Lignes:', analysis.totalLines);
                console.log('Niveaux:', analysis.levels);
                if (analysis.errors.length > 0) {
                    console.log('Erreurs récentes:');
                    analysis.errors.slice(-5).forEach(error => {
                        console.log(`  Ligne ${error.line}: ${error.content}`);
                    });
                }
            }
            break;
            
        case 'search':
            const searchTerm = args[1];
            if (!searchTerm) {
                console.log('❌ Terme de recherche requis');
                process.exit(1);
            }
            const results = logManager.searchLogs(searchTerm, args[2]);
            console.log(`🔍 Résultats pour "${searchTerm}": ${results.length} trouvés`);
            results.slice(0, 10).forEach(result => {
                console.log(`${result.file}:${result.line} - ${result.content}`);
            });
            break;
            
        case 'backup':
            logManager.createBackup(args[1]);
            break;
            
        case 'cleanup':
            const days = parseInt(args[1]) || 7;
            logManager.cleanupBackups(days);
            break;
            
        case 'report':
            logManager.generateReport();
            break;
            
        case 'watch':
            logManager.watchLogs(args[1]);
            break;
            
        default:
            console.log(`
📝 Logawa Log Manager

Usage: node scripts/log-manager.js <command> [options]

Commandes:
  list                    Lister tous les fichiers de logs
  analyze [filename]      Analyser un fichier de log (défaut: all.log)
  search <term> [file]    Rechercher dans les logs
  backup [filename]       Créer une sauvegarde
  cleanup [days]          Nettoyer les anciennes sauvegardes (défaut: 7 jours)
  report                  Générer un rapport complet
  watch [filename]        Surveiller les logs en temps réel (défaut: all.log)

Exemples:
  node scripts/log-manager.js list
  node scripts/log-manager.js analyze error.log
  node scripts/log-manager.js search "ERROR"
  node scripts/log-manager.js backup
  node scripts/log-manager.js watch
            `);
    }
}

module.exports = LogManager; 