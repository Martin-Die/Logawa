require('dotenv').config();
const GoogleDriveLogger = require('../utils/drive-logger');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function autoAuth() {
    console.log('🤖 Authentification automatique Google Drive\n');
    
    const driveLogger = new GoogleDriveLogger();
    
    // Vérifier l'état actuel
    console.log('📋 État actuel:');
    const status = driveLogger.getStatus();
    Object.entries(status).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
    console.log('');

    // Initialiser le logger
    console.log('🔄 Initialisation...');
    try {
        await driveLogger.initialize();
        console.log('✅ Initialisation réussie');
    } catch (error) {
        console.log('❌ Erreur d\'initialisation:', error.message);
    }
    console.log('');

    // Tester la connexion
    console.log('🔗 Test de connexion...');
    try {
        const connectionOk = await driveLogger.testConnection();
        if (connectionOk) {
            console.log('✅ Connexion Google Drive OK !');
            console.log('🎉 Authentification réussie !');
            rl.close();
            return;
        }
    } catch (error) {
        console.log('❌ Erreur de connexion:', error.message);
    }
    console.log('');

    // Si on arrive ici, il faut une nouvelle authentification
    console.log('🔐 Nouvelle authentification requise\n');
    
    // Afficher l'URL d'authentification
    const { google } = require('googleapis');
    const fs = require('fs');
    const credentials = JSON.parse(fs.readFileSync(driveLogger.credentialsPath, 'utf8'));
    const oauth2Client = new google.auth.OAuth2(
        credentials.installed.client_id,
        credentials.installed.client_secret,
        credentials.installed.redirect_uris[0]
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file']
    });
    
    console.log('🔗 URL d\'authentification:');
    console.log(authUrl);
    console.log('');
    console.log('📝 Instructions:');
    console.log('1. Visitez l\'URL ci-dessus');
    console.log('2. Connectez-vous avec votre compte Google');
    console.log('3. Autorisez l\'application');
    console.log('4. Copiez le code d\'autorisation depuis l\'URL de redirection');
    console.log('5. Collez-le ci-dessous\n');

    // Demander le code d'autorisation
    rl.question('🔑 Code d\'autorisation: ', async (authorizationCode) => {
        console.log('🔄 Échange du code d\'autorisation...');
        
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
        
        rl.close();
    });
}

// Exécuter l'authentification automatique
autoAuth().catch(error => {
    console.error('💥 Erreur fatale:', error);
    rl.close();
    process.exit(1);
}); 