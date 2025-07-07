const https = require('https');
const http = require('http');

// Configuration
const PING_URL = process.env.PING_URL || 'https://your-render-app.onrender.com/ping';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (pour éviter la veille)
const LOG_INTERVAL = 60 * 60 * 1000; // Log toutes les heures

let pingCount = 0;
let lastLogTime = Date.now();

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
        const now = new Date().toISOString();
        console.error(`[${now}] Ping #${pingCount} - Error: ${error.message}`);
    });
    
    req.setTimeout(10000, () => {
        req.destroy();
        const now = new Date().toISOString();
        console.error(`[${now}] Ping #${pingCount} - Timeout`);
    });
}

// Démarrer le ping
console.log(`Starting external ping service...`);
console.log(`Target URL: ${PING_URL}`);
console.log(`Ping interval: ${PING_INTERVAL / 1000} seconds`);

// Premier ping immédiat
pingServer();

// Pings réguliers
setInterval(pingServer, PING_INTERVAL);

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\nShutting down ping service...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down ping service...');
    process.exit(0);
}); 