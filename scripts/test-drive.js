require('dotenv').config();
const GoogleDriveLogger = require('../utils/drive-logger');

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

    // Initialiser le logger
    console.log('🔄 Initialisation...');
    await driveLogger.initialize();
    console.log('');

    // Tester la connexion
    console.log('🔗 Test de connexion...');
    const connectionOk = await driveLogger.testConnection();
    console.log('');

    if (connectionOk) {
        // Tester l'upload d'un fichier de test
        console.log('📤 Test d\'upload...');
        const testContent = `Test Google Drive - ${new Date().toISOString()}\nCeci est un test de connexion.`;
        await driveLogger.queueFileUpload('test-drive.log', testContent);
        
        // Forcer l'upload immédiat
        await driveLogger.forceUpload();
        console.log('');

        // Lister les fichiers
        console.log('📁 Liste des fichiers dans Google Drive:');
        const files = await driveLogger.listFiles();
        files.slice(0, 5).forEach(file => {
            console.log(`  - ${file.name} (${file.id})`);
        });
        if (files.length > 5) {
            console.log(`  ... et ${files.length - 5} autres fichiers`);
        }
        console.log('');

        // Afficher l'URL d'accès
        const logsUrl = driveLogger.getLogsUrl();
        if (logsUrl) {
            console.log(`🔗 Accès aux logs: ${logsUrl}`);
        }
    }

    console.log('\n✅ Test terminé');
}

// Exécuter le test
testGoogleDrive().catch(console.error); 