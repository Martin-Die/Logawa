const fs = require('fs');
const path = require('path');
const moment = require('moment');

class GoogleDriveLogger {
    constructor() {
        this.enabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        this.credentials = process.env.GOOGLE_DRIVE_CREDENTIALS;
        this.uploadInterval = parseInt(process.env.GOOGLE_DRIVE_UPLOAD_INTERVAL) || 300000; // 5 minutes
        this.logsDir = './logs';
        
        this.uploadQueue = [];
        this.isUploading = false;
        this.drive = null;
    }

    // Initialiser le logger Google Drive
    async initialize() {
        if (!this.enabled) {
            console.log('⚠️ Google Drive logging désactivé');
            return;
        }

        if (!this.folderId || !this.credentials) {
            console.log('⚠️ Google Drive folder ID ou credentials non configurés');
            return;
        }

        try {
            // Initialiser l'API Google Drive
            await this.initializeDriveAPI();
            console.log(`🔄 Google Drive logging initialisé pour le dossier: ${this.folderId}`);
            
            // Démarrer l'upload périodique
            setInterval(() => {
                this.processUploadQueue();
            }, this.uploadInterval);

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation Google Drive:', error);
        }
    }

    // Initialiser l'API Google Drive
    async initializeDriveAPI() {
        try {
            const { google } = require('googleapis');
            
            // Parser les credentials
            const credentials = JSON.parse(this.credentials);
            
            // Créer l'authentification
            const auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file']
            });

            // Créer le client Drive
            this.drive = google.drive({ version: 'v3', auth });
            
            console.log('✅ API Google Drive initialisée');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de l\'API Google Drive:', error);
            throw error;
        }
    }

    // Ajouter un fichier à la queue d'upload
    async queueFileUpload(filePath, content) {
        if (!this.enabled || !this.drive) return;

        const fileName = path.basename(filePath);
        const date = moment().format('YYYY-MM-DD');
        const driveFileName = `${date}_${fileName}`;

        this.uploadQueue.push({
            fileName: driveFileName,
            content: content,
            timestamp: Date.now()
        });

        console.log(`📤 Ajouté à la queue Google Drive: ${driveFileName}`);
    }

    // Traiter la queue d'upload
    async processUploadQueue() {
        if (this.isUploading || this.uploadQueue.length === 0 || !this.drive) return;

        this.isUploading = true;
        console.log(`🔄 Traitement de ${this.uploadQueue.length} fichiers vers Google Drive...`);

        try {
            for (const item of this.uploadQueue) {
                await this.uploadFile(item);
                await this.delay(2000); // Pause entre les uploads
            }

            this.uploadQueue = [];
            console.log('✅ Queue Google Drive traitée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors du traitement de la queue Google Drive:', error);
        } finally {
            this.isUploading = false;
        }
    }

    // Uploader un fichier vers Google Drive
    async uploadFile(item) {
        try {
            // Vérifier si le fichier existe déjà
            const existingFile = await this.findFile(item.fileName);
            
            if (existingFile) {
                // Mettre à jour le fichier existant
                await this.updateFile(existingFile.id, item.content, item.fileName);
                console.log(`✅ Fichier mis à jour: ${item.fileName}`);
            } else {
                // Créer un nouveau fichier
                await this.createFile(item.fileName, item.content);
                console.log(`✅ Nouveau fichier créé: ${item.fileName}`);
            }

        } catch (error) {
            console.error(`❌ Erreur lors de l'upload de ${item.fileName}:`, error);
            throw error;
        }
    }

    // Trouver un fichier existant
    async findFile(fileName) {
        try {
            const response = await this.drive.files.list({
                q: `name='${fileName}' and '${this.folderId}' in parents and trashed=false`,
                fields: 'files(id, name)',
                pageSize: 1
            });

            return response.data.files[0] || null;
        } catch (error) {
            console.error('❌ Erreur lors de la recherche de fichier:', error);
            return null;
        }
    }

    // Créer un nouveau fichier
    async createFile(fileName, content) {
        const fileMetadata = {
            name: fileName,
            parents: [this.folderId]
        };

        const media = {
            mimeType: 'text/plain',
            body: content
        };

        await this.drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });
    }

    // Mettre à jour un fichier existant
    async updateFile(fileId, content, fileName) {
        const media = {
            mimeType: 'text/plain',
            body: content
        };

        await this.drive.files.update({
            fileId: fileId,
            media: media,
            fields: 'id'
        });
    }

    // Uploader tous les fichiers de logs existants
    async uploadAllLogs() {
        if (!this.enabled || !this.drive) return;

        console.log('🔄 Upload de tous les fichiers de logs vers Google Drive...');

        try {
            const files = fs.readdirSync(this.logsDir);
            const logFiles = files.filter(file => file.endsWith('.log'));

            for (const file of logFiles) {
                const filePath = path.join(this.logsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                await this.queueFileUpload(filePath, content);
            }

            await this.processUploadQueue();
            console.log('✅ Upload de tous les logs vers Google Drive terminé');

        } catch (error) {
            console.error('❌ Erreur lors de l\'upload des logs vers Google Drive:', error);
        }
    }

    // Créer un fichier de log et l'uploader
    async createAndUploadLog(fileName, content) {
        if (!this.enabled) return;

        // Sauvegarder localement
        const filePath = path.join(this.logsDir, fileName);
        fs.appendFileSync(filePath, content + '\n');

        // Uploader vers Google Drive
        await this.queueFileUpload(filePath, content);
    }

    // Lister les fichiers dans Google Drive
    async listFiles() {
        if (!this.drive) return [];

        try {
            const response = await this.drive.files.list({
                q: `'${this.folderId}' in parents and trashed=false`,
                fields: 'files(id, name, createdTime, size)',
                orderBy: 'createdTime desc'
            });

            return response.data.files;
        } catch (error) {
            console.error('❌ Erreur lors de la liste des fichiers:', error);
            return [];
        }
    }

    // Obtenir l'URL d'accès aux logs
    getLogsUrl() {
        if (!this.folderId) return null;
        return `https://drive.google.com/drive/folders/${this.folderId}`;
    }

    // Pause entre les requêtes
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Statut du logger
    getStatus() {
        return {
            enabled: this.enabled,
            folderId: this.folderId,
            queueSize: this.uploadQueue.length,
            isUploading: this.isUploading,
            driveInitialized: !!this.drive,
            logsUrl: this.getLogsUrl()
        };
    }
}

module.exports = GoogleDriveLogger; 