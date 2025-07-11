const https = require('https');
const http = require('http');

// Configuration optimisée pour Render
const PING_URL = process.env.PING_URL || process.env.RENDER_EXTERNAL_URL + '/ping' || 'https://your-render-app.onrender.com/ping';
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes (plus fréquent pour Render)
const LOG_INTERVAL = 60 * 60 * 1000; // Log toutes les heures

let pingCount = 0;
let lastLogTime = Date.now();
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

function pingServer() {
    const url = new URL(PING_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            pingCount++;
            consecutiveFailures = 0; // Reset failures on success
            const now = new Date().toISOString();
            
            try {
                const response = JSON.parse(data);
                console.log(`[${now}] Ping #${pingCount} - Status: ${res.statusCode} - Uptime: ${response.uptime}s`);
                
                // Log toutes les heures
                if (Date.now() - lastLogTime > LOG_INTERVAL) {
                    console.log(`[${now}] === PING SUMMARY ===`);
                    console.log(`[${now}] Total pings: ${pingCount}`);
                    console.log(`[${now}] Bot uptime: ${response.uptime}s`);
                    console.log(`[${now}] ======================`);
                    lastLogTime = Date.now();
                }
            } catch (error) {
                console.log(`[${now}] Ping #${pingCount} - Status: ${res.statusCode} - Response: ${data}`);
            }
        });
    });
    
    req.on('error', (error) => {
        consecutiveFailures++;
        const now = new Date().toISOString();
        console.error(`[${now}] Ping #${pingCount} - Error: ${error.message} (Failure #${consecutiveFailures})`);
        
        // Si trop d'échecs consécutifs, redémarrer le ping plus fréquemment
        if (consecutiveFailures >= MAX_FAILURES) {
            console.error(`[${now}] Too many consecutive failures, increasing ping frequency`);
            clearInterval(pingInterval);
            pingInterval = setInterval(pingServer, 2 * 60 * 1000); // Ping toutes les 2 minutes
        }
    });
    
    req.setTimeout(10000, () => {
        req.destroy();
        consecutiveFailures++;
        const now = new Date().toISOString();
        console.error(`[${now}] Ping #${pingCount} - Timeout (Failure #${consecutiveFailures})`);
    });
}

// Démarrer le ping
console.log(`Starting external ping service...`);
console.log(`Target URL: ${PING_URL}`);
console.log(`Ping interval: ${PING_INTERVAL / 1000} seconds`);

// Premier ping immédiat
pingServer();

// Pings réguliers
let pingInterval = setInterval(pingServer, PING_INTERVAL);

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\nShutting down ping service...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down ping service...');
    process.exit(0);
}); 