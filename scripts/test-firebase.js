const FirebaseLogger = require('../utils/firebase-logger');

async function testFirebase() {
    console.log('🔥 Test Firebase Logger');
    console.log('========================');

    const firebaseLogger = new FirebaseLogger();

    try {
        // Test d'initialisation
        console.log('\n1. Test d\'initialisation...');
        const initialized = await firebaseLogger.initialize();
        
        if (!initialized) {
            console.log('❌ Firebase non initialisé - vérifiez firebase-credentials.json');
            return;
        }

        // Test de connexion
        console.log('\n2. Test de connexion...');
        const connectionTest = await firebaseLogger.testConnection();
        console.log(connectionTest.success ? '✅ Connexion OK' : `❌ Erreur: ${connectionTest.error}`);

        // Test d'ajout de logs
        console.log('\n3. Test d\'ajout de logs...');
        await firebaseLogger.queueLogUpload({
            level: 'info',
            message: 'Test de log Firebase',
            metadata: { test: true, timestamp: new Date() }
        });

        await firebaseLogger.queueLogUpload({
            level: 'error',
            message: 'Test d\'erreur Firebase',
            metadata: { test: true, error: 'test error' }
        });

        // Test d'upload forcé
        console.log('\n4. Test d\'upload forcé...');
        await firebaseLogger.forceUpload();

        // Test de récupération des logs
        console.log('\n5. Test de récupération des logs...');
        const recentLogs = await firebaseLogger.listRecentLogs(5);
        console.log(`📋 ${recentLogs.length} logs récents trouvés:`);
        
        recentLogs.forEach((log, index) => {
            console.log(`  ${index + 1}. [${log.level}] ${log.message} - ${log.timestamp?.toDate?.() || log.timestamp}`);
        });

        // Affichage du statut
        console.log('\n6. Statut du logger:');
        const status = firebaseLogger.getStatus();
        console.log(`   - Initialisé: ${status.initialized}`);
        console.log(`   - Queue: ${status.queueLength} logs`);
        console.log(`   - Traitement: ${status.isProcessing ? 'en cours' : 'inactif'}`);
        console.log(`   - Interval: ${status.uploadInterval}`);

        console.log('\n✅ Tests Firebase terminés avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors des tests Firebase:', error.message);
    } finally {
        await firebaseLogger.cleanup();
    }
}

// Exécuter les tests
testFirebase().catch(console.error); 