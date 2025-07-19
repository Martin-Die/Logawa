const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirebaseLogger {
    constructor() {
        this.isInitialized = false;
        this.db = null;
        this.uploadQueue = [];
        this.isProcessing = false;
        this.uploadInterval = null;
    }

    async initialize() {
        try {
            console.log('🔥 Initialisation Firebase...');
            
            // Vérifier si le fichier de credentials existe
            const credentialsPath = path.join(process.cwd(), 'firebase-credentials.json');
            if (!fs.existsSync(credentialsPath)) {
                console.log('⚠️ Fichier firebase-credentials.json non trouvé');
                return false;
            }

            // Lire les credentials
            const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            
            // Initialiser Firebase Admin
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
            });

            this.db = admin.firestore();
            this.isInitialized = true;
            
            console.log('✅ Firebase initialisé avec succès');
            
            // Démarrer le traitement de la queue
            this.startQueueProcessing();
            
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation Firebase:', error.message);
            return false;
        }
    }

    startQueueProcessing() {
        // Traiter la queue toutes les 5 minutes
        this.uploadInterval = setInterval(() => {
            this.processUploadQueue();
        }, 5 * 60 * 1000);
        
        console.log('🔄 Traitement de queue Firebase démarré (toutes les 5 minutes)');
    }

    stopQueueProcessing() {
        if (this.uploadInterval) {
            clearInterval(this.uploadInterval);
            this.uploadInterval = null;
            console.log('⏹️ Traitement de queue Firebase arrêté');
        }
    }

    async queueLogUpload(logData) {
        if (!this.isInitialized) {
            console.log('⚠️ Firebase non initialisé, log ignoré');
            return;
        }

        const logEntry = {
            ...logData,
            timestamp: new Date(),
            id: Date.now() + Math.random().toString(36).substr(2, 9)
        };

        this.uploadQueue.push(logEntry);
        console.log(`📝 Log ajouté à la queue Firebase (${this.uploadQueue.length} en attente)`);
    }

    async processUploadQueue() {
        if (this.isProcessing || this.uploadQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`🔄 Traitement de ${this.uploadQueue.length} logs Firebase...`);

        try {
            const batch = this.db.batch();
            const processedLogs = [];

            for (const logEntry of this.uploadQueue) {
                try {
                    const docRef = this.db.collection('logs').doc(logEntry.id);
                    batch.set(docRef, {
                        level: logEntry.level,
                        message: logEntry.message,
                        timestamp: logEntry.timestamp,
                        metadata: logEntry.metadata || {},
                        source: 'logawa-bot'
                    });
                    
                    processedLogs.push(logEntry);
                } catch (error) {
                    console.error('❌ Erreur lors de l\'ajout du log à la batch:', error.message);
                }
            }

            // Exécuter la batch
            await batch.commit();
            
            // Retirer les logs traités de la queue
            this.uploadQueue = this.uploadQueue.filter(log => 
                !processedLogs.find(processed => processed.id === log.id)
            );

            console.log(`✅ ${processedLogs.length} logs uploadés vers Firebase`);
        } catch (error) {
            console.error('❌ Erreur lors du traitement de la queue Firebase:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    async uploadAllLogs() {
        if (!this.isInitialized) {
            console.log('⚠️ Firebase non initialisé');
            return;
        }

        console.log('📤 Upload de tous les logs vers Firebase...');
        await this.processUploadQueue();
    }

    async testConnection() {
        if (!this.isInitialized) {
            return { success: false, error: 'Firebase non initialisé' };
        }

        try {
            // Tester la connexion en lisant un document
            const testDoc = await this.db.collection('test').doc('connection').get();
            return { success: true, message: 'Connexion Firebase OK' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async listRecentLogs(limit = 10) {
        if (!this.isInitialized) {
            return [];
        }

        try {
            const snapshot = await this.db.collection('logs')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des logs:', error.message);
            return [];
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            queueLength: this.uploadQueue.length,
            isProcessing: this.isProcessing,
            uploadInterval: this.uploadInterval ? 'active' : 'inactive'
        };
    }

    async forceUpload() {
        console.log('🚀 Upload forcé vers Firebase...');
        await this.processUploadQueue();
    }

    async cleanup() {
        this.stopQueueProcessing();
        if (this.isInitialized) {
            await admin.app().delete();
            this.isInitialized = false;
            console.log('🧹 Firebase nettoyé');
        }
    }
}

module.exports = FirebaseLogger; 