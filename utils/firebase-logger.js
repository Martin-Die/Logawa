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
        
        // Protection contre la surcharge mémoire
        this.maxQueueSize = 10000; // Limite de 10k logs en queue
        this.maxFileSize = 50 * 1024 * 1024; // 50MB max par fichier
        this.maxSyncTimes = 1000; // Limite de 1000 timestamps de sync
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
            
            // Synchronisation immédiate au démarrage (après 5 secondes)
            setTimeout(async () => {
                console.log('🚀 Synchronisation initiale au démarrage...');
                await this.syncExistingLogs();
            }, 5000);
            
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation Firebase:', error.message);
            return false;
        }
    }

    startQueueProcessing() {
        // Traiter la queue et synchroniser les logs locaux toutes les 30 minutes (optimisation coûts)
        this.uploadInterval = setInterval(async () => {
            // Protection contre les conflits temporels
            if (this.isProcessing) {
                console.log('⏳ Synchronisation en cours, intervalle ignoré');
                return;
            }
            
            try {
                // Traiter la queue des nouveaux logs
                await this.processUploadQueue();
                
                // Synchroniser les logs existants en local
                await this.syncExistingLogs();
            } catch (error) {
                console.error('❌ Erreur lors de la synchronisation automatique:', error.message);
            }
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

        // Protection contre la surcharge de queue
        if (this.uploadQueue.length >= this.maxQueueSize) {
            console.warn(`⚠️ Queue Firebase pleine (${this.uploadQueue.length}/${this.maxQueueSize}), log ignoré`);
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
            collectionPath: `${logType}/${year}/${month}`,
            // S'assurer que les métadonnées ont la structure complète
            metadata: {
                logType: logType,
                timestamp: now.toISOString(),
                source: 'logawa-bot',
                // Ajouter les champs manquants s'ils n'existent pas
                authorId: logData.metadata?.authorId || null,
                channelId: logData.metadata?.channelId || null,
                content: logData.metadata?.content || null,
                messageId: logData.metadata?.messageId || null,
                // Conserver les autres métadonnées existantes
                ...logData.metadata
            }
        };

        this.uploadQueue.push(logEntry);
        // Log silencieux en production pour éviter le spam
    }

    async processUploadQueue() {
        if (this.isProcessing) {
            return; // Éviter les conflits de traitement
        }

        if (this.uploadQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            const batch = this.db.batch();
            const processedLogs = [];
            const batchSize = 500; // Optimisation: traiter par lots de 500 logs

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
                    
                    // Filtrer les doublons basés sur l'ID
                    const existingIds = new Set(existingLogs.map(log => log.id));
                    const newLogs = dayData.logs.filter(log => !existingIds.has(log.id));
                    
                    // Ajouter seulement les nouveaux logs
                    const allLogs = [...existingLogs, ...newLogs];
                    
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

                    const files = fs.readdirSync(monthPath);
                    for (const file of files) {
                        // Vérifier si c'est un fichier .log
                        if (!file.endsWith('.log')) continue;
                        
                        const day = file.replace('.log', '');
                        const filePath = path.join(monthPath, file);
                        
                        // Vérifier si le fichier date est plus ancien que 7 jours
                        const fileDate = new Date(`${year}-${month}-${day}`);
                        if (fileDate < cutoffDate) {
                            const stats = fs.statSync(filePath);
                            deletedSize += stats.size;
                            
                            fs.unlinkSync(filePath);
                            deletedFiles++;
                            
                            console.log(`🗑️ Supprimé: ${year}/${month}/${day}.log`);
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
            console.log('⚠️ Firebase non initialisé pour la synchronisation');
            return;
        }

        try {
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) {
                console.log('📂 Dossier logs non trouvé, synchronisation ignorée');
                return;
            }

            console.log('📂 Dossier logs trouvé, début de la synchronisation...');

            // Obtenir la date actuelle
            const now = new Date();
            const currentYear = now.getFullYear().toString();
            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentDay = now.getDate().toString().padStart(2, '0');

            const logTypes = ['messages', 'moderation', 'status', 'forbiddenWords', 'errors'];
            let totalSynced = 0;
            let filesChecked = 0;

            console.log(`📅 Recherche des logs pour: ${currentYear}/${currentMonth}/${currentDay}`);
            
            for (const logType of logTypes) {
                const typeDir = path.join(logsDir, logType);
                if (!fs.existsSync(typeDir)) {
                    console.log(`📂 Dossier ${logType} non trouvé`);
                    continue;
                }

                // Vérifier si le dossier de l'année existe
                const yearPath = path.join(typeDir, currentYear);
                if (!fs.existsSync(yearPath) || !fs.statSync(yearPath).isDirectory()) {
                    console.log(`📂 Dossier année ${currentYear} non trouvé pour ${logType}`);
                    continue;
                }

                // Vérifier si le dossier du mois existe
                const monthPath = path.join(yearPath, currentMonth);
                if (!fs.existsSync(monthPath) || !fs.statSync(monthPath).isDirectory()) {
                    console.log(`📂 Dossier mois ${currentMonth} non trouvé pour ${logType}`);
                    continue;
                }

                // Le fichier de log est directement dans le dossier du mois
                const logFile = path.join(monthPath, `${currentDay}.log`);
                if (fs.existsSync(logFile)) {
                    console.log(`📄 Fichier trouvé: ${logType}/${currentYear}/${currentMonth}/${currentDay}.log`);
                    filesChecked++;
                    const synced = await this.syncLogFile(logFile, logType, currentYear, currentMonth, currentDay);
                    totalSynced += synced;
                } else {
                    console.log(`📄 Fichier non trouvé: ${logType}/${currentYear}/${currentMonth}/${currentDay}.log`);
                }
            }

            if (totalSynced > 0) {
                console.log(`📤 Sync Firebase: ${totalSynced} logs synchronisés depuis ${filesChecked} fichiers`);
            } else if (filesChecked > 0) {
                console.log(`📤 Sync Firebase: Aucun nouveau log à synchroniser (${filesChecked} fichiers vérifiés)`);
            } else {
                console.log('📤 Sync Firebase: Aucun fichier de log trouvé pour aujourd\'hui');
            }
            
            console.log('✅ Synchronisation terminée');
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation des logs du jour:', error.message);
            console.error('❌ Stack trace:', error.stack);
        }
    }

    // Synchroniser un fichier de log spécifique
    async syncLogFile(logFilePath, logType, year, month, day) {
        try {
            // Vérifier si ce fichier a déjà été synchronisé aujourd'hui (AVANT de lire le fichier)
            const syncKey = `synced_${logType}_${year}_${month}_${day}`;
            const lastSyncTime = this.lastSyncTimes?.[syncKey];
            
            // Protection contre les fichiers trop volumineux
            const fileStats = fs.statSync(logFilePath);
            
            // Si le fichier n'a pas été modifié depuis la dernière sync, on skip (OPTIMISATION)
            if (lastSyncTime && fileStats.mtime <= lastSyncTime) {
                return 0;
            }
            
            if (fileStats.size > this.maxFileSize) {
                console.warn(`⚠️ Fichier trop volumineux: ${logFilePath} (${(fileStats.size / 1024 / 1024).toFixed(2)}MB), synchronisation ignorée`);
                return 0;
            }

            // Une seule lecture du fichier (OPTIMISATION)
            const content = fs.readFileSync(logFilePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            let syncedCount = 0;
            
            // Protection contre les fichiers avec trop de lignes
            const maxLines = 100000; // 100k lignes max
            if (lines.length > maxLines) {
                console.warn(`⚠️ Fichier avec trop de lignes: ${logFilePath} (${lines.length} lignes), synchronisation limitée`);
                lines.splice(maxLines); // Garder seulement les 100k premières lignes
            }
            
            for (const line of lines) {
                // Protection contre la surcharge de queue
                if (this.uploadQueue.length >= this.maxQueueSize) {
                    console.warn(`⚠️ Queue pleine lors de la synchronisation, arrêt`);
                    break;
                }

                // Parser la ligne de log: [timestamp] [LEVEL] message
                const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
                if (match) {
                    const [, timestamp, level, message] = match;
                    
                    // Créer un ID unique basé sur le contenu pour éviter les doublons
                    const contentHash = require('crypto').createHash('md5')
                        .update(`${timestamp}_${level}_${message}_${logType}`)
                        .digest('hex');
                    
                    // Créer l'entrée de log avec la même structure que les logs en temps réel
                    const logEntry = {
                        level: level.toLowerCase(),
                        message: message,
                        timestamp: new Date(timestamp),
                        id: contentHash, // ID unique basé sur le contenu
                        year: year,
                        month: month,
                        day: day,
                        logType: logType,
                        collectionPath: `${logType}/${year}/${month}`,
                        metadata: {
                            logType: logType,
                            timestamp: timestamp,
                            source: 'local-sync',
                            // Ajouter les champs manquants pour correspondre aux logs en temps réel
                            authorId: null,
                            channelId: null,
                            content: null,
                            messageId: null
                        }
                    };

                    // Vérifier si ce log existe déjà dans la queue
                    const existsInQueue = this.uploadQueue.some(existing => 
                        existing.id === contentHash
                    );
                    
                    if (!existsInQueue) {
                        this.uploadQueue.push(logEntry);
                        syncedCount++;
                    }
                }
            }

            // Marquer ce fichier comme synchronisé et nettoyer les anciens timestamps
            if (!this.lastSyncTimes) this.lastSyncTimes = {};
            this.lastSyncTimes[syncKey] = new Date();
            
            // Nettoyer les anciens timestamps pour éviter la surcharge mémoire
            this.cleanupSyncTimes();

            return syncedCount;
            
        } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation de ${logFilePath}:`, error.message);
            return 0;
        }
    }

    // Nettoyer les anciens timestamps de synchronisation
    cleanupSyncTimes() {
        if (!this.lastSyncTimes) return;
        
        const keys = Object.keys(this.lastSyncTimes);
        if (keys.length > this.maxSyncTimes) {
            // Garder seulement les 1000 plus récents
            const sortedKeys = keys.sort((a, b) => 
                this.lastSyncTimes[b] - this.lastSyncTimes[a]
            );
            
            const keysToDelete = sortedKeys.slice(this.maxSyncTimes);
            keysToDelete.forEach(key => delete this.lastSyncTimes[key]);
            
            console.log(`🧹 Nettoyage des timestamps de sync: ${keysToDelete.length} anciens supprimés`);
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