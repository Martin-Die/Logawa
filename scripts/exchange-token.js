require('dotenv').config();
const GoogleDriveLogger = require('../utils/drive-logger');

async function exchangeToken() {
    const authorizationCode = process.argv[2];
    
    if (!authorizationCode) {
        console.log('❌ Usage: node scripts/exchange-token.js <authorization_code>');
        console.log('💡 Exemple: node scripts/exchange-token.js 4/0AfJohXn...');
        process.exit(1);
    }

    console.log('🔄 Échange du code d\'autorisation...');
    
    const driveLogger = new GoogleDriveLogger();
    
    try {
        const success = await driveLogger.exchangeCodeForToken(authorizationCode);
        
        if (success) {
            console.log('✅ Authentification réussie !');
            console.log('🔄 Test de connexion...');
            
            const connectionOk = await driveLogger.testConnection();
            if (connectionOk) {
                console.log('✅ Connexion Google Drive OK !');
                console.log('🎉 Votre bot peut maintenant uploader des logs vers Google Drive');
            } else {
                console.log('❌ Problème de connexion après authentification');
            }
        } else {
            console.log('❌ Échec de l\'échange du code');
        }
    } catch (error) {
        console.error('💥 Erreur:', error.message);
    }
}

// Exécuter l'échange
exchangeToken().catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
}); 