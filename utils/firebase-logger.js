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

    // Fonction pour remplacer undefined et null par "no content"
    cleanForFirestore(obj) {
        if (obj === null || obj === undefined) {
            return "no content";
        }
        
        if (typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanForFirestore(item));
        }
        
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            cleaned[key] = this.cleanForFirestore(value);
        }
        
        return cleaned;
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

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const logType = logData.metadata?.logType || 'general';

        const logEntry = {
            ...logData,
            timestamp: now,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            // Structure organisée
            year: year,
            month: month,
            day: day,
            logType: logType,
            // Chemin organisé pour Firebase (jour = nom du document)
            collectionPath: `${logType}/${year}/${month}`
        };

        this.uploadQueue.push(logEntry);
        console.log(`📝 Log ajouté à la queue Firebase (${this.uploadQueue.length} en attente) - ${logType}/${year}/${month}/${day}`);
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

            // Grouper les logs par jour et par type
            const logsByDay = {};
            
            for (const logEntry of this.uploadQueue) {
                const key = `${logEntry.logType}_${logEntry.year}_${logEntry.month}_${logEntry.day}`;
                if (!logsByDay[key]) {
                    logsByDay[key] = {
                        logType: logEntry.logType,
                        year: logEntry.year,
                        month: logEntry.month,
                        day: logEntry.day,
                        collectionPath: logEntry.collectionPath,
                        logs: []
                    };
                }
                logsByDay[key].logs.push({
                    id: logEntry.id,
                    level: logEntry.level,
                    message: logEntry.message,
                    timestamp: logEntry.timestamp,
                    metadata: this.cleanForFirestore(logEntry.metadata || {})
                });
            }

            // Créer ou mettre à jour les documents par jour
            for (const dayKey in logsByDay) {
                const dayData = logsByDay[dayKey];
                try {
                    const docRef = this.db.collection(dayData.collectionPath).doc(dayData.day);
                    
                    // Récupérer le document existant s'il existe
                    const existingDoc = await docRef.get();
                    let existingLogs = [];
                    
                    if (existingDoc.exists) {
                        existingLogs = existingDoc.data().logs || [];
                    }
                    
                    // Ajouter les nouveaux logs
                    const allLogs = [...existingLogs, ...dayData.logs];
                    
                    batch.set(docRef, this.cleanForFirestore({
                        logType: dayData.logType,
                        year: dayData.year,
                        month: dayData.month,
                        day: dayData.day,
                        logs: allLogs,
                        lastUpdated: new Date(),
                        totalLogs: allLogs.length,
                        source: 'logawa-bot'
                    }));
                    
                    processedLogs.push(...dayData.logs);
                } catch (error) {
                    console.error('❌ Erreur lors de l\'ajout du document jour:', error.message);
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
            // Récupérer les logs récents de toutes les collections organisées
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            
            const logTypes = ['messages', 'moderation', 'status', 'forbiddenWords', 'errors'];
            let allLogs = [];

            for (const logType of logTypes) {
                try {
                    const collectionPath = `${logType}/${year}/${month}`;
                    const snapshot = await this.db.collection(collectionPath)
                        .where('day', '==', day)
                        .orderBy('timestamp', 'desc')
                        .limit(Math.ceil(limit / logTypes.length))
                        .get();

                    const docs = snapshot.docs;
                    for (const doc of docs) {
                        const data = doc.data();
                        if (data.logs && Array.isArray(data.logs)) {
                            const logs = data.logs.map(log => ({
                                ...log,
                                collectionPath: collectionPath,
                                documentId: doc.id
                            }));
                            allLogs = allLogs.concat(logs);
                        }
                    }
                } catch (error) {
                    // Collection peut ne pas exister encore
                    console.log(`📂 Collection ${logType}/${year}/${month} non trouvée`);
                }
            }

            // Trier par timestamp et limiter
            allLogs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
            return allLogs.slice(0, limit);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des logs:', error.message);
            return [];
        }
    }

    async listLogsByDate(logType, year, month, day, limit = 50) {
        if (!this.isInitialized) {
            return [];
        }

        try {
            const collectionPath = `${logType}/${year}/${month}`;
            const snapshot = await this.db.collection(collectionPath)
                .where('day', '==', day)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const docs = snapshot.docs;
            let allLogs = [];
            
            for (const doc of docs) {
                const data = doc.data();
                if (data.logs && Array.isArray(data.logs)) {
                    const logs = data.logs.map(log => ({
                        ...log,
                        collectionPath: collectionPath,
                        documentId: doc.id
                    }));
                    allLogs = allLogs.concat(logs);
                }
            }
            
            return allLogs;
        } catch (error) {
            console.error(`❌ Erreur lors de la récupération des logs ${logType}/${year}/${month}:`, error.message);
            return [];
        }
    }

    async listLogsByMonth(logType, year, month, limit = 100) {
        if (!this.isInitialized) {
            return [];
        }

        try {
            const collectionPath = `${logType}/${year}/${month}`;
            const snapshot = await this.db.collection(collectionPath)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const docs = snapshot.docs;
            let allLogs = [];
            
            for (const doc of docs) {
                const data = doc.data();
                if (data.logs && Array.isArray(data.logs)) {
                    const logs = data.logs.map(log => ({
                        ...log,
                        collectionPath: doc.ref.parent.path,
                        documentId: doc.id
                    }));
                    allLogs = allLogs.concat(logs);
                }
            }
            
            return allLogs;
        } catch (error) {
            console.error(`❌ Erreur lors de la récupération des logs du mois ${logType}/${year}/${month}:`, error.message);
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