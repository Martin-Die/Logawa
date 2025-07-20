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
        this.cleanupInterval = null;
        this.lastUploadTime = null;
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
            
            // Démarrer le traitement de la queue et le nettoyage
            this.startQueueProcessing();
            this.startCleanupProcess();
            
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation Firebase:', error.message);
            return false;
        }
    }

    startQueueProcessing() {
        // Traiter la queue et synchroniser les logs locaux toutes les 30 minutes (optimisation coûts)
        this.uploadInterval = setInterval(async () => {
            // Traiter la queue des nouveaux logs
            await this.processUploadQueue();
            
            // Synchroniser les logs existants en local
            await this.syncExistingLogs();
        }, 30 * 60 * 1000);
    }

    startCleanupProcess() {
        // Nettoyer les logs locaux et redémarrer chaque dimanche à 2h du matin
        this.cleanupInterval = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 2 && now.getMinutes() === 0 && now.getDay() === 0) { // Dimanche à 2h
                this.cleanupLocalLogs();
                this.scheduleWeeklyRestart();
            }
        }, 60 * 1000); // Vérifier toutes les minutes
    }

    stopQueueProcessing() {
        if (this.uploadInterval) {
            clearInterval(this.uploadInterval);
            this.uploadInterval = null;
            console.log('⏹️ Traitement de queue Firebase arrêté');
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('⏹️ Processus de nettoyage arrêté');
        }
    }

    async queueLogUpload(logData) {
        if (!this.isInitialized) {
            return; // Silencieux en production
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
        // Log silencieux en production pour éviter le spam
    }

    async processUploadQueue() {
        if (this.isProcessing || this.uploadQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

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

            this.lastUploadTime = new Date();
            // Log silencieux en production
        } catch (error) {
            console.error('❌ Erreur lors du traitement de la queue Firebase:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    // Nettoyer les logs locaux (garder 7 jours)
    async cleanupLocalLogs() {
        try {
            console.log('🧹 Nettoyage hebdomadaire des logs locaux...');
            
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) {
                return;
            }

            const now = new Date();
            const cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 jours
            
            let deletedFiles = 0;
            let deletedSize = 0;

            // Parcourir les dossiers année/mois/jour
            const years = fs.readdirSync(logsDir);
            for (const year of years) {
                const yearPath = path.join(logsDir, year);
                if (!fs.statSync(yearPath).isDirectory()) continue;

                const months = fs.readdirSync(yearPath);
                for (const month of months) {
                    const monthPath = path.join(yearPath, month);
                    if (!fs.statSync(monthPath).isDirectory()) continue;

                    const days = fs.readdirSync(monthPath);
                    for (const day of days) {
                        const dayPath = path.join(monthPath, day);
                        if (!fs.statSync(dayPath).isDirectory()) continue;

                        // Vérifier si le dossier date est plus ancien que 7 jours
                        const folderDate = new Date(`${year}-${month}-${day}`);
                        if (folderDate < cutoffDate) {
                            const stats = fs.statSync(dayPath);
                            deletedSize += stats.size;
                            
                            fs.rmSync(dayPath, { recursive: true, force: true });
                            deletedFiles++;
                            
                            console.log(`🗑️ Supprimé: ${year}/${month}/${day}`);
                        }
                    }

                    // Supprimer les dossiers mois vides
                    if (fs.readdirSync(monthPath).length === 0) {
                        fs.rmdirSync(monthPath);
                    }
                }

                // Supprimer les dossiers année vides
                if (fs.readdirSync(yearPath).length === 0) {
                    fs.rmdirSync(yearPath);
                }
            }

            const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
            console.log(`✅ Nettoyage hebdomadaire terminé: ${deletedFiles} dossiers supprimés, ${deletedSizeMB} MB libérés`);
            
            // Recréer les dossiers de logs pour la date actuelle
            try {
                const { ensureLogDirectories } = require('./logger');
                ensureLogDirectories();
            } catch (error) {
                console.error('❌ Erreur lors de la recréation des dossiers de logs:', error.message);
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage des logs locaux:', error.message);
        }
    }

    // Programmer le redémarrage hebdomadaire
    scheduleWeeklyRestart() {
        try {
            console.log('🔄 Programmation du redémarrage hebdomadaire...');
            
            // Attendre 5 minutes après le nettoyage pour s'assurer que tout est terminé
            setTimeout(() => {
                console.log('🔄 Redémarrage hebdomadaire en cours...');
                console.log('📝 Logs de redémarrage envoyés vers Firebase...');
                
                // Envoyer un log de redémarrage vers Firebase
                this.queueLogUpload({
                    level: 'info',
                    message: 'Redémarrage hebdomadaire programmé - Maintenance système',
                    metadata: {
                        logType: 'status',
                        source: 'system-maintenance',
                        restartType: 'weekly',
                        reason: 'Maintenance hebdomadaire après nettoyage'
                    }
                });
                
                // Forcer l'upload avant le redémarrage
                this.forceUpload().then(() => {
                    console.log('✅ Logs sauvegardés, redémarrage dans 30 secondes...');
                    
                    // Attendre 30 secondes pour finaliser l'upload
                    setTimeout(() => {
                        console.log('🔄 Redémarrage hebdomadaire du système...');
                        
                        // Redémarrer le processus (différent selon l'environnement)
                        if (process.platform === 'win32') {
                            // Windows
                            require('child_process').exec('shutdown /r /t 0');
                        } else {
                            // Linux/Raspberry Pi
                            require('child_process').exec('sudo reboot');
                        }
                    }, 30000); // 30 secondes
                });
                
            }, 5 * 60 * 1000); // 5 minutes après le nettoyage
            
        } catch (error) {
            console.error('❌ Erreur lors de la programmation du redémarrage:', error.message);
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
            // Tester la connexion en listant les collections (sans créer de document)
            await this.db.listCollections();
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
        const now = new Date();
        
        // Calculer le prochain nettoyage (dimanche à 2h)
        const nextCleanup = new Date(now);
        nextCleanup.setHours(2, 0, 0, 0);
        while (nextCleanup.getDay() !== 0) { // 0 = dimanche
            nextCleanup.setDate(nextCleanup.getDate() + 1);
        }
        if (nextCleanup <= now) {
            nextCleanup.setDate(nextCleanup.getDate() + 7);
        }
        
        // Calculer le prochain redémarrage (dimanche à 2h05)
        const nextRestart = new Date(nextCleanup);
        nextRestart.setMinutes(5);
        
        // Calculer le prochain upload Firebase
        let nextUploadTime = 'N/A';
        if (this.uploadInterval && this.lastUploadTime) {
            const nextUpload = new Date(this.lastUploadTime.getTime() + (30 * 60 * 1000));
            if (nextUpload > now) {
                const diffMs = nextUpload - now;
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                nextUploadTime = `${diffMinutes} minutes`;
            } else {
                nextUploadTime = 'Bientôt';
            }
        }
        
        return {
            initialized: this.isInitialized,
            queueLength: this.uploadQueue.length,
            isProcessing: this.isProcessing,
            uploadInterval: this.uploadInterval ? '30 minutes' : 'inactive',
            lastUploadTime: this.lastUploadTime,
            nextUploadIn: nextUploadTime,
            nextCleanup: nextCleanup.toLocaleString('fr-FR'),
            nextRestart: nextRestart.toLocaleString('fr-FR'),
            optimization: 'Hybride: logs locaux + sync Firebase 30min + nettoyage hebdo 7j + redémarrage hebdo'
        };
    }

    async forceUpload() {
        console.log('🚀 Upload forcé vers Firebase...');
        await this.processUploadQueue();
    }

    // Synchroniser les logs du jour actuel en local vers Firebase
    async syncExistingLogs() {
        if (!this.isInitialized) {
            return; // Silencieux en production
        }

        try {
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) {
                return;
            }

            // Obtenir la date actuelle
            const now = new Date();
            const currentYear = now.getFullYear().toString();
            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentDay = now.getDate().toString().padStart(2, '0');

            const logTypes = ['messages', 'moderation', 'status', 'forbiddenWords', 'errors'];
            let totalSynced = 0;

            for (const logType of logTypes) {
                const typeDir = path.join(logsDir, logType);
                if (!fs.existsSync(typeDir)) continue;

                // Vérifier si le dossier de l'année existe
                const yearPath = path.join(typeDir, currentYear);
                if (!fs.existsSync(yearPath) || !fs.statSync(yearPath).isDirectory()) continue;

                // Vérifier si le dossier du mois existe
                const monthPath = path.join(yearPath, currentMonth);
                if (!fs.existsSync(monthPath) || !fs.statSync(monthPath).isDirectory()) continue;

                // Vérifier si le dossier du jour existe
                const dayPath = path.join(monthPath, currentDay);
                if (!fs.existsSync(dayPath) || !fs.statSync(dayPath).isDirectory()) continue;

                // Lire le fichier de log du jour actuel
                const logFile = path.join(dayPath, `${currentDay}.log`);
                if (fs.existsSync(logFile)) {
                    const synced = await this.syncLogFile(logFile, logType, currentYear, currentMonth, currentDay);
                    totalSynced += synced;
                }
            }

            if (totalSynced > 0) {
                console.log(`📤 Sync Firebase: ${totalSynced} logs du jour synchronisés`);
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation des logs du jour:', error.message);
        }
    }

    // Synchroniser un fichier de log spécifique
    async syncLogFile(logFilePath, logType, year, month, day) {
        try {
            const content = fs.readFileSync(logFilePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            let syncedCount = 0;
            
            for (const line of lines) {
                // Parser la ligne de log: [timestamp] [LEVEL] message
                const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
                if (match) {
                    const [, timestamp, level, message] = match;
                    
                    // Créer l'entrée de log
                    const logEntry = {
                        level: level.toLowerCase(),
                        message: message,
                        timestamp: new Date(timestamp),
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        year: year,
                        month: month,
                        day: day,
                        logType: logType,
                        collectionPath: `${logType}/${year}/${month}`,
                        metadata: {
                            logType: logType,
                            timestamp: timestamp,
                            source: 'local-sync'
                        }
                    };

                    // Ajouter à la queue
                    this.uploadQueue.push(logEntry);
                    syncedCount++;
                }
            }

            return syncedCount;
            
        } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation de ${logFilePath}:`, error.message);
            return 0;
        }
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