const fs = require('fs');
const path = require('path');
const moment = require('moment');
const https = require('https');

class GitHubLogger {
    constructor() {
        this.token = process.env.GITHUB_TOKEN;
        this.repo = process.env.GITHUB_REPO; // format: "username/repository"
        this.branch = process.env.GITHUB_BRANCH || 'main';
        this.logsDir = './logs';
        this.uploadInterval = parseInt(process.env.GITHUB_UPLOAD_INTERVAL) || 300000; // 5 minutes
        this.enabled = process.env.GITHUB_LOGGING_ENABLED === 'true';
        
        this.uploadQueue = [];
        this.isUploading = false;
    }

    // Initialiser le logger GitHub
    initialize() {
        if (!this.enabled) {
            console.log('⚠️ GitHub logging désactivé');
            return;
        }

        if (!this.token || !this.repo) {
            console.log('⚠️ GitHub token ou repository non configuré');
            return;
        }

        console.log(`🔄 GitHub logging initialisé pour ${this.repo}`);
        
        // Démarrer l'upload périodique
        setInterval(() => {
            this.processUploadQueue();
        }, this.uploadInterval);
    }

    // Ajouter un fichier à la queue d'upload
    async queueFileUpload(filePath, content) {
        if (!this.enabled) return;

        const fileName = path.basename(filePath);
        const date = moment().format('YYYY/MM/DD');
        const githubPath = `logs/${date}/${fileName}`;

        this.uploadQueue.push({
            path: githubPath,
            content: content,
            message: `Update log file: ${fileName}`,
            timestamp: Date.now()
        });

        console.log(`📤 Ajouté à la queue GitHub: ${fileName}`);
    }

    // Traiter la queue d'upload
    async processUploadQueue() {
        if (this.isUploading || this.uploadQueue.length === 0) return;

        this.isUploading = true;
        console.log(`🔄 Traitement de ${this.uploadQueue.length} fichiers...`);

        try {
            for (const item of this.uploadQueue) {
                await this.uploadFile(item);
                await this.delay(1000); // Pause entre les uploads
            }

            this.uploadQueue = [];
            console.log('✅ Queue GitHub traitée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors du traitement de la queue GitHub:', error);
        } finally {
            this.isUploading = false;
        }
    }

    // Uploader un fichier vers GitHub
    async uploadFile(item) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                message: item.message,
                content: Buffer.from(item.content).toString('base64'),
                branch: this.branch
            });

            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${this.repo}/contents/${item.path}`,
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'User-Agent': 'Logawa-Bot',
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        console.log(`✅ Upload réussi: ${item.path}`);
                        resolve();
                    } else {
                        console.error(`❌ Upload échoué (${res.statusCode}): ${responseData}`);
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Erreur de requête GitHub:', error);
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

    // Uploader tous les fichiers de logs existants
    async uploadAllLogs() {
        if (!this.enabled) return;

        console.log('🔄 Upload de tous les fichiers de logs vers GitHub...');

        try {
            const files = fs.readdirSync(this.logsDir);
            const logFiles = files.filter(file => file.endsWith('.log'));

            for (const file of logFiles) {
                const filePath = path.join(this.logsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                await this.queueFileUpload(filePath, content);
            }

            await this.processUploadQueue();
            console.log('✅ Upload de tous les logs terminé');

        } catch (error) {
            console.error('❌ Erreur lors de l\'upload des logs:', error);
        }
    }

    // Créer un fichier de log et l'uploader
    async createAndUploadLog(fileName, content) {
        if (!this.enabled) return;

        // Sauvegarder localement
        const filePath = path.join(this.logsDir, fileName);
        fs.appendFileSync(filePath, content + '\n');

        // Uploader vers GitHub
        await this.queueFileUpload(filePath, content);
    }

    // Obtenir l'URL d'accès aux logs
    getLogsUrl() {
        if (!this.repo) return null;
        
        const date = moment().format('YYYY/MM/DD');
        return `https://github.com/${this.repo}/tree/main/logs/${date}`;
    }

    // Obtenir l'URL d'un fichier spécifique
    getFileUrl(fileName) {
        if (!this.repo) return null;
        
        const date = moment().format('YYYY/MM/DD');
        return `https://github.com/${this.repo}/blob/main/logs/${date}/${fileName}`;
    }

    // Pause entre les requêtes
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Statut du logger
    getStatus() {
        return {
            enabled: this.enabled,
            repository: this.repo,
            branch: this.branch,
            queueSize: this.uploadQueue.length,
            isUploading: this.isUploading,
            logsUrl: this.getLogsUrl()
        };
    }
}

module.exports = GitHubLogger; 