require('dotenv').config();
const GoogleDriveLogger = require('../utils/drive-logger');
const http = require('http');
const url = require('url');

async function autoAuthServer() {
    console.log('🤖 Authentification automatique Google Drive avec serveur web\n');
    
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
            console.log('🎉 Authentification déjà valide !');
            return;
        }
    } catch (error) {
        console.log('❌ Erreur de connexion:', error.message);
    }
    console.log('');

    // Créer le serveur web pour capturer le code
    let authCode = null;
    let server = null;
    
    const serverPromise = new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            
            if (parsedUrl.pathname === '/') {
                // Page d'accueil avec l'URL d'authentification
                const { google } = require('googleapis');
                const fs = require('fs');
                const credentials = JSON.parse(fs.readFileSync(driveLogger.credentialsPath, 'utf8'));
                const oauth2Client = new google.auth.OAuth2(
                    credentials.installed.client_id,
                    credentials.installed.client_secret,
                    'http://localhost:8080/callback'
                );
                
                const authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: ['https://www.googleapis.com/auth/drive.file']
                });
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Logawa - Authentification Google Drive</title>
                        <style>
                            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                            .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
                            .button { background: #4285f4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
                            .status { padding: 15px; border-radius: 5px; margin: 10px 0; }
                            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                            .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🤖 Logawa - Authentification Google Drive</h1>
                            <div class="info">
                                <p><strong>Étape 1:</strong> Cliquez sur le bouton ci-dessous pour autoriser l'application</p>
                            </div>
                            <a href="${authUrl}" class="button">🔐 Autoriser Google Drive</a>
                            <div class="info">
                                <p><strong>Étape 2:</strong> Après autorisation, vous serez redirigé ici et l'authentification sera automatique</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
            } else if (parsedUrl.pathname === '/callback') {
                // Callback avec le code d'autorisation
                authCode = parsedUrl.query.code;
                
                if (authCode) {
                    console.log('✅ Code d\'autorisation reçu !');
                    console.log('🔄 Échange du code contre un refresh token...');
                    
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Logawa - Authentification en cours</title>
                            <style>
                                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                                .container { background: #f5f5f5; padding: 30px; border-radius: 10px; text-align: center; }
                                .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; }
                                .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>🤖 Authentification en cours...</h1>
                                <div class="spinner"></div>
                                <div class="success">
                                    <p><strong>Code reçu !</strong></p>
                                    <p>Échange en cours avec Google...</p>
                                    <p>Cette page se fermera automatiquement dans quelques secondes.</p>
                                </div>
                            </div>
                            <script>
                                setTimeout(() => {
                                    window.close();
                                }, 3000);
                            </script>
                        </body>
                        </html>
                    `);
                    
                    resolve(authCode);
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Logawa - Erreur d'authentification</title>
                            <style>
                                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                                .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
                                .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>❌ Erreur d'authentification</h1>
                                <div class="error">
                                    <p>Aucun code d'autorisation reçu.</p>
                                    <p>Veuillez réessayer.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `);
                    
                    reject(new Error('Aucun code d\'autorisation reçu'));
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Page non trouvée');
            }
        });
        
        server.listen(8080, () => {
            console.log('🌐 Serveur web démarré sur http://localhost:8080');
            console.log('📝 Instructions:');
            console.log('1. Ouvrez votre navigateur sur http://localhost:8080');
            console.log('2. Cliquez sur "Autoriser Google Drive"');
            console.log('3. Connectez-vous et autorisez l\'application');
            console.log('4. L\'authentification sera automatique !\n');
        });
    });
    
    try {
        // Attendre le code d'autorisation
        const code = await serverPromise;
        
        // Échanger le code contre un refresh token
        const success = await driveLogger.exchangeCodeForToken(code);
        
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
    } finally {
        // Fermer le serveur
        if (server) {
            server.close();
            console.log('🌐 Serveur web fermé');
        }
    }
}

// Exécuter l'authentification automatique
autoAuthServer().catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
}); 