require('dotenv').config();
const GoogleDriveLogger = require('../utils/drive-logger');
const fs = require('fs');

async function testGoogleDrive() {
    console.log('🧪 Test du logger Google Drive\n');

    const driveLogger = new GoogleDriveLogger();
    
    // Afficher la configuration
    console.log('📋 Configuration:');
    const status = driveLogger.getStatus();
    Object.entries(status).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
    console.log('');

    // Vérifier le fichier de credentials
    console.log('🔍 Vérification du fichier de credentials...');
    if (fs.existsSync(driveLogger.credentialsPath)) {
        try {
            const credentials = JSON.parse(fs.readFileSync(driveLogger.credentialsPath, 'utf8'));
            console.log('✅ Fichier JSON valide');
            console.log('📄 Type de credentials:', credentials.type || 'OAuth2');
            if (credentials.installed) {
                console.log('🔑 Client ID:', credentials.installed.client_id.substring(0, 20) + '...');
                console.log('🔒 Client Secret:', credentials.installed.client_secret ? 'Présent' : 'Manquant');
                console.log('📄 Type: OAuth2');
            } else {
                console.log('❌ Format de credentials non reconnu - Section "installed" manquante');
            }
        } catch (error) {
            console.log('❌ Fichier JSON invalide:', error.message);
        }
    } else {
        console.log('❌ Fichier de credentials non trouvé');
    }
    console.log('');

    // Initialiser le logger
    console.log('🔄 Initialisation...');
    try {
        await driveLogger.initialize();
        console.log('✅ Initialisation réussie');
    } catch (error) {
        console.log('❌ Erreur d\'initialisation:', error.message);
        console.log('🔍 Détails:', error);
    }
    console.log('');

    // Tester la connexion
    console.log('🔗 Test de connexion...');
    try {
        const connectionOk = await driveLogger.testConnection();
        console.log('✅ Test de connexion terminé');
    } catch (error) {
        console.log('❌ Erreur de connexion:', error.message);
        console.log('🔍 Détails:', error);
    }
    console.log('');

    // Tester l'upload seulement si la connexion fonctionne
    if (driveLogger.drive) {
        console.log('📤 Test d\'upload...');
        try {
            const testContent = `Test Google Drive - ${new Date().toISOString()}\nCeci est un test de connexion.\nTimestamp: ${Date.now()}`;
            await driveLogger.queueFileUpload('test-drive.log', testContent);
            
            // Forcer l'upload immédiat
            await driveLogger.forceUpload();
            console.log('✅ Test d\'upload terminé');
        } catch (error) {
            console.log('❌ Erreur d\'upload:', error.message);
            console.log('🔍 Détails:', error);
        }
        console.log('');

        // Lister les fichiers
        console.log('📁 Liste des fichiers dans Google Drive:');
        try {
            const files = await driveLogger.listFiles();
            if (files.length === 0) {
                console.log('📭 Aucun fichier trouvé dans le dossier');
            } else {
                files.slice(0, 5).forEach(file => {
                    console.log(`  - ${file.name} (${file.id}) - ${file.size || '0'} bytes`);
                });
                if (files.length > 5) {
                    console.log(`  ... et ${files.length - 5} autres fichiers`);
                }
            }
        } catch (error) {
            console.log('❌ Erreur lors de la liste des fichiers:', error.message);
        }
        console.log('');

        // Afficher l'URL d'accès
        const logsUrl = driveLogger.getLogsUrl();
        if (logsUrl) {
            console.log(`🔗 Accès aux logs: ${logsUrl}`);
        }
    } else {
        console.log('⚠️ Impossible de tester l\'upload - Google Drive non initialisé');
    }

    console.log('\n✅ Test terminé');
}

// Exécuter le test
testGoogleDrive().catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
}); 