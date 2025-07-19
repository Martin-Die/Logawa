const { logger, messageLogger, moderationLogger, statusLogger, forbiddenWordsLogger, errorLogger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

async function testLogOrganization() {
    console.log('📁 Test de l\'organisation des logs (année/mois/jour)');
    console.log('==================================================');

    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MM');
    const day = now.format('DD');

    console.log(`\n📅 Date actuelle: ${now.format('YYYY-MM-DD')}`);
    console.log(`📂 Structure attendue: logs/type/${year}/${month}/${day}.log`);

    // Test des différents types de logs
    const logTypes = [
        { name: 'Messages', logger: messageLogger },
        { name: 'Modération', logger: moderationLogger },
        { name: 'Status', logger: statusLogger },
        { name: 'Mots interdits', logger: forbiddenWordsLogger },
        { name: 'Erreurs', logger: errorLogger }
    ];

    console.log('\n📝 Test d\'écriture des logs...');

    for (const logType of logTypes) {
        try {
            logType.logger.info(`Test d'organisation des logs - ${logType.name} - ${now.format('YYYY-MM-DD HH:mm:ss')}`);
            console.log(`✅ ${logType.name}: Log écrit`);
        } catch (error) {
            console.log(`❌ ${logType.name}: Erreur - ${error.message}`);
        }
    }

    // Vérifier la structure des dossiers
    console.log('\n📂 Vérification de la structure des dossiers...');
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
        const types = fs.readdirSync(logsDir);
        
        for (const type of types) {
            const typePath = path.join(logsDir, type);
            if (fs.statSync(typePath).isDirectory()) {
                const yearPath = path.join(typePath, year);
                if (fs.existsSync(yearPath)) {
                    const monthPath = path.join(yearPath, month);
                    if (fs.existsSync(monthPath)) {
                        const dayFile = path.join(monthPath, `${day}.log`);
                        if (fs.existsSync(dayFile)) {
                            const stats = fs.statSync(dayFile);
                            console.log(`✅ ${type}/${year}/${month}/${day}.log (${stats.size} bytes)`);
                        } else {
                            console.log(`⚠️ ${type}/${year}/${month}/${day}.log - Fichier non trouvé`);
                        }
                    } else {
                        console.log(`⚠️ ${type}/${year}/${month} - Dossier mois non trouvé`);
                    }
                } else {
                    console.log(`⚠️ ${type}/${year} - Dossier année non trouvé`);
                }
            }
        }
    } else {
        console.log('❌ Dossier logs non trouvé');
    }

    // Afficher la structure complète
    console.log('\n🌳 Structure complète des logs:');
    displayDirectoryTree(logsDir, '', 0);

    console.log('\n✅ Test d\'organisation terminé !');
}

function displayDirectoryTree(dir, prefix, depth) {
    if (depth > 3) return; // Limiter la profondeur
    
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.sort();
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemPath = path.join(dir, item);
        const isLast = i === items.length - 1;
        const stats = fs.statSync(itemPath);
        
        const connector = isLast ? '└── ' : '├── ';
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        
        if (stats.isDirectory()) {
            console.log(`${prefix}${connector}📁 ${item}/`);
            displayDirectoryTree(itemPath, newPrefix, depth + 1);
        } else {
            const size = stats.size;
            const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
            console.log(`${prefix}${connector}📄 ${item} (${sizeStr})`);
        }
    }
}

// Exécuter le test
testLogOrganization().catch(console.error); 